
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { authConfig } from "./auth.config";
import {
	logAuthLogin,
	logAuthLoginFailed,
	logAuthLogout,
} from "@/lib/audit";

// Re-check user status every 5 minutes
const STATUS_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export const { auth, signIn, signOut, handlers } = NextAuth({
	...authConfig,
	callbacks: {
		...authConfig.callbacks,
		async jwt({ token, user, trigger }) {
				// Initial sign-in: populate token with user data
			if (user) {
				token.sub = user.id;
				token.role = (user as { appRole?: string }).appRole;
				token.statusCheckedAt = Date.now();
				token.isDisabled = false;
			}

			// Periodic status check for existing sessions
			if (token.sub && trigger !== "signIn") {
				const lastChecked = (token.statusCheckedAt as number) || 0;
				const now = Date.now();

				if (now - lastChecked > STATUS_CHECK_INTERVAL_MS) {
					try {
						const dbUser = await db.query.users.findFirst({
							where: eq(users.id, token.sub),
							columns: { status: true },
						});

						if (!dbUser || dbUser.status !== "active") {
							// User has been disabled - flag for session invalidation
							token.isDisabled = true;
						} else {
							token.isDisabled = false;
						}
						token.statusCheckedAt = now;
					} catch {
						// On DB error, don't invalidate - will retry next interval
					}
				}
			}

			return token;
		},
		async session({ session, token }) {
			// Propagate user ID and role to session
			if (token.sub && session.user) {
				session.user.id = token.sub;
			}
			if (token.role && session.user) {
				// @ts-expect-error - will fix types later
				session.user.role = token.role;
			}

			// Mark session as disabled if user was disabled
			if (token.isDisabled) {
				// @ts-expect-error - custom property
				session.isDisabled = true;
			}

			return session;
		},
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isOnAdmin = nextUrl.pathname.startsWith("/admin");
			const isOnLogin = nextUrl.pathname.startsWith("/login");

			// Check if session is disabled
			// @ts-expect-error - custom property
			if (auth?.isDisabled) {
				// Redirect to login with error indicator
				return Response.redirect(new URL("/login?error=disabled", nextUrl));
			}

			if (isOnAdmin) {
				if (isLoggedIn) return true;
				return false; // Redirect to login
			}

			if (isOnLogin && isLoggedIn) {
				return Response.redirect(new URL("/admin", nextUrl));
			}

			return true;
		},
	},
	events: {
		async signIn({ user }) {
			// Log successful login
			if (user.id) {
				await logAuthLogin({
					userId: user.id,
					details: {
						email: user.email ?? undefined,
						provider: "credentials",
					},
				});
			}
		},
		async signOut(message) {
			// Log logout - handle both JWT and session-based auth
			const userId = "token" in message ? message.token?.sub : message.session?.userId;
			if (userId) {
				await logAuthLogout({
					userId,
				});
			}
		},
	},
	providers: [
		Credentials({
			async authorize(credentials) {
				const parsedCredentials = z
					.object({ email: z.string().email(), password: z.string().min(8) })
					.safeParse(credentials);

				if (!parsedCredentials.success) {
					// Log validation failure
					const email = typeof credentials?.email === "string" ? credentials.email : "unknown";
					await logAuthLoginFailed({
						email,
						reason: "validation_error",
					});
					return null;
				}

				const { email, password } = parsedCredentials.data;
				const user = await db.query.users.findFirst({
					where: eq(users.email, email),
				});

				if (!user) {
					await logAuthLoginFailed({
						email,
						reason: "account_not_found",
					});
					return null;
				}

				// Check if user is active
				if (user.status !== "active") {
					await logAuthLoginFailed({
						email,
						reason: "account_disabled",
					});
					return null;
				}

				// Verify password
				if (!user.passwordHash) {
					await logAuthLoginFailed({
						email,
						reason: "invalid_credentials",
					});
					return null;
				}

				const passwordsMatch = await verifyPassword(
					user.passwordHash,
					password,
				);
				if (passwordsMatch) {
					const { passwordHash: _, appRole, ...userSafe } = user;
					// Return user object compatible with NextAuth User
					// NextAuth expects 'id', 'email', 'name', 'image' by default
					// We can add custom fields if we update types.
					// We map 'appRole' to be available for JWT callback.
					return {
						...userSafe,
						appRole: appRole ?? "viewer",
					};
				}

				await logAuthLoginFailed({
					email,
					reason: "invalid_credentials",
				});
				return null;
			},
		}),
	],
});

