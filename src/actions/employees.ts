"use server";

import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { employees, users } from "@/db/schema";
import { type AuditContext, logAudit } from "@/lib/audit";

// =============================================================================
// Helpers
// =============================================================================

async function getContext(performerId?: string): Promise<AuditContext> {
	try {
		const headersList = await headers();
		return {
			userId: performerId,
			ipAddress: headersList.get("x-forwarded-for") || undefined,
			userAgent: headersList.get("user-agent") || undefined,
		};
	} catch (_) {
		// Fallback for non-request environments (scripts, seeders)
		return { userId: performerId };
	}
}

// =============================================================================
// Schemas
// =============================================================================

const employeeSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	employeeNumber: z
		.string()
		.min(2, "Employee number must be at least 2 characters"),
	email: z.string().email("Invalid email address").optional().or(z.literal("")),
	siteId: z.string().min(1, "Site is required"),
	departmentId: z.string().optional().nullable(),
	roleId: z.string().optional().nullable(),
	status: z.enum(["active", "terminated", "leave"]).default("active"),
	photoUrl: z
		.string()
		.url("Invalid image URL")
		.optional()
		.or(z.literal(""))
		.nullable(),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

export async function updateEmployee(
	id: string,
	data: EmployeeFormData & { performerId?: string },
) {
	const parsed = employeeSchema.safeParse(data);
	if (!parsed.success) {
		return { success: false, error: parsed.error.format() };
	}

	const context = await getContext(data.performerId);

	try {
		const existing = await db.query.employees.findFirst({
			where: eq(employees.id, id),
		});

		if (!existing) {
			return { success: false, error: "Employee not found" };
		}

		// Check if employee number is being changed to one that already exists
		if (data.employeeNumber !== existing.employeeNumber) {
			const duplicate = await db.query.employees.findFirst({
				where: eq(employees.employeeNumber, data.employeeNumber),
			});
			if (duplicate) {
				return { success: false, error: "Employee number already used" };
			}
		}

		const [updated] = await db
			.update(employees)
			.set({
				...parsed.data,
				updatedAt: new Date(),
			})
			.where(eq(employees.id, id))
			.returning();

		await logAudit({
			action: "update",
			entityType: "employee",
			entityId: id,
			oldValue: existing,
			newValue: updated,
			context,
		});

		revalidatePath("/admin/employees");
		revalidatePath(`/admin/employees/${id}`);
		return { success: true, data: updated };
	} catch (error) {
		console.error("Failed to update employee:", error);
		return { success: false, error: "Failed to update employee" };
	}
}

export async function listEmployees() {
	try {
		const results = await db.query.employees.findMany({
			with: {
				site: true,
				department: true,
				role: true,
			},
			orderBy: [asc(employees.name)],
		});
		return { success: true, data: results };
	} catch (error) {
		console.error("Failed to list employees:", error);
		return { success: false, error: "Failed to load employees" };
	}
}

export async function getEmployee(id: string) {
	try {
		const result = await db.query.employees.findFirst({
			where: eq(employees.id, id),
			with: {
				site: true,
				department: true,
				role: true,
				user: true,
				skills: {
					with: {
						skill: true,
						revision: true,
					},
				},
			},
		});
		return { success: true, data: result };
	} catch (error) {
		console.error("Failed to get employee:", error);
		return { success: false, error: "Failed to get employee" };
	}
}

export async function createEmployee(
	data: EmployeeFormData & { performerId?: string },
) {
	const parsed = employeeSchema.safeParse(data);
	if (!parsed.success) {
		return { success: false, error: parsed.error.format() };
	}

	const {
		name,
		employeeNumber,
		email,
		siteId,
		departmentId,
		roleId,
		status,
		photoUrl,
	} = parsed.data;
	const context = await getContext(data.performerId);

	try {
		// Check for duplicates
		const existing = await db.query.employees.findFirst({
			where: eq(employees.employeeNumber, employeeNumber),
		});

		if (existing) {
			return { success: false, error: "Employee number already used" };
		}

		const newEmployee = await db.transaction(async (tx) => {
			const [inserted] = await tx
				.insert(employees)
				.values({
					name,
					employeeNumber,
					email: email || null,
					siteId,
					departmentId: departmentId || null,
					roleId: roleId || null,
					photoUrl: photoUrl || null,
					badgeToken: nanoid(32), // High entropy token for QR
					status: status || "active",
				})
				.returning();
			return inserted;
		});

		await logAudit({
			action: "create",
			entityType: "employee",
			entityId: newEmployee.id,
			newValue: newEmployee,
			context,
		});

		revalidatePath("/admin/employees");
		return { success: true, data: newEmployee };
	} catch (error) {
		console.error("Failed to create employee:", error);
		return { success: false, error: "Failed to create employee" };
	}
}

// Helpers to fetch metadata for forms
export async function getOrganizationMetadata() {
	const [siteList, deptList, roleList] = await Promise.all([
		db.query.sites.findMany(),
		db.query.departments.findMany(),
		db.query.roles.findMany(),
	]);

	return {
		sites: siteList,
		departments: deptList,
		roles: roleList,
	};
}

/**
 * Regenerate an employee's badge token.
 * This invalidates the old QR code and generates a new one.
 * Use when a badge is lost, stolen, or needs security rotation.
 */
