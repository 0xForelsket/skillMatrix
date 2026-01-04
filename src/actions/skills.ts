"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { skills, skillRevisions } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit, type AuditContext } from "@/lib/audit";
import { eq, desc } from "drizzle-orm";

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

const createSkillSchema = z.object({
	name: z.string().min(2, "Name must be at least 2 characters"),
	description: z.string().optional(),
	code: z.string().min(2, "Code must be at least 2 characters"),
	validityMonths: z.coerce.number().optional().nullable(),
	maxLevel: z.coerce.number().min(1).max(5).default(1),
});

// =============================================================================
// Actions
// =============================================================================

export async function listSkills() {
	try {
		const results = await db.query.skills.findMany({
			with: {
				revisions: {
					limit: 1,
					orderBy: [desc(skillRevisions.createdAt)],
				},
			},
			orderBy: [desc(skills.createdAt)],
		});
		return { success: true, data: results };
	} catch (error) {
		console.error("Failed to list skills:", error);
		return { success: false, error: "Failed to load skills" };
	}
}

export async function createSkill(
	data: z.infer<typeof createSkillSchema> & { performerId?: string },
) {
	const parsed = createSkillSchema.safeParse(data);
	if (!parsed.success) {
		return { success: false, error: parsed.error.format() };
	}

	const { name, description, code, validityMonths, maxLevel } = parsed.data;
	const context = await getContext(data.performerId);

	try {
		// Check for duplicate code
		const existing = await db.query.skills.findFirst({
			where: eq(skills.code, code),
		});

		if (existing) {
			return { success: false, error: "Skill with this code already exists" };
		}

		const newSkill = await db.transaction(async (tx) => {
			const [insertedSkill] = await tx
				.insert(skills)
				.values({
					name,
					description,
					code,
					validityMonths: validityMonths || null,
					maxLevel,
				})
				.returning();

			// Auto-create initial revision
			await tx.insert(skillRevisions).values({
				skillId: insertedSkill.id,
				revisionLabel: "Initial Draft",
				changeLog: "Initial creation",
				status: "draft",
				requiresRetraining: true,
			});

			return insertedSkill;
		});

		await logAudit({
			action: "create",
			entityType: "skill",
			entityId: newSkill.id,
			newValue: newSkill,
			context,
		});

		revalidatePath("/admin/skills");
		return { success: true, data: newSkill };
	} catch (error) {
		console.error("Failed to create skill:", error);
		return { success: false, error: "Failed to create skill" };
	}
}
