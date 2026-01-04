import { expect, test, describe } from "bun:test";
import { hashPassword, verifyPassword } from "../src/lib/password";

describe("Password Hashing", () => {
    test("hashPassword returns a valid argon2id hash", async () => {
        const hash = await hashPassword("password123");
        expect(typeof hash).toBe("string");
        expect(hash.startsWith("$argon2id")).toBe(true);
    });

    test("verifyPassword returns true for correct password", async () => {
        const password = "securePassword!123";
        const hash = await hashPassword(password);
        const isValid = await verifyPassword(hash, password);
        expect(isValid).toBe(true);
    });

    test("verifyPassword returns false for incorrect password", async () => {
        const hash = await hashPassword("passwordA");
        const isValid = await verifyPassword(hash, "passwordB");
        expect(isValid).toBe(false);
    });

    test("verifyPassword handles malformed hash gracefully", async () => {
        const isValid = await verifyPassword("not-a-hash", "password");
        expect(isValid).toBe(false);
    });
});
