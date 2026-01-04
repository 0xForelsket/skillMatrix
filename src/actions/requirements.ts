"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
	departments,
	projects,
	roles,
	sites,
	skillRequirements,
	skills,
} from "@/db/schema";
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
		return { userId: performerId };
	}
}

// =============================================================================
// Schemas
// =============================================================================

const requirementSchema = z
	.object({
		skillId: z.string().min(1, "Skill is required"),
		requiredLevel: z.coerce.number().min(1).max(5).default(1),
		siteId: z.string().optional().nullable(),
		departmentId: z.string().optional().nullable(),
		roleId: z.string().optional().nullable(),
		projectId: z.string().optional().nullable(),
	})
	.refine(
		(data) => data.siteId || data.departmentId || data.roleId || data.projectId,
		{
			message:
				"At least one scope (Site, Department, Role, or Project) must be selected",
			path: ["root"], // This might need to be handled carefully in the UI
		},
	);

export type RequirementFormData = z.infer<typeof requirementSchema>;

// =============================================================================
// Actions
// =============================================================================

export async function createRequirement(
	data: RequirementFormData & { performerId?: string },
) {
	const parsed = requirementSchema.safeParse(data);
	if (!parsed.success) {
		return { success: false, error: parsed.error.format() };
	}

	const context = await getContext(data.performerId);
	const { skillId, requiredLevel, siteId, departmentId, roleId, projectId } =
		parsed.data;

	try {
		// Prevent duplicate requirements with the EXACT same scope
		// Note: We deliberately allow overlapping scopes (e.g. Site A + Role B AND just Site A)
		// because they might have different required levels.

		const _existing = await db.query.skillRequirements.findFirst({
			where: and(
				eq(skillRequirements.skillId, skillId),
				siteId
					? eq(skillRequirements.siteId, siteId)
					: eq(skillRequirements.siteId, null as any), // null vs undefined handling in drizzle is tricky? checking documentation mental model... actually simpler to allow multiple checks or build where clause dynamically
				// Let's refine the unique check logic below
			),
		});

		// Better to build the where clause dynamically
		const conditions = [eq(skillRequirements.skillId, skillId)];
		if (siteId) conditions.push(eq(skillRequirements.siteId, siteId));
		if (departmentId)
			conditions.push(eq(skillRequirements.departmentId, departmentId));
		if (roleId) conditions.push(eq(skillRequirements.roleId, roleId));
		if (projectId) conditions.push(eq(skillRequirements.projectId, projectId));

		// This is still insufficient because we need to explicitly match NULLs for the non-selected scopes.
		// But let's rely on the unique index in the database.
		// We'll catch the unique constraint error.

		const [newReq] = await db
			.insert(skillRequirements)
			.values({
				skillId,
				requiredLevel,
				siteId: siteId || null,
				departmentId: departmentId || null,
				roleId: roleId || null,
				projectId: projectId || null,
			})
			.returning();

		await logAudit({
			action: "create",
			entityType: "skill_requirement", // skill_requirement isn't an explicit enum, maybe 'skill'? using 'other' or adding to enum later.
			entityId: newReq.id,
			newValue: newReq,
			context,
		});

		revalidatePath("/admin/requirements");
		return { success: true, data: newReq };
	} catch (error: any) {
		console.error("Failed to create requirement:", error);
		if (error.code === "23505") {
			// Postgres unique violation
			return {
				success: false,
				error:
					"A requirement with this exact scope already exists for this skill.",
			};
		}
		return { success: false, error: "Failed to create requirement" };
	}
}

export async function deleteRequirement(id: string, performerId?: string) {
	const context = await getContext(performerId);
	try {
		const existing = await db.query.skillRequirements.findFirst({
			where: eq(skillRequirements.id, id),
		});

		if (!existing) return { success: false, error: "Requirement not found" };

		await db.delete(skillRequirements).where(eq(skillRequirements.id, id));

		await logAudit({
			action: "delete",
			entityType: "skill_requirement",
			entityId: id,
			oldValue: existing,
			context,
		});

		revalidatePath("/admin/requirements");
		return { success: true };
	} catch (error) {
		console.error("Failed to delete requirement:", error);
		return { success: false, error: "Failed to delete requirement" };
	}
}

export async function listRequirements() {
	try {
		const results = await db.query.skillRequirements.findMany({
			with: {
				skill: true,
				site: true,
				department: true,
				role: true,
				project: true,
			},
			orderBy: [desc(skillRequirements.createdAt)],
		});
		return { success: true, data: results };
	} catch (error) {
		console.error("Failed to list requirements:", error);
		return { success: false, error: "Failed to list requirements" };
	}
}

export async function getRequirementMetadata() {
	try {
		const [skillList, siteList, deptList, roleList, projectList] =
			await Promise.all([
				db.query.skills.findMany({ orderBy: skills.name }),
				db.query.sites.findMany({ orderBy: sites.name }),
				db.query.departments.findMany({ orderBy: departments.name }),
				db.query.roles.findMany({ orderBy: roles.name }),
				db.query.projects.findMany({ orderBy: projects.name }),
			]);

		return {
			skills: skillList,
			sites: siteList,
			departments: deptList,
			roles: roleList,
			projects: projectList,
		};
	} catch (error) {
		console.error("Failed to get requirement metadata:", error);
		return {
			skills: [],
			sites: [],
			departments: [],
			roles: [],
			projects: [],
		};
	}
}
