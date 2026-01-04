import { expect, test, describe } from "bun:test";
import { hasPermission } from "../src/lib/permissions";

describe("Permissions System", () => {
    test("Admin role has all permissions", () => {
        expect(hasPermission("admin", "users:view")).toBe(true);
        expect(hasPermission("admin", "users:manage")).toBe(true);
        expect(hasPermission("admin", "certifications:revoke")).toBe(true);
        expect(hasPermission("admin", "audit:view")).toBe(true);
    });

    test("Skill Manager role has specific permissions", () => {
        expect(hasPermission("skill_manager", "employees:manage")).toBe(true);
        expect(hasPermission("skill_manager", "skills:manage")).toBe(true);
        expect(hasPermission("skill_manager", "users:manage")).toBe(false); // No user management
    });

    test("Trainer role has certification permissions", () => {
        expect(hasPermission("trainer", "certifications:create")).toBe(true);
        expect(hasPermission("trainer", "certifications:revoke")).toBe(true);
        expect(hasPermission("trainer", "users:view")).toBe(false);
    });

    test("Auditor role has view permissions", () => {
        expect(hasPermission("auditor", "audit:view")).toBe(true);
        expect(hasPermission("auditor", "employees:view")).toBe(true);
        expect(hasPermission("auditor", "certifications:create")).toBe(false); // Cannot certify
    });

    test("Viewer role has read-only access", () => {
        expect(hasPermission("viewer", "employees:view")).toBe(true);
        expect(hasPermission("viewer", "skills:view")).toBe(true);
        expect(hasPermission("viewer", "employees:manage")).toBe(false);
    });

    test("Undefined role return false", () => {
        expect(hasPermission(undefined, "users:view")).toBe(false);
        expect(hasPermission(null, "users:view")).toBe(false);
    });
});
