
import { 
    type Employee, 
    type SkillRequirement, 
    type Skill
} from "@/db/schema";

/**
 * Determines if a requirement applies to a specific employee.
 * Logic: A requirement applies if ALL of its specified scopes match the employee.
 * - If scope is null, it matches everyone.
 * - If scope is set (e.g. siteId), it must match the employee's siteId.
 */
export function doesRequirementApply(
    employee: Employee,
    requirement: SkillRequirement
): boolean {
    // 1. Site Scope
    if (requirement.siteId && requirement.siteId !== employee.siteId) {
        return false;
    }

    // 2. Department Scope
    if (requirement.departmentId && requirement.departmentId !== employee.departmentId) {
        return false;
    }

    // 3. Role Scope (Job Title)
    if (requirement.roleId && requirement.roleId !== employee.roleId) {
        return false;
    }

    // 4. Project Scope
    // Note: Employee table doesn't have direct project link in schema we saw earlier?
    // Let's re-verify the schema. The employee table has site, dept, role.
    // Projects are likely many-to-many or handled differently.
    // Checking schema.ts... 
    // Schema doesn't show a direct project_id on employee, nor a many-to-many table in what I viewed.
    // Wait, let me check relations in schema.ts again.
    
    // If project scope is used, but we can't link employee to project, we assume false for now
    // unless there is a mechanism I missed.
    if (requirement.projectId) {
        // TODO: Implement project assignment checking
        return false; 
    }

    return true;
}

/**
 * Filter a list of requirements to find those applicable to an employee.
 */
export function getApplicableRequirements(
    employee: Employee,
    allRequirements: SkillRequirement[]
): SkillRequirement[] {
    return allRequirements.filter(req => doesRequirementApply(employee, req));
}

export type EnrichedRequirement = SkillRequirement & {
    skill: Skill;
};