export async function regenerateBadgeToken(data: {
	employeeId: string;
	performerId?: string;
	reason?: string;
}) {
	const { employeeId, performerId, reason } = data;
	const context = await getContext(performerId);

	try {
		// Fetch existing employee
		const existing = await db.query.employees.findFirst({
			where: eq(employees.id, employeeId),
		});

		if (!existing) {
			return { success: false, error: "Employee not found" };
		}

		const oldToken = existing.badgeToken;
		const newToken = nanoid(32);

		// Update the badge token
		const [updated] = await db
			.update(employees)
			.set({
				badgeToken: newToken,
				updatedAt: new Date(),
			})
			.where(eq(employees.id, employeeId))
			.returning();

		// Audit log with redacted tokens (show first/last 4 chars only)
		await logAudit({
			action: "update",
			entityType: "employee",
			entityId: employeeId,
			oldValue: {
				badgeToken: `${oldToken.slice(0, 4)}...${oldToken.slice(-4)}`,
				reason: "Badge token regeneration",
			},
			newValue: {
				badgeToken: `${newToken.slice(0, 4)}...${newToken.slice(-4)}`,
				reason: reason || "Security rotation",
			},
			context,
		});

		revalidatePath(`/admin/employees/${employeeId}`);
		revalidatePath("/admin/employees");

		return {
			success: true,
			data: {
				employeeId: updated.id,
				newBadgeToken: newToken,
			},
		};
	} catch (error) {
		console.error("Failed to regenerate badge token:", error);
		return { success: false, error: "Failed to regenerate badge token" };
	}
}

/**
 * Link a user account to an employee record.
 * Allows the user to see their own skills and be identified as this employee.
 */
export async function linkUserToEmployee(data: {
	employeeId: string;
	userId: string;
	performerId?: string;
}) {
	const { employeeId, userId, performerId } = data;
	const context = await getContext(performerId);

	try {
		// Check if employee exists
		const employee = await db.query.employees.findFirst({
			where: eq(employees.id, employeeId),
		});

		if (!employee) {
			return { success: false, error: "Employee not found" };
		}

		// Check if user exists
		const user = await db.query.users.findFirst({
			where: eq(users.id, userId),
		});

		if (!user) {
			return { success: false, error: "User not found" };
		}

		// Check if user is already linked to another employee
		const existingLink = await db.query.employees.findFirst({
			where: eq(employees.userId, userId),
		});

		if (existingLink && existingLink.id !== employeeId) {
			return {
				success: false,
				error: `User is already linked to employee: ${existingLink.name}`,
			};
		}

		// Update the employee with the user link
		const [updated] = await db
			.update(employees)
			.set({
				userId,
				updatedAt: new Date(),
			})
			.where(eq(employees.id, employeeId))
			.returning();

		await logAudit({
			action: "update",
			entityType: "employee",
			entityId: employeeId,
			oldValue: { userId: employee.userId },
			newValue: { userId, linkedUserEmail: user.email },
			context,
		});

		revalidatePath(`/admin/employees/${employeeId}`);
		revalidatePath("/admin/employees");

		return {
			success: true,
			data: {
				employeeId: updated.id,
				userId: updated.userId,
			},
		};
	} catch (error) {
		console.error("Failed to link user to employee:", error);
		return { success: false, error: "Failed to link user to employee" };
	}
}

/**
 * Unlink a user account from an employee record.
 */
export async function unlinkUserFromEmployee(data: {
	employeeId: string;
	performerId?: string;
}) {
	const { employeeId, performerId } = data;
	const context = await getContext(performerId);

	try {
		// Check if employee exists
		const employee = await db.query.employees.findFirst({
			where: eq(employees.id, employeeId),
		});

		if (!employee) {
			return { success: false, error: "Employee not found" };
		}

		if (!employee.userId) {
			return { success: false, error: "Employee has no linked user" };
		}

		const previousUserId = employee.userId;

		// Remove the user link
		const [updated] = await db
			.update(employees)
			.set({
				userId: null,
				updatedAt: new Date(),
			})
			.where(eq(employees.id, employeeId))
			.returning();

		await logAudit({
			action: "update",
			entityType: "employee",
			entityId: employeeId,
			oldValue: { userId: previousUserId },
			newValue: { userId: null, reason: "User unlinked" },
			context,
		});

		revalidatePath(`/admin/employees/${employeeId}`);
		revalidatePath("/admin/employees");

		return {
			success: true,
			data: {
				employeeId: updated.id,
			},
		};
	} catch (error) {
		console.error("Failed to unlink user from employee:", error);
		return { success: false, error: "Failed to unlink user from employee" };
	}
}

/**
 * Get list of users available for linking (not already linked to an employee).
 */
export async function getAvailableUsersForLinking() {
	try {
		// Get all users
		const allUsers = await db.query.users.findMany({
			orderBy: (users, { asc }) => [asc(users.email)],
		});

		// Get users that are already linked
		const linkedUserIds = new Set(
			(
				await db.query.employees.findMany({
					columns: { userId: true },
					where: (t, { isNotNull }) => isNotNull(t.userId),
				})
			).map((e) => e.userId),
		);

		// Return users with linking status
		const usersWithStatus = allUsers.map((user) => ({
			id: user.id,
			email: user.email,
			appRole: user.appRole,
			status: user.status,
			isLinked: linkedUserIds.has(user.id),
		}));

		return { success: true, data: usersWithStatus };
	} catch (error) {
		console.error("Failed to get available users:", error);
		return { success: false, error: "Failed to get available users" };
	}
}
