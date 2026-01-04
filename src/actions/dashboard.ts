"use server";

import { db } from "@/db";
import { employeeSkills, employees, skills, skillRequirements } from "@/db/schema";
import { count, eq, isNull, and, gte, lte } from "drizzle-orm";
import { getMatrixData } from "@/lib/matrix";

export async function getDashboardStats() {
	try {
		// 1. Basic Counts
		const [empCount] = await db.select({ value: count() }).from(employees).where(isNull(employees.deletedAt));
		const [skillCount] = await db.select({ value: count() }).from(skills).where(isNull(skills.deletedAt));
		
		// 2. Expiring Soon (Next 30 days)
		const thirtyDaysFromNow = new Date();
		thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
		
		const [expiringSoon] = await db.select({ value: count() })
			.from(employeeSkills)
			.where(
				and(
					isNull(employeeSkills.revokedAt),
					gte(employeeSkills.expiresAt, new Date()),
					lte(employeeSkills.expiresAt, thirtyDaysFromNow)
				)
			);

		// 3. Matrix-based stats (Compliance & Gaps)
		// Note: This calculates for the entire organization.
		const matrixData = await getMatrixData();
		
		let totalRequired = 0;
		let metRequired = 0;
		let gapCount = 0;
		let expiredRequiredCount = 0;

		for (const empId in matrixData.cells) {
			for (const skillId in matrixData.cells[empId]) {
				const cell = matrixData.cells[empId][skillId];
				if (cell.requiredLevel > 0) {
					totalRequired++;
					if (cell.status === "compliant") {
						metRequired++;
					} else if (cell.status === "gap" || cell.status === "missing") {
						gapCount++;
					} else if (cell.status === "expired") {
						expiredRequiredCount++;
					}
				}
			}
		}

		const complianceRate = totalRequired > 0 
			? Math.round((metRequired / totalRequired) * 100) 
			: 100;

		return {
			success: true,
			data: {
				totalEmployees: empCount.value,
				totalSkills: skillCount.value,
				expiringSoon: expiringSoon.value,
				complianceRate,
				gapCount,
				expiredRequiredCount,
				totalRequirements: totalRequired
			}
		};
	} catch (error) {
		console.error("Failed to fetch dashboard stats:", error);
		return { success: false, error: "Internal Server Error" };
	}
}
