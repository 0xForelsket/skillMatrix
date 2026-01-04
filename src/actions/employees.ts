
"use server";

import { db } from "@/db";
import { employees, sites, departments, roles } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit, getContext } from "@/lib/audit";
import { eq, desc, asc } from "drizzle-orm";
import { nanoid } from "nanoid";

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
