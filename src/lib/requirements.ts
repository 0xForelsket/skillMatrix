
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
    projectIds: string[],
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
    if (requirement.projectId && !projectIds.includes(requirement.projectId)) {
        return false;
    }

    return true;
}

/**
 * Filter a list of requirements to find those applicable to an employee.
 */
export function getApplicableRequirements(
    employee: Employee,
    projectIds: string[],
    allRequirements: SkillRequirement[]
): SkillRequirement[] {
    return allRequirements.filter(req => doesRequirementApply(employee, projectIds, req));
}

export type EnrichedRequirement = SkillRequirement & {
    skill: Skill;
};
