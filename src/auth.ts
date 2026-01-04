
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

export const { auth, signIn, signOut, handlers } = NextAuth({
	...authConfig,
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

