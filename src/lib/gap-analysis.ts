
import { db } from "@/db";
import { employeeSkills, skillRequirements, skills, skillRevisions } from "@/db/schema";
import { type Employee } from "@/db/schema";
import { eq, or, and, isNull } from "drizzle-orm";
import { getApplicableRequirements } from "./requirements";
import { calculateExpiresAt, isCertificationActive, isExpiringSoon } from "./skills";

export type GapStatus = 
    | "ok" 
    | "missing" 
    | "expired" 
    | "expiring_soon"
    | "insufficient_level"
    | "revoked";

export interface SkillGap {
    employeeSkillId?: string;
    skillId: string;
    skillName: string;
    skillCode: string | null;
    requiredLevel: number;
    achievedLevel: number;
    status: GapStatus;
    achievedAt?: Date;
    expiresAt?: Date | null;
    notes?: string;
}

export async function getEmployeeGaps(employeeId: string): Promise<SkillGap[]> {
    // 1. Fetch Employee
    const employee = await db.query.employees.findFirst({
        where: (t, { eq }) => eq(t.id, employeeId),
        with: {
            skills: {
                with: {
                    skill: true,
                    revision: true
                }
            },
            projects: true
        }
    });

    if (!employee) {
        throw new Error("Employee not found");
    }

    const projectIds = employee.projects.map(p => p.projectId);

    // 2. Fetch all requirements that *could* apply (optimization: filter by site/dept/role/project in DB?)
    // For now, fetching all requirements is safer to ensure complex logic in getApplicableRequirements is used,
    // but in production with thousands of requirements, we should pre-filter.
    // Let's do a loose pre-filter.
    const requirements = await db.query.skillRequirements.findMany({
        where: (t, { eq, or, isNull, and, inArray }) => or(
            // Global
            and(isNull(t.siteId), isNull(t.departmentId), isNull(t.roleId), isNull(t.projectId)),
            // Matches Site
            eq(t.siteId, employee.siteId),
            // Matches Department
            eq(t.departmentId, employee.departmentId || ""),
            // Matches Role
            eq(t.roleId, employee.roleId || ""),
            // Matches Project
            projectIds.length > 0 ? inArray(t.projectId, projectIds) : undefined
        ),
        with: {
            skill: true
        }
    });

    // 3. Narrow down to exactly applicable ones
    const applicableRequirements = getApplicableRequirements(employee, projectIds, requirements);

    // 4. Map existing skills for quick lookup
    const heldSkillsMap = new Map();
    for (const record of employee.skills) {
        // If there are multiple records for the same skill, we should take the "best" one (highest level, active).
        // Since the DB constraint is unique on (employeeId, skillId, revisionId), user can have multiple revisions.
        // We usually care about the *latest* valid one.
        
        // Simple logic: If we already have a record, swap it if this one is "better" (higher level) or newer.
        const existing = heldSkillsMap.get(record.skillId);
        if (!existing || record.achievedLevel > existing.achievedLevel || (record.achievedLevel === existing.achievedLevel && record.achievedAt > existing.achievedAt)) {
            heldSkillsMap.set(record.skillId, record);
        }
    }

    // 5. Compare Requirement vs Reality
    const gaps: SkillGap[] = [];

    for (const req of applicableRequirements) {
        const held = heldSkillsMap.get(req.skillId);
        
        // Default: Missing
        let status: GapStatus = "missing";
        let achievedLevel = 0;
        let achievedAt = undefined;
        let expiresAt = undefined;
        let notes = undefined;
        let employeeSkillId = undefined;

        if (held) {
            employeeSkillId = held.id;
            achievedLevel = held.achievedLevel;
            achievedAt = held.achievedAt;
            expiresAt = held.expiresAt;
            notes = held.notes || undefined;

            // Check Revocation
            if (held.revokedAt) {
                status = "revoked";
            }
            // Check Expiration
            else if (!isCertificationActive(held.expiresAt)) {
                status = "expired";
            }
            // Check Level
            else if (held.achievedLevel < (req.requiredLevel || 1)) {
                status = "insufficient_level";
            }
            // Check Expiring Soon
            else if (isExpiringSoon(held.expiresAt)) {
                status = "expiring_soon";
            }
            else {
                status = "ok";
            }
        }

        gaps.push({
            employeeSkillId,
            skillId: req.skillId,
            skillName: req.skill.name,
            skillCode: req.skill.code || null,
            requiredLevel: req.requiredLevel || 1,
            achievedLevel,
            status,
            achievedAt,
            expiresAt,
            notes
        });
    }

    return gaps;
}
