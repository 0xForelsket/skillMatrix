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
		<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
			<Icon className="h-3 w-3 text-primary/50" />
			<span>{label}:</span>
			<span className="text-foreground">{value}</span>
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
		<div className="flex flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h1 className="text-page-title">Skill Requirements</h1>
					<p className="text-muted-foreground">
						Define which skills are mandatory for specific roles, sites, or
						projects.
					</p>
				</div>
				<NewRequirementDialog metadata={metadata} />
			</div>

			<div className="rounded-xl border bg-card text-card-foreground shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 border-b">
							<tr>
								<th className="h-12 px-4 align-middle text-label">
									Required Skill
								</th>
								<th className="h-12 px-4 align-middle text-label">
									Level
								</th>
								<th className="h-12 px-4 align-middle text-label">
									Scope (Applies To)
								</th>
								<th className="h-12 px-4 text-right align-middle text-label">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
							{requirements.length === 0 ? (
								<tr>
									<td
										colSpan={4}
										className="p-8 text-center text-muted-foreground"
									>
										No requirements defined yet.
									</td>
								</tr>
							) : (
								requirements.map((req) => (
									<tr
										key={req.id}
										className="border-b transition-colors hover:bg-muted/50"
									>
										<td className="p-4 align-middle font-medium">
											{req.skill.name}
										</td>
										<td className="p-4 align-middle">
											<div className="flex items-center gap-1">
												{[1, 2, 3, 4, 5].map((l) => (
													<div
														key={l}
														className={`h-1.5 w-3 rounded-full ${
															l <= (req.requiredLevel || 1)
																? "bg-primary"
																: "bg-muted"
														}`}
													/>
												))}
												<span className="ml-2 text-xs text-muted-foreground font-mono">
													L{req.requiredLevel}
												</span>
											</div>
										</td>
										<td className="p-4 align-middle">
											<div className="flex flex-wrap gap-2">
												{!req.siteId &&
													!req.departmentId &&
													!req.roleId &&
													!req.projectId && (
														<span className="text-muted-foreground italic text-xs">
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
										<td className="p-4 align-middle text-right">
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
