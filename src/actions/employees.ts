
"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit, type AuditContext } from "@/lib/audit";
import { eq, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

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

const createEmployeeSchema = z.object({
    name: z.string().min(2),
    employeeNumber: z.string().min(2),
    email: z.string().email().optional().or(z.literal("")),
    siteId: z.string(),
    departmentId: z.string().optional(),
    roleId: z.string().optional(),
});

export async function listEmployees() {
    try {
        const results = await db.query.employees.findMany({
            with: {
                site: true,
                department: true,
                role: true,
            },
            orderBy: [asc(employees.name)]
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
                skills: {
                    with: {
                        skill: true,
                        revision: true
                    }
                }
            }
        });
        return { success: true, data: result };
    } catch (error) {
        console.error("Failed to get employee:", error);
        return { success: false, error: "Failed to get employee" };
    }
}

export async function createEmployee(data: z.infer<typeof createEmployeeSchema> & { performerId?: string }) {
    const parsed = createEmployeeSchema.safeParse(data);
    if (!parsed.success) {
        return { success: false, error: parsed.error.format() };
    }

    const { name, employeeNumber, email, siteId, departmentId, roleId } = parsed.data;
    const context = await getContext(data.performerId);

    try {
        // Check for duplicates
        const existing = await db.query.employees.findFirst({
            where: eq(employees.employeeNumber, employeeNumber)
        });

        if (existing) {
            return { success: false, error: "Employee number already used" };
        }

        const newEmployee = await db.transaction(async (tx) => {
             const [inserted] = await tx.insert(employees).values({
                name,
                employeeNumber,
                email: email || null,
                siteId,
                departmentId: departmentId || null,
                roleId: roleId || null,
                badgeToken: nanoid(32), // High entropy token for QR
                status: "active",
            }).returning();
            return inserted;
        });

        await logAudit({
            action: "create",
            entityType: "employee",
            entityId: newEmployee.id,
            newValue: newEmployee,
            context
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
        roles: roleList
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

