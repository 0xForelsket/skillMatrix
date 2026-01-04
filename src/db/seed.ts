/**
 * Database Seed Script
 *
 * Creates comprehensive test data for all features.
 * Run with: bun run db:seed
 *
 * Test scenarios covered:
 * - Employee A: All skills valid (VALID)
 * - Employee B: Missing "Forklift" requirement (MISSING)
 * - Employee C: Certified on archived revision (OUTDATED)
 * - Employee D: Skill expires in 15 days (EXPIRING_SOON)
 * - Employee E: Has Level 1, needs Level 2 (INSUFFICIENT_LEVEL)
 * - Employee F: Had skill revoked (tests revocation flow)
 */

import { db } from "@/db";
import {
	departments,
	employeeSkills,
	employees,
	roles,
	sites,
	skillRequirements,
	skillRevisions,
	skills,
	users,
} from "@/db/schema";
import { generateId } from "@/lib/id";
import { hashPassword } from "@/lib/password";
import { generateBadgeToken } from "@/lib/token";

async function seed() {
	console.log("🌱 Starting seed...\n");

	// ==========================================================================
	// 1. SITES
	// ==========================================================================
	console.log("Creating sites...");
	const [austinSite, detroitSite] = await db
		.insert(sites)
		.values([
			{
				id: generateId(),
				code: "ATX-01",
				name: "Austin Plant",
				timezone: "America/Chicago",
			},
			{
				id: generateId(),
				code: "DTR-01",
				name: "Detroit Plant",
				timezone: "America/Detroit",
			},
		])
		.returning();
	console.log(`  ✓ Created ${austinSite.name} and ${detroitSite.name}`);

	// ==========================================================================
	// 2. DEPARTMENTS
	// ==========================================================================
	console.log("Creating departments...");
	const [productionDept, qualityDept, maintenanceDept, hrDept] = await db
		.insert(departments)
		.values([
			{ id: generateId(), name: "Production" },
			{ id: generateId(), name: "Quality" },
			{ id: generateId(), name: "Maintenance" },
			{ id: generateId(), name: "HR" },
		])
		.returning();
	console.log(`  ✓ Created 4 departments`);

	// ==========================================================================
	// 3. ROLES
	// ==========================================================================
	console.log("Creating roles...");
	const [operatorL1, operatorL2, technician, lead, supervisor] = await db
		.insert(roles)
		.values([
			{ id: generateId(), name: "Operator L1" },
			{ id: generateId(), name: "Operator L2" },
			{ id: generateId(), name: "Technician" },
			{ id: generateId(), name: "Lead" },
			{ id: generateId(), name: "Supervisor" },
		])
		.returning();
	console.log(`  ✓ Created 5 roles`);

	// ==========================================================================
	// 4. USERS (App accounts)
	// ==========================================================================
	console.log("Creating users...");
	const defaultPassword = await hashPassword("password123");

	const [adminUser, hrUser, trainer1User, trainer2User, auditorUser] = await db
		.insert(users)
		.values([
			{
				id: generateId(),
				email: "admin@caliber.local",
				passwordHash: await hashPassword("admin123"),
				appRole: "admin" as const,
				status: "active" as const,
			},
			{
				id: generateId(),
				email: "hr@caliber.local",
				passwordHash: defaultPassword,
				appRole: "skill_manager" as const,
				status: "active" as const,
			},
			{
				id: generateId(),
				email: "trainer1@caliber.local",
				passwordHash: defaultPassword,
				appRole: "trainer" as const,
				status: "active" as const,
			},
			{
				id: generateId(),
				email: "trainer2@caliber.local",
				passwordHash: defaultPassword,
				appRole: "trainer" as const,
				status: "active" as const,
			},
			{
				id: generateId(),
				email: "auditor@caliber.local",
				passwordHash: defaultPassword,
				appRole: "auditor" as const,
				status: "active" as const,
			},
		])
		.returning();
	console.log(`  ✓ Created 5 users (admin, hr, 2 trainers, auditor)`);

	// ==========================================================================
	// 5. SKILLS
	// ==========================================================================
	console.log("Creating skills...");
	const [
		safetySkill,
		forkliftSkill,
		injectionSkill,
		qualitySkill,
		firstAidSkill,
	] = await db
		.insert(skills)
		.values([
			{
				id: generateId(),
				name: "Safety Protocols",
				code: "SOP-001",
				description: "Basic workplace safety procedures",
				validityMonths: null, // Never expires
				maxLevel: 1,
			},
			{
				id: generateId(),
				name: "Forklift Operation",
				code: "SOP-002",
				description: "Certified forklift operator training",
				validityMonths: 12,
				maxLevel: 1,
			},
			{
				id: generateId(),
				name: "Injection Molding",
				code: "SOP-003",
				description: "Injection molding machine operation",
				validityMonths: 24,
				maxLevel: 3,
			},
			{
				id: generateId(),
				name: "Quality Inspection",
				code: "SOP-004",
				description: "Product quality inspection procedures",
				validityMonths: 6,
				maxLevel: 2,
			},
			{
				id: generateId(),
				name: "First Aid",
				code: "EXT-001",
				description: "External first aid certification",
				validityMonths: 12,
				maxLevel: 1,
			},
		])
		.returning();
	console.log(`  ✓ Created 5 skills`);

	// ==========================================================================
	// 6. SKILL REVISIONS
	// ==========================================================================
	console.log("Creating skill revisions...");

	// Safety: 2 revisions (Rev A archived, Rev B active)
	const [safetyRevA, safetyRevB] = await db
		.insert(skillRevisions)
		.values([
			{
				id: generateId(),
				skillId: safetySkill.id,
				revisionLabel: "Rev A",
				changeLog: "Initial version",
				status: "archived" as const,
				effectiveDate: new Date("2024-01-01"),
				requiresRetraining: true,
			},
			{
				id: generateId(),
				skillId: safetySkill.id,
				revisionLabel: "Rev B",
				changeLog: "Updated emergency procedures",
				status: "active" as const,
				effectiveDate: new Date("2025-06-01"),
				requiresRetraining: true,
			},
		])
		.returning();

	// Other skills: single active revision each
	const [forkliftRev, injectionRev, qualityRev, _firstAidRev] = await db
		.insert(skillRevisions)
		.values([
			{
				id: generateId(),
				skillId: forkliftSkill.id,
				revisionLabel: "Rev A",
				status: "active" as const,
				effectiveDate: new Date("2025-01-01"),
			},
			{
				id: generateId(),
				skillId: injectionSkill.id,
				revisionLabel: "Rev A",
				status: "active" as const,
				effectiveDate: new Date("2025-01-01"),
			},
			{
				id: generateId(),
				skillId: qualitySkill.id,
				revisionLabel: "Rev A",
				status: "active" as const,
				effectiveDate: new Date("2025-01-01"),
			},
			{
				id: generateId(),
				skillId: firstAidSkill.id,
				revisionLabel: "Rev A",
				status: "active" as const,
				effectiveDate: new Date("2025-01-01"),
			},
		])
		.returning();
	console.log(`  ✓ Created 6 skill revisions`);

	// ==========================================================================
	// 7. SKILL REQUIREMENTS
	// ==========================================================================
	console.log("Creating skill requirements...");
	await db.insert(skillRequirements).values([
		// Global: Everyone needs Safety Protocols
		{
			id: generateId(),
			skillId: safetySkill.id,
			requiredLevel: 1,
		},
		// Site-specific: Austin needs Injection Molding (it's a molding plant)
		{
			id: generateId(),
			skillId: injectionSkill.id,
			siteId: austinSite.id,
			requiredLevel: 1,
		},
		// Department-specific: Production needs Quality Inspection
		{
			id: generateId(),
			skillId: qualitySkill.id,
			departmentId: productionDept.id,
			requiredLevel: 1,
		},
		// Role-specific: Operators L2+ need Forklift Operation
		{
			id: generateId(),
			skillId: forkliftSkill.id,
			roleId: operatorL2.id,
			requiredLevel: 1,
		},
		// Injection Molding Level 2 for Technicians at Austin
		{
			id: generateId(),
			skillId: injectionSkill.id,
			siteId: austinSite.id,
			roleId: technician.id,
			requiredLevel: 2,
		},
	]);
	console.log(`  ✓ Created 5 skill requirements`);

	// ==========================================================================
	// 8. EMPLOYEES
	// ==========================================================================
	console.log("Creating employees...");

	// Employees with user accounts (can log in)
	const [_empAdmin, _empHR, _empTrainer1, _empTrainer2, _empAuditor] = await db
		.insert(employees)
		.values([
			{
				id: generateId(),
				userId: adminUser.id,
				siteId: austinSite.id,
				departmentId: hrDept.id,
				roleId: supervisor.id,
				employeeNumber: "EMP-0001",
				badgeToken: generateBadgeToken(),
				name: "Alice Administrator",
				email: "alice@company.com",
			},
			{
				id: generateId(),
				userId: hrUser.id,
				siteId: austinSite.id,
				departmentId: hrDept.id,
				roleId: lead.id,
				employeeNumber: "EMP-0002",
				badgeToken: generateBadgeToken(),
				name: "Hannah HR",
				email: "hannah@company.com",
			},
			{
				id: generateId(),
				userId: trainer1User.id,
				siteId: austinSite.id,
				departmentId: productionDept.id,
				roleId: lead.id,
				employeeNumber: "EMP-0003",
				badgeToken: generateBadgeToken(),
				name: "Tom Trainer",
				email: "tom@company.com",
			},
			{
				id: generateId(),
				userId: trainer2User.id,
				siteId: detroitSite.id,
				departmentId: productionDept.id,
				roleId: lead.id,
				employeeNumber: "EMP-0004",
				badgeToken: generateBadgeToken(),
				name: "Tina Trainer",
				email: "tina@company.com",
			},
			{
				id: generateId(),
				userId: auditorUser.id,
				siteId: austinSite.id,
				departmentId: qualityDept.id,
				roleId: supervisor.id,
				employeeNumber: "EMP-0005",
				badgeToken: generateBadgeToken(),
				name: "Andy Auditor",
				email: "andy@company.com",
			},
		])
		.returning();

	// Test scenario employees (badge-only, no login)
	const [empA, empB, empC, empD, empE, empF] = await db
		.insert(employees)
		.values([
			{
				// Employee A: All skills valid (VALID)
				id: generateId(),
				siteId: austinSite.id,
				departmentId: productionDept.id,
				roleId: operatorL1.id,
				employeeNumber: "EMP-0010",
				badgeToken: generateBadgeToken(),
				name: "Valid Victor",
			},
			{
				// Employee B: Missing Forklift (MISSING) - is L2 operator
				id: generateId(),
				siteId: austinSite.id,
				departmentId: productionDept.id,
				roleId: operatorL2.id,
				employeeNumber: "EMP-0011",
				badgeToken: generateBadgeToken(),
				name: "Missing Mike",
			},
			{
				// Employee C: Certified on archived revision (OUTDATED)
				id: generateId(),
				siteId: austinSite.id,
				departmentId: productionDept.id,
				roleId: operatorL1.id,
				employeeNumber: "EMP-0012",
				badgeToken: generateBadgeToken(),
				name: "Outdated Oscar",
			},
			{
				// Employee D: Skill expires in 15 days (EXPIRING_SOON)
				id: generateId(),
				siteId: austinSite.id,
				departmentId: productionDept.id,
				roleId: operatorL1.id,
				employeeNumber: "EMP-0013",
				badgeToken: generateBadgeToken(),
				name: "Expiring Emma",
			},
			{
				// Employee E: Has Level 1, needs Level 2 (INSUFFICIENT_LEVEL)
				id: generateId(),
				siteId: austinSite.id,
				departmentId: productionDept.id,
				roleId: technician.id,
				employeeNumber: "EMP-0014",
				badgeToken: generateBadgeToken(),
				name: "Insufficient Ivan",
			},
			{
				// Employee F: Had skill revoked
				id: generateId(),
				siteId: detroitSite.id,
				departmentId: maintenanceDept.id,
				roleId: technician.id,
				employeeNumber: "EMP-0015",
				badgeToken: generateBadgeToken(),
				name: "Revoked Rachel",
			},
		])
		.returning();
	console.log(`  ✓ Created 11 employees (5 with logins, 6 badge-only)`);

	// ==========================================================================
	// 9. EMPLOYEE SKILLS (Certifications)
	// ==========================================================================
	console.log("Creating employee certifications...");
	const now = new Date();
	const oneYearAgo = new Date(
		now.getFullYear() - 1,
		now.getMonth(),
		now.getDate(),
	);
	const sixMonthsAgo = new Date(
		now.getFullYear(),
		now.getMonth() - 6,
		now.getDate(),
	);
	const in15Days = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() + 15,
	);
	const inOneYear = new Date(
		now.getFullYear() + 1,
		now.getMonth(),
		now.getDate(),
	);

	await db.insert(employeeSkills).values([
		// Employee A (Valid Victor): All required skills valid
		{
			id: generateId(),
			employeeId: empA.id,
			skillId: safetySkill.id,
			skillRevisionId: safetyRevB.id,
			achievedLevel: 1,
			achievedAt: sixMonthsAgo,
			certifiedByUserId: trainer1User.id,
		},
		{
			id: generateId(),
			employeeId: empA.id,
			skillId: injectionSkill.id,
			skillRevisionId: injectionRev.id,
			achievedLevel: 1,
			achievedAt: sixMonthsAgo,
			expiresAt: inOneYear,
			certifiedByUserId: trainer1User.id,
		},
		{
			id: generateId(),
			employeeId: empA.id,
			skillId: qualitySkill.id,
			skillRevisionId: qualityRev.id,
			achievedLevel: 1,
			achievedAt: sixMonthsAgo,
			expiresAt: inOneYear,
			certifiedByUserId: trainer1User.id,
		},

		// Employee B (Missing Mike): Has safety but missing forklift (required for L2)
		{
			id: generateId(),
			employeeId: empB.id,
			skillId: safetySkill.id,
			skillRevisionId: safetyRevB.id,
			achievedLevel: 1,
			achievedAt: sixMonthsAgo,
			certifiedByUserId: trainer1User.id,
		},

		// Employee C (Outdated Oscar): Certified on OLD revision (Rev A, now archived)
		{
			id: generateId(),
			employeeId: empC.id,
			skillId: safetySkill.id,
			skillRevisionId: safetyRevA.id, // ARCHIVED revision!
			achievedLevel: 1,
			achievedAt: oneYearAgo,
			certifiedByUserId: trainer1User.id,
		},

		// Employee D (Expiring Emma): Skill expires in 15 days
		{
			id: generateId(),
			employeeId: empD.id,
			skillId: safetySkill.id,
			skillRevisionId: safetyRevB.id,
			achievedLevel: 1,
			achievedAt: sixMonthsAgo,
			certifiedByUserId: trainer1User.id,
		},
		{
			id: generateId(),
			employeeId: empD.id,
			skillId: qualitySkill.id,
			skillRevisionId: qualityRev.id,
			achievedLevel: 1,
			achievedAt: sixMonthsAgo,
			expiresAt: in15Days, // EXPIRING SOON!
			certifiedByUserId: trainer1User.id,
		},

		// Employee E (Insufficient Ivan): Has Level 1 injection, needs Level 2
		{
			id: generateId(),
			employeeId: empE.id,
			skillId: safetySkill.id,
			skillRevisionId: safetyRevB.id,
			achievedLevel: 1,
			achievedAt: sixMonthsAgo,
			certifiedByUserId: trainer1User.id,
		},
		{
			id: generateId(),
			employeeId: empE.id,
			skillId: injectionSkill.id,
			skillRevisionId: injectionRev.id,
			achievedLevel: 1, // Has Level 1, but technicians need Level 2!
			achievedAt: sixMonthsAgo,
			expiresAt: inOneYear,
			certifiedByUserId: trainer1User.id,
		},

		// Employee F (Revoked Rachel): Had forklift but it was revoked
		{
			id: generateId(),
			employeeId: empF.id,
			skillId: safetySkill.id,
			skillRevisionId: safetyRevB.id,
			achievedLevel: 1,
			achievedAt: sixMonthsAgo,
			certifiedByUserId: trainer2User.id,
		},
		{
			id: generateId(),
			employeeId: empF.id,
			skillId: forkliftSkill.id,
			skillRevisionId: forkliftRev.id,
			achievedLevel: 1,
			achievedAt: oneYearAgo,
			expiresAt: inOneYear,
			certifiedByUserId: trainer2User.id,
			// REVOKED!
			revokedAt: sixMonthsAgo,
			revokedByUserId: adminUser.id,
			revocationReason: "Failed practical assessment",
		},
	]);
	console.log(`  ✓ Created 11 employee certifications (including 1 revoked)`);

	// ==========================================================================
	// SUMMARY
	// ==========================================================================
	console.log("\n✅ Seed complete!\n");
	console.log("📊 Summary:");
	console.log("   - 2 sites");
	console.log("   - 4 departments");
	console.log("   - 5 roles");
	console.log("   - 5 users");
	console.log("   - 5 skills (6 revisions)");
	console.log("   - 5 skill requirements");
	console.log("   - 11 employees");
	console.log("   - 11 certifications");
	console.log("\n🔐 Login credentials:");
	console.log("   admin@caliber.local / admin123 (Admin)");
	console.log("   hr@caliber.local / password123 (Skill Manager)");
	console.log("   trainer1@caliber.local / password123 (Trainer)");
	console.log("   trainer2@caliber.local / password123 (Trainer)");
	console.log("   auditor@caliber.local / password123 (Auditor)");
	console.log("\n🧪 Test scenarios:");
	console.log("   Employee A (Victor): All skills VALID");
	console.log("   Employee B (Mike): MISSING forklift");
	console.log("   Employee C (Oscar): OUTDATED (archived revision)");
	console.log("   Employee D (Emma): EXPIRING_SOON (15 days)");
	console.log("   Employee E (Ivan): INSUFFICIENT_LEVEL (L1 vs L2)");
	console.log("   Employee F (Rachel): Skill REVOKED");
}

// Run seed
seed()
	.then(() => {
		console.log("\n🎉 Done!");
		process.exit(0);
	})
	.catch((error) => {
		console.error("\n❌ Seed failed:", error);
		process.exit(1);
	});
