import { expect, test, describe } from "bun:test";
import { checkAuthGuard } from "../src/lib/auth-guard";

describe("Auth Guard (Route Protection)", () => {
    const baseUrl = "http://localhost:3000";

    test("Allows public access to non-admin routes", () => {
        const url = new URL("/about", baseUrl);
        // @ts-ignore
        const result = checkAuthGuard(null, url);
        expect(result).toBe(true);
    });

    test("Protects /admin from unauthenticated users", () => {
        const url = new URL("/admin/dashboard", baseUrl);
        // @ts-ignore
        const result = checkAuthGuard(null, url);
        expect(result).toBe(false); // Triggers NextAuth redirect to login
    });

    test("Allows authenticated users to access /admin", () => {
        const url = new URL("/admin/dashboard", baseUrl);
        const session = { user: { id: "1" }, expires: "1" };
        // @ts-ignore
        const result = checkAuthGuard(session, url);
        expect(result).toBe(true);
    });

    test("Redirects logged-in users away from /login", () => {
        const url = new URL("/login", baseUrl);
        const session = { user: { id: "1" }, expires: "1" };
        // @ts-ignore
        const result = checkAuthGuard(session, url);
        
        expect(result).toBeInstanceOf(Response);
        if (result instanceof Response) {
             expect(result.headers.get("Location")).toBe(baseUrl + "/admin");
             expect(result.status).toBe(302);
        }
    });

    test("Redirects disabled users to login?error=disabled", () => {
        const url = new URL("/admin", baseUrl);
        // @ts-ignore
        const session = { user: { id: "1" }, expires: "1", isDisabled: true };
        // @ts-ignore
        const result = checkAuthGuard(session, url);
        
        expect(result).toBeInstanceOf(Response);
        if (result instanceof Response) {
             expect(result.headers.get("Location")).toContain("/login?error=disabled");
        }
    });
});
