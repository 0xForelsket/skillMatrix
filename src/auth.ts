
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { authConfig } from "./auth.config";

export const { auth, signIn, signOut, handlers } = NextAuth({
	...authConfig,
	providers: [
		Credentials({
			async authorize(credentials) {
				const parsedCredentials = z
					.object({ email: z.string().email(), password: z.string().min(8) })
					.safeParse(credentials);

				if (parsedCredentials.success) {
					const { email, password } = parsedCredentials.data;
					const user = await db.query.users.findFirst({
						where: eq(users.email, email),
					});

					if (!user) return null;

					// Check if user is active
					if (user.status !== "active") return null;

					// Verify password
					if (!user.passwordHash) return null;

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
				}
				return null;
			},
		}),
	],
});
