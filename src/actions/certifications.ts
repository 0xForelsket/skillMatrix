"use server";

import { headers } from "next/headers";
import { db } from "@/db";
import { employeeSkills, skills, skillRevisions } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logAudit, type AuditContext } from "@/lib/audit";
import { eq, desc, and, asc } from "drizzle-orm";
import { addMonths } from "date-fns";
import { checkPermission } from "@/lib/permissions";
import { auth } from "@/auth";

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

const certifySkillSchema = z.object({
	employeeId: z.string(),
	skillId: z.string(),
	achievedLevel: z.number().min(1).max(5),
	notes: z.string().optional(),
});

export async function certifySkill(data: z.infer<typeof certifySkillSchema>) {
	const session = await auth();
	// Check if user has permission to certify
	try {
		checkPermission(session, "certifications:create");
	} catch (e) {
		return { success: false, error: "Permission denied" };
	}

	const context = await getContext(session?.user?.id);

	try {
		const { employeeId, skillId, achievedLevel, notes } = data;

		// 1. Get the skill and its latest active revision
		const skill = await db.query.skills.findFirst({
			where: eq(skills.id, skillId),
		});

		if (!skill) {
			return { success: false, error: "Skill not found" };
		}

		const revision = await db.query.skillRevisions.findFirst({
			where: and(
				eq(skillRevisions.skillId, skillId),
				eq(skillRevisions.status, "active")
			),
			orderBy: [desc(skillRevisions.createdAt)],
		});

		if (!revision) {
			return { success: false, error: "No active revision found for this skill" };
		}

		// 2. Calculate expiration date
		const achievedAt = new Date();
		let expiresAt: Date | null = null;
		if (skill.validityMonths) {
			expiresAt = addMonths(achievedAt, skill.validityMonths);
		}

		// 3. Create the certification
		const [newCert] = await db
			.insert(employeeSkills)
			.values({
				employeeId,
				skillId,
				skillRevisionId: revision.id,
				achievedLevel,
				achievedAt,
				expiresAt,
				certifiedByUserId: session?.user?.id,
				notes,
			})
			.returning();

		// 4. Audit Log
		await logAudit({
			action: "create",
			entityType: "certification",
			entityId: newCert.id,
			newValue: {
				...newCert,
				skillName: skill.name,
				certifiedBy: session?.user?.email,
			},
			context,
		});

		revalidatePath(`/admin/employees/${employeeId}`);
		revalidatePath(`/b/${employeeId}`); // This might not work if it's token based, but it's okay
		revalidatePath("/admin/certifications");

		return { success: true, data: newCert };
	} catch (error) {
		console.error("Failed to certify skill:", error);
		return { success: false, error: "Failed to record certification" };
	}
}

export async function getSkillsForCertification() {
	try {
		const skillList = await db.query.skills.findMany({
			with: {
				revisions: {
					where: eq(skillRevisions.status, "active"),
					limit: 1,
				},
			},
			orderBy: [asc(skills.name)],
		});

		// Filter to only skills that have an active revision
		return {
			success: true,
			data: skillList.filter((s) => s.revisions.length > 0),
		};
	} catch (error) {
		console.error("Failed to list skills:", error);
		return { success: false, error: "Failed to load skills" };
	}
}
