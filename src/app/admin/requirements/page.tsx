import { Briefcase, Building2, FolderKanban, MapPin } from "lucide-react";
import {
	getRequirementMetadata,
	listRequirements,
} from "@/actions/requirements";
import { DeleteRequirementButton } from "./delete-requirement-button";
import { NewRequirementDialog } from "./new-requirement-dialog";

function ScopeBadge({
	icon: Icon,
	label,
	value,
}: {
	icon: any;
	label: string;
	value?: string | null;
}) {
	if (!value) return null;
	return (
		<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/50 border border-white/5 text-xs text-slate-300">
			<Icon className="h-3 w-3 text-indigo-400" />
			<span className="font-medium text-slate-500">{label}:</span>
			<span className="text-white">{value}</span>
		</span>
	);
}

export default async function RequirementsPage() {
	const [requirementsRes, metadata] = await Promise.all([
		listRequirements(),
		getRequirementMetadata(),
	]);

	if (!requirementsRes.success) {
		return <div className="p-8 text-red-500">Failed to load requirements.</div>;
	}

	const requirements = requirementsRes.data || [];

	return (
		<div className="flex flex-col gap-6 p-6 md:p-8">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h2 className="text-2xl font-bold tracking-tight">
						Skill Requirements
					</h2>
					<p className="text-muted-foreground">
						Define which skills are mandatory for specific roles, sites, or
						projects.
					</p>
				</div>
				<NewRequirementDialog metadata={metadata} />
			</div>

			<div className="rounded-xl border border-white/10 bg-slate-950/50 shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-slate-900/50 border-b border-white/5">
							<tr>
								<th className="h-12 px-4 text-left font-medium text-slate-400">
									Required Skill
								</th>
								<th className="h-12 px-4 text-left font-medium text-slate-400">
									Level
								</th>
								<th className="h-12 px-4 text-left font-medium text-slate-400">
									Scope (Applies To)
								</th>
								<th className="h-12 px-4 text-right font-medium text-slate-400">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{requirements.length === 0 ? (
								<tr>
									<td colSpan={4} className="p-8 text-center text-slate-500">
										No requirements defined yet.
									</td>
								</tr>
							) : (
								requirements.map((req) => (
									<tr
										key={req.id}
										className="hover:bg-white/5 transition-colors"
									>
										<td className="p-4 font-medium text-white">
											{req.skill.name}
										</td>
										<td className="p-4">
											<div className="flex items-center gap-1">
												{[1, 2, 3, 4, 5].map((l) => (
													<div
														key={l}
														className={`h-1.5 w-3 rounded-full ${
															l <= (req.requiredLevel || 1)
																? "bg-indigo-500"
																: "bg-slate-800"
														}`}
													/>
												))}
												<span className="ml-2 text-xs text-slate-400 font-mono">
													L{req.requiredLevel}
												</span>
											</div>
										</td>
										<td className="p-4">
											<div className="flex flex-wrap gap-2">
												{!req.siteId &&
													!req.departmentId &&
													!req.roleId &&
													!req.projectId && (
														<span className="text-slate-500 italic">
															Global (All Employees)
														</span>
													)}
												<ScopeBadge
													icon={MapPin}
													label="Site"
													value={req.site?.code}
												/>
												<ScopeBadge
													icon={Building2}
													label="Dept"
													value={req.department?.name}
												/>
												<ScopeBadge
													icon={Briefcase}
													label="Role"
													value={req.role?.name}
												/>
												<ScopeBadge
													icon={FolderKanban}
													label="Proj"
													value={req.project?.name}
												/>
											</div>
										</td>
										<td className="p-4 text-right">
											<DeleteRequirementButton id={req.id} />
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
