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

export async function getMatrixData(
    filters?: { siteId?: string; departmentId?: string }
): Promise<MatrixData> {
    // 1. Fetch Employees (with relations needed for scope matching)
    const empQuery = db.query.employees.findMany({
        where: filters?.siteId 
            ? eq(employees.siteId, filters.siteId) 
            : undefined, // Add department filter if needed
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
    const skillsQuery = db.query.skills.findMany({
        where: isNull(skills.validityMonths) // Example condition, fetch all for now
        // Maybe orderBy category or name
    });

    // 3. Fetch All Requirements (We'll match them in memory to avoid N+1 or complex SQL for now)
    // Optimization: could refine this query to only relevant scopes if filters are tight
    const reqsQuery = db.query.skillRequirements.findMany({
        with: {
            site: true,
            department: true,
            role: true,
            project: true
        }
    });

    // 4. Fetch All Employee Skills (Certifications)
    const certsQuery = db.query.employeeSkills.findMany({
        where: isNull(employeeSkills.revokedAt) // Only active certs
    });

    const [emps, allSkills, allReqs, allCerts] = await Promise.all([
        empQuery,
        skillsQuery,
        reqsQuery,
        certsQuery
    ]);

    // Build Lookups
    const certLookup = new Map<string, typeof allCerts[0]>();
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
                // Wait, checking schema doc: "Scoping is done via nullable FKs... All NULL = global... siteId set = everyone at that site"
                // Usually these are OR conditions across rows, but WITHIN a row, it's AND? 
                // "uniqueIndex on skillId, siteId, deptId, roleId, projId" suggests a specific combination.
                // Let's assume a row applies if the employee matches ALL defined non-null columns.
                
                const siteMatch = !req.siteId || req.siteId === emp.siteId;
                const deptMatch = !req.departmentId || req.departmentId === emp.departmentId;
                const roleMatch = !req.roleId || req.roleId === emp.roleId;

                // Project match is tricky (Many-to-Many).
                // Does this requirement specify a project?
                let projectMatch = true;
                if (req.projectId) {
                    projectMatch = emp.projects.some(ep => ep.projectId === req.projectId);
                }

                if (siteMatch && deptMatch && roleMatch && projectMatch) {
                    if ((req.requiredLevel || 1) > maxReqLevel) {
                        maxReqLevel = req.requiredLevel || 1;
                    }
                    
                    // Generate formatted source string
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
                    // Expired but not required? still expired technically, or none?
                    // Let's call it 'none' or 'expired'? 'extra' implies useful.
                    // If it's not required, does it matter if it's expired? 
                    // Let's show as expired for visibility.
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
            siteName: e.site.name,
            roleName: e.role?.name
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
