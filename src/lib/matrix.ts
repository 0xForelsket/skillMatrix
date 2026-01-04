import { db } from "@/db";
import {
    employees,
    skills,
    skillRequirements,
    employeeSkills,
} from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

export type MatrixStatus = 
    | "missing"     // Required but not certified
    | "gap"         // Certified but below required level
    | "expired"     // Certified but expired
    | "compliant"   // Meets requirement
    | "extra"       // Certified but not required
    | "none";       // Not required, not certified

export interface MatrixCell {
    skillId: string;
    employeeId: string;
    requiredLevel: number;
    achievedLevel: number;
    expiresAt: Date | null;
    status: MatrixStatus;
    requirementSources: string[]; // e.g. ["Site: Austin", "Role: Tech"]
}

export interface MatrixData {
    employees: Array<{ id: string; name: string; employeeNumber: string; siteName: string; roleName?: string }>;
    skills: Array<{ id: string; name: string; code: string; maxLevel: number }>;
    cells: Record<string, Record<string, MatrixCell>>; // employeeId -> skillId -> Cell
}

export interface MatrixEmployee {
    id: string;
    name: string;
    employeeNumber: string;
    siteId: string;
    site: { name: string };
    roleId?: string | null;
    role?: { name: string } | null;
    departmentId: string;
    department: { name: string };
    projects: { projectId: string; project: { name: string } }[];
}

export interface MatrixSkill {
    id: string;
    name: string;
    code: string | null;
    maxLevel: number | null;
}

export interface MatrixRequirement {
    skillId: string;
    requiredLevel: number | null;
    siteId?: string | null;
    site?: { name: string } | null;
    departmentId?: string | null;
    department?: { name: string } | null;
    roleId?: string | null;
    role?: { name: string } | null;
    projectId?: string | null;
    project?: { name: string } | null;
}

export interface MatrixCertification {
    employeeId: string;
    skillId: string;
    achievedLevel: number;
    expiresAt: string | Date | null;
}

/**
 * Pure function to calculate matrix data from raw inputs.
 * Useful for testing and separation of concerns.
 */
export function calculateMatrixData(
    emps: MatrixEmployee[], 
    allSkills: MatrixSkill[], 
    allReqs: MatrixRequirement[], 
    allCerts: MatrixCertification[]
): MatrixData {
    // Build Lookups
    const certLookup = new Map<string, MatrixCertification>();
    for (const c of allCerts) {
        certLookup.set(`${c.employeeId}:${c.skillId}`, c);
    }

    const cells: Record<string, Record<string, MatrixCell>> = {};

    for (const emp of emps) {
        cells[emp.id] = {};
        
        for (const skill of allSkills) {
            // A. Calculate Requirement Level
            let maxReqLevel = 0;
            const sources: string[] = [];

            for (const req of allReqs) {
                if (req.skillId !== skill.id) continue;

                // Logic: A requirement applies if the employee matches ALL non-null scopes defined in that requirement row.
                const siteMatch = !req.siteId || req.siteId === emp.siteId;
                const deptMatch = !req.departmentId || req.departmentId === emp.departmentId;
                const roleMatch = !req.roleId || req.roleId === emp.roleId;

                // Project match (Many-to-Many)
                let projectMatch = true;
                if (req.projectId) {
                    projectMatch = emp.projects?.some(ep => ep.projectId === req.projectId) ?? false;
                }

                if (siteMatch && deptMatch && roleMatch && projectMatch) {
                    if ((req.requiredLevel || 1) > maxReqLevel) {
                        maxReqLevel = req.requiredLevel || 1;
                    }
                    
                    const parts = [];
                    if (req.siteId) parts.push(`Site: ${req.site?.name}`);
                    if (req.departmentId) parts.push(`Dept: ${req.department?.name}`);
                    if (req.roleId) parts.push(`Role: ${req.role?.name}`);
                    if (req.projectId) parts.push(`Proj: ${req.project?.name}`);
                    if (parts.length === 0) parts.push("Global");
                    
                    sources.push(`${parts.join(", ")} (Lvl ${req.requiredLevel})`);
                }
            }

            // B. Get Certification
            const cert = certLookup.get(`${emp.id}:${skill.id}`);
            const achievedLevel = cert?.achievedLevel || 0;
            const expiresAt = cert?.expiresAt ? new Date(cert.expiresAt) : null;
            const isExpired = expiresAt && expiresAt < new Date();

            // C. Determine Status
            let status: MatrixStatus = "none";

            if (maxReqLevel > 0) {
                if (!cert) {
                    status = "missing";
                } else if (isExpired) {
                    status = "expired";
                } else if (achievedLevel < maxReqLevel) {
                    status = "gap";
                } else {
                    status = "compliant";
                }
            } else {
                if (cert && !isExpired) {
                    status = "extra";
                } else if (cert && isExpired) {
                    status = "expired"; 
                }
            }

            cells[emp.id][skill.id] = {
                skillId: skill.id,
                employeeId: emp.id,
                requiredLevel: maxReqLevel,
                achievedLevel,
                expiresAt,
                status,
                requirementSources: sources
            };
        }
    }

    return {
        employees: emps.map(e => ({
            id: e.id,
            name: e.name,
            employeeNumber: e.employeeNumber,
            siteName: e.site.name || "Unknown Site",
            roleName: e.role?.name || undefined
        })),
        skills: allSkills.map(s => ({
            id: s.id,
            name: s.name,
            code: s.code || "",
            maxLevel: s.maxLevel || 1
        })),
        cells
    };
}

export async function getMatrixData(
    filters?: { siteId?: string; departmentId?: string }
): Promise<MatrixData> {
    // 1. Fetch Employees (with relations needed for scope matching)
    // using Promise.all isn't always ideal if dependencies exist, but here they are independent fetches
    // EXCEPT for employee count potentially being large.
    
    const emps = await db.query.employees.findMany({
        where: filters?.siteId 
            ? eq(employees.siteId, filters.siteId) 
            : undefined, 
        with: {
            site: true,
            department: true,
            role: true,
            projects: {
                with: {
                    project: true
                }
            }
        }
    });

    // 2. Fetch All Skills
    const allSkills = await db.query.skills.findMany({
        where: isNull(skills.validityMonths) // Example condition, fetch all for now
    });

    // 3. Fetch All Requirements
    const allReqs = await db.query.skillRequirements.findMany({
        with: {
            site: true,
            department: true,
            role: true,
            project: true
        }
    });

    // 4. Fetch All Employee Skills (Active)
    const allCerts = await db.query.employeeSkills.findMany({
        where: isNull(employeeSkills.revokedAt)
    });

    return calculateMatrixData(emps, allSkills, allReqs, allCerts);
}
