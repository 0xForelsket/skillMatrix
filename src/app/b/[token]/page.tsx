/**
 * Public Badge Viewer Page
 *
 * Displays an employee's skills when their QR badge is scanned.
 * No authentication required - accessible by anyone with the URL.
 */

import { db } from "@/db";
import { employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { BadgeCheck, AlertTriangle, XCircle, Clock, Award, Building2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { isCertificationActive, isExpiringSoon } from "@/lib/skills";

interface BadgePageProps {
	params: Promise<{ token: string }>;
}

async function getEmployeeByBadgeToken(token: string) {
	return db.query.employees.findFirst({
		where: eq(employees.badgeToken, token),
		with: {
			site: true,
			department: true,
			role: true,
			skills: {
				with: {
					skill: true,
					revision: true,
				},
			},
		},
	});
}

type SkillStatus = "valid" | "expiring_soon" | "expired" | "revoked";

function getSkillStatus(skill: {
	expiresAt: Date | null;
	revokedAt: Date | null;
}): SkillStatus {
	if (skill.revokedAt) return "revoked";
	if (!isCertificationActive(skill.expiresAt)) return "expired";
	if (isExpiringSoon(skill.expiresAt)) return "expiring_soon";
	return "valid";
}

function StatusIcon({ status }: { status: SkillStatus }) {
	switch (status) {
		case "valid":
			return <BadgeCheck className="h-5 w-5 text-emerald-500" />;
		case "expiring_soon":
			return <Clock className="h-5 w-5 text-amber-500" />;
		case "expired":
			return <AlertTriangle className="h-5 w-5 text-red-500" />;
		case "revoked":
			return <XCircle className="h-5 w-5 text-red-600" />;
	}
}

function StatusBadge({ status }: { status: SkillStatus }) {
	const styles: Record<SkillStatus, string> = {
		valid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
		expiring_soon: "bg-amber-500/10 text-amber-500 border-amber-500/20",
		expired: "bg-red-500/10 text-red-500 border-red-500/20",
		revoked: "bg-red-600/10 text-red-600 border-red-600/20",
	};

	const labels: Record<SkillStatus, string> = {
		valid: "Valid",
		expiring_soon: "Expiring Soon",
		expired: "Expired",
		revoked: "Revoked",
	};

	return (
		<span
			className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${styles[status]}`}
		>
			{labels[status]}
		</span>
	);
}

export default async function BadgeViewerPage({ params }: BadgePageProps) {
	const { token } = await params;
	const employee = await getEmployeeByBadgeToken(token);

	if (!employee) {
		notFound();
	}

	// Handle terminated employees
	if (employee.status === "terminated") {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
				<div className="text-center space-y-4">
					<div className="flex justify-center">
						<div className="rounded-full bg-red-500/10 p-4">
							<XCircle className="h-12 w-12 text-red-500" />
						</div>
					</div>
					<h1 className="text-xl font-semibold text-white">
						Badge No Longer Valid
					</h1>
					<p className="text-slate-400 max-w-sm">
						This employee badge has been deactivated. Please contact HR if you
						believe this is an error.
					</p>
				</div>
			</div>
		);
	}

	// Filter to only show non-revoked, active skills for the summary
	const activeSkills = employee.skills.filter((s) => {
		const status = getSkillStatus(s);
		return status === "valid" || status === "expiring_soon";
	});

	const expiredSkills = employee.skills.filter((s) => {
		const status = getSkillStatus(s);
		return status === "expired" || status === "revoked";
	});

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
			{/* Header */}
			<header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
				<div className="mx-auto max-w-2xl px-4 py-4">
					<div className="flex items-center gap-2 text-sm text-slate-400">
						<Award className="h-4 w-4" />
						<span>Caliber Skills Verification</span>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="mx-auto max-w-2xl px-4 py-8">
				{/* Employee Card */}
				<div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
					{/* Employee Header */}
					<div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 p-6">
						<div className="flex items-center gap-4">
							{/* Avatar */}
							<div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-2xl font-bold text-white shadow-lg shrink-0">
								{employee.photoUrl ? (
									<img
										src={employee.photoUrl}
										alt={employee.name}
										className="h-full w-full rounded-full object-cover"
									/>
								) : (
									employee.name.substring(0, 2).toUpperCase()
								)}
							</div>

							<div className="min-w-0">
								<h1 className="text-2xl font-bold text-white truncate">
									{employee.name}
								</h1>
								<div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
									{employee.role && (
										<span className="flex items-center gap-1">
											<Award className="h-3.5 w-3.5" />
											{employee.role.name}
										</span>
									)}
									{employee.department && (
										<span className="flex items-center gap-1">
											<Building2 className="h-3.5 w-3.5" />
											{employee.department.name}
										</span>
									)}
								</div>
								{employee.site && (
									<div className="mt-1 flex items-center gap-1 text-sm text-slate-400">
										<MapPin className="h-3.5 w-3.5" />
										{employee.site.name}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Skills Summary */}
					<div className="border-b border-white/10 p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="flex items-center gap-1.5">
									<BadgeCheck className="h-5 w-5 text-emerald-500" />
									<span className="text-sm font-medium text-white">
										{activeSkills.length}
									</span>
									<span className="text-sm text-slate-400">Active</span>
								</div>
								{expiredSkills.length > 0 && (
									<div className="flex items-center gap-1.5">
										<AlertTriangle className="h-5 w-5 text-red-500" />
										<span className="text-sm font-medium text-white">
											{expiredSkills.length}
										</span>
										<span className="text-sm text-slate-400">
											Expired/Revoked
										</span>
									</div>
								)}
							</div>
							<span className="text-xs text-slate-500">
								ID: {employee.employeeNumber}
							</span>
						</div>
					</div>

					{/* Skills List */}
					<div className="divide-y divide-white/5">
						{employee.skills.length === 0 ? (
							<div className="p-8 text-center text-slate-400">
								<Award className="mx-auto h-12 w-12 opacity-50" />
								<p className="mt-2">No skills recorded yet</p>
							</div>
						) : (
							employee.skills
								.sort((a, b) => {
									// Sort by status: valid first, then expiring, then expired, then revoked
									const statusOrder: Record<SkillStatus, number> = {
										valid: 0,
										expiring_soon: 1,
										expired: 2,
										revoked: 3,
									};
									return (
										statusOrder[getSkillStatus(a)] -
										statusOrder[getSkillStatus(b)]
									);
								})
								.map((empSkill) => {
									const status = getSkillStatus(empSkill);
									return (
										<div
											key={empSkill.id}
											className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
										>
											<StatusIcon status={status} />
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="font-medium text-white truncate">
														{empSkill.skill.name}
													</span>
													{empSkill.skill.code && (
														<span className="text-xs text-slate-500 shrink-0">
															{empSkill.skill.code}
														</span>
													)}
												</div>
												<div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
													<span>Level {empSkill.achievedLevel}</span>
													<span>•</span>
													<span>
														Certified{" "}
														{format(new Date(empSkill.achievedAt), "MMM d, yyyy")}
													</span>
													{empSkill.expiresAt && (
														<>
															<span>•</span>
															<span>
																Expires{" "}
																{format(
																	new Date(empSkill.expiresAt),
																	"MMM d, yyyy",
																)}
															</span>
														</>
													)}
												</div>
											</div>
											<StatusBadge status={status} />
										</div>
									);
								})
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="mt-6 text-center text-xs text-slate-500">
					<p>
						Verified on {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
					</p>
					<p className="mt-1">
						This is a real-time verification of employee skills and
						certifications.
					</p>
				</div>
			</main>
		</div>
	);
}
