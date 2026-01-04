
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

export type EnrichedRequirement = SkillRequirement & {
    skill: Skill;
};

/**
 * Filter a list of requirements to find those applicable to an employee.
 * This overload preserves the enriched type when skill relations are included.
 */
export function getApplicableRequirements(
    employee: Employee,
    projectIds: string[],
    allRequirements: EnrichedRequirement[]
): EnrichedRequirement[];
export function getApplicableRequirements(
    employee: Employee,
    projectIds: string[],
    allRequirements: SkillRequirement[]
): SkillRequirement[];
export function getApplicableRequirements<T extends SkillRequirement>(
    employee: Employee,
    projectIds: string[],
    allRequirements: T[]
): T[] {
    return allRequirements.filter(req => doesRequirementApply(employee, projectIds, req));
}

