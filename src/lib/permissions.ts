
export type Role = "admin" | "skill_manager" | "trainer" | "auditor" | "viewer";

export type Permission =
	| "users:view"
	| "users:manage"
	| "employees:view"
	| "employees:manage"
	| "skills:view"
	| "skills:manage"
	| "certifications:view"
	| "certifications:create"
	| "certifications:revoke"
	| "audit:view";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
	admin: [
		"users:view",
		"users:manage",
		"employees:view",
		"employees:manage",
		"skills:view",
		"skills:manage",
		"certifications:view",
		"certifications:create",
		"certifications:revoke",
		"audit:view",
	],
	skill_manager: [
		"employees:view",
		"employees:manage",
		"skills:view",
		"skills:manage",
		"certifications:view",
	],
	trainer: [
		"employees:view",
		"skills:view",
		"certifications:view",
		"certifications:create",
		"certifications:revoke",
	],
	auditor: [
		"users:view",
		"employees:view",
		"skills:view",
		"certifications:view",
		"audit:view",
	],
	viewer: ["employees:view", "skills:view", "certifications:view"],
};

export function hasPermission(
	role: Role | string | undefined | null,
	permission: Permission,
): boolean {
	if (!role) return false;
	const permissions = ROLE_PERMISSIONS[role as Role];
	return permissions?.includes(permission) ?? false;
}

import type { Session } from "next-auth";

export function can(session: Session | null, permission: Permission): boolean {
	return hasPermission(session?.user?.role as Role, permission);
}

export function checkPermission(session: Session | null, permission: Permission): void {
	if (!can(session, permission)) {
		throw new Error(`Permission denied: ${permission}`);
	}
}
