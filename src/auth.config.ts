import type { NextAuthConfig } from "next-auth";

export const authConfig = {
	pages: {
		signIn: "/login",
	},
	callbacks: {
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isOnAdmin = nextUrl.pathname.startsWith("/admin");
			const isOnLogin = nextUrl.pathname.startsWith("/login");

			if (isOnAdmin) {
				if (isLoggedIn) return true;
				return false; // Redirect to login
			}

			if (isOnLogin && isLoggedIn) {
				return Response.redirect(new URL("/admin", nextUrl));
			}

			return true;
		},
		async session({ session, token }) {
			if (token.sub && session.user) {
				session.user.id = token.sub;
			}
			if (token.role && session.user) {
				// @ts-ignore
				session.user.role = token.role;
			}
			return session;
		},
		async jwt({ token, user }) {
			if (user) {
				token.sub = user.id;
				// @ts-ignore
				token.role = user.appRole;
			}
			return token;
		},
	},
	providers: [],
} satisfies NextAuthConfig;
