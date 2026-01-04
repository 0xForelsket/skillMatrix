import type { Session } from "next-auth";

interface AuthGuardResult {
	authorized: boolean;
	redirect?: URL;
}

export function checkAuthGuard(
	auth: Session | null,
	nextUrl: URL,
): boolean | Response {
	const isLoggedIn = !!auth?.user;
	const isOnAdmin = nextUrl.pathname.startsWith("/admin");
	const isOnLogin = nextUrl.pathname.startsWith("/login");

	// Check if session is disabled (custom property on session)
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
}
