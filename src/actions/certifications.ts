"use server";

import { addMonths } from "date-fns";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { employeeSkills, skillRevisions, skills } from "@/db/schema";
import { type AuditContext, logAudit } from "@/lib/audit";
import { checkPermission } from "@/lib/permissions";

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

const revokeSchema = z.object({
	employeeSkillId: z.string().min(1),
	reason: z.string().min(5, "Reason is required (min 5 characters)"),
});

export async function revokeCertification(data: z.infer<typeof revokeSchema>) {
	const session = await auth();
	try {
		checkPermission(session, "certifications:revoke");
	} catch (e) {
		return { success: false, error: "Permission denied" };
	}

	const parsed = revokeSchema.safeParse(data);
	if (!parsed.success) {
		return { success: false, error: parsed.error.format() };
	}

	const { employeeSkillId, reason } = parsed.data;
	const context = await getContext(session?.user?.id);

	try {
		// Find existing to verify and for audit
		const existing = await db.query.employeeSkills.findFirst({
			where: eq(employeeSkills.id, employeeSkillId),
			with: {
				skill: true,
				employee: true,
			},
		});

		if (!existing) {
			return { success: false, error: "Certification not found" };
		}

		if (existing.revokedAt) {
			return { success: false, error: "Certification is already revoked" };
		}

		const [updated] = await db
			.update(employeeSkills)
			.set({
				revokedAt: new Date(),
				revokedByUserId: session?.user?.id,
				revocationReason: reason,
			})
			.where(eq(employeeSkills.id, employeeSkillId))
			.returning();

		await logAudit({
			action: "revoke",
			entityType: "employee_skill", // Correct entity type for audit
			entityId: employeeSkillId,
			oldValue: existing,
			newValue: updated,
			context,
		});

		revalidatePath(`/admin/employees/${existing.employeeId}`);
		revalidatePath("/admin/matrix");

		return { success: true };
	} catch (error) {
		console.error("Revocation failed:", error);
		return { success: false, error: "System error during revocation" };
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
				eq(skillRevisions.status, "active"),
			),
			orderBy: [desc(skillRevisions.createdAt)],
		});

		if (!revision) {
			return {
				success: false,
				error: "No active revision found for this skill",
			};
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
