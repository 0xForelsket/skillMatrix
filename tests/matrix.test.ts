import { expect, test, describe } from "bun:test";
import { calculateMatrixData, type MatrixStatus } from "../src/lib/matrix";

describe("Skill Matrix Logic", () => {
    // Mock Data
    const mockSkills = [
        { id: "s1", name: "Welding", code: "WLD", maxLevel: 5 },
        { id: "s2", name: "Safety", code: "SAF", maxLevel: 1 },
    ];

    const mockEmployee = {
        id: "e1",
        name: "John Doe",
        employeeNumber: "1001",
        siteId: "site1",
        site: { name: "Austin" },
        roleId: "role1",
        role: { name: "Technician" },
        departmentId: "dept1",
        department: { name: "Maintenance" },
        projects: [{ projectId: "proj1", project: { name: "Project X" } }],
    };

    const mockEmps = [mockEmployee];

    test("Status is 'none' when no requirements exist", () => {
        const result = calculateMatrixData(mockEmps, mockSkills, [], []);
        expect(result.cells["e1"]["s1"].status).toBe("none");
        expect(result.cells["e1"]["s1"].requiredLevel).toBe(0);
    });

    test("Status is 'missing' when required but not certified", () => {
        const result = calculateMatrixData(mockEmps, mockSkills, [
            { skillId: "s1", requiredLevel: 3, siteId: "site1", site: { name: "Austin" } }
        ], []);
        
        const cell = result.cells["e1"]["s1"];
        expect(cell.status).toBe("missing");
        expect(cell.requiredLevel).toBe(3);
        expect(cell.requirementSources).toContain("Site: Austin (Lvl 3)");
    });

    test("Status is 'compliant' when certified >= required level", () => {
        const result = calculateMatrixData(mockEmps, mockSkills, [
            { skillId: "s1", requiredLevel: 3, siteId: "site1" }
        ], [
            { employeeId: "e1", skillId: "s1", achievedLevel: 3, expiresAt: null }
        ]);

        expect(result.cells["e1"]["s1"].status).toBe("compliant");
    });

    test("Status is 'gap' when certified < required level", () => {
        const result = calculateMatrixData(mockEmps, mockSkills, [
            { skillId: "s1", requiredLevel: 4, siteId: "site1" }
        ], [
            { employeeId: "e1", skillId: "s1", achievedLevel: 3, expiresAt: null }
        ]);

        expect(result.cells["e1"]["s1"].status).toBe("gap");
    });

    test("Status is 'expired' when certification is expired", () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const result = calculateMatrixData(mockEmps, mockSkills, [
            { skillId: "s1", requiredLevel: 3, siteId: "site1" }
        ], [
            { employeeId: "e1", skillId: "s1", achievedLevel: 3, expiresAt: yesterday.toISOString() }
        ]);

        expect(result.cells["e1"]["s1"].status).toBe("expired");
    });

    test("Status is 'extra' when certified but not required", () => {
        const result = calculateMatrixData(mockEmps, mockSkills, [], [
            { employeeId: "e1", skillId: "s1", achievedLevel: 3, expiresAt: null }
        ]);

        expect(result.cells["e1"]["s1"].status).toBe("extra");
    });

    test("Considers Project requirements", () => {
        const result = calculateMatrixData(mockEmps, mockSkills, [
            { skillId: "s2", requiredLevel: 1, projectId: "proj1", project: { name: "Project X" } }
        ], []);

        const cell = result.cells["e1"]["s2"];
        expect(cell.status).toBe("missing");
        expect(cell.requirementSources[0]).toContain("Proj: Project X");
    });

    test("Ignores requirements for other sites/roles", () => {
        const result = calculateMatrixData(mockEmps, mockSkills, [
            { skillId: "s1", requiredLevel: 3, siteId: "site2" }, // Different site
            { skillId: "s1", requiredLevel: 3, roleId: "role2" }, // Different role
        ], []);

        const cell = result.cells["e1"]["s1"];
        expect(cell.status).toBe("none");
        expect(cell.requiredLevel).toBe(0);
    });

    test("Takes max required level from multiple sources", () => {
        const result = calculateMatrixData(mockEmps, mockSkills, [
            { skillId: "s1", requiredLevel: 2, siteId: "site1", site: { name: "Austin" } },
            { skillId: "s1", requiredLevel: 4, roleId: "role1", role: { name: "Technician" } }
        ], []);

        const cell = result.cells["e1"]["s1"];
        expect(cell.requiredLevel).toBe(4);
        expect(cell.requirementSources.length).toBe(2);
    });
});
