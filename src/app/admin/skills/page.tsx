import {
	AlertCircle,
	Clock,
	FileText,
	MoreHorizontal,
	Search,
} from "lucide-react";
import { listSkills } from "@/actions/skills";
import { Button } from "@/components/ui/button";
import { CreateSkillButton } from "./create-skill-button";

export default async function SkillsPage() {
	const skillsResult = await listSkills();

	if (!skillsResult.success) {
		return (
			<div className="p-8 text-center text-destructive">
				Failed to load skills: {skillsResult.error}
			</div>
		);
	}

	const skills = skillsResult.data || [];

	return (
		<div className="flex flex-col gap-6 p-6 md:p-8">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h2 className="text-2xl font-bold tracking-tight">Skills Catalog</h2>
					<p className="text-muted-foreground">
						Manage your library of operational skills and certifications.
					</p>
				</div>
				<CreateSkillButton />
			</div>

			{/* Filters Bar */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<input
						type="search"
						placeholder="Search skills..."
						className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{skills.length === 0 ? (
					<div className="col-span-full p-12 text-center border rounded-lg border-dashed text-muted-foreground">
						No skills defined yet. Create your first skill to get started.
					</div>
				) : (
					skills.map((skill) => {
						const currentRevision = skill.revisions[0];
						return (
							<div
								key={skill.id}
								className="group relative rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow"
							>
								<div className="p-6 space-y-4">
									<div className="flex items-start justify-between">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<h3 className="font-semibold leading-none tracking-tight">
													{skill.name}
												</h3>
												<span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium ring-1 ring-inset ring-gray-500/10">
													{skill.code}
												</span>
											</div>
											<p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
												{skill.description || "No description provided."}
											</p>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="-mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
										>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</div>
									<div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
										<div className="flex items-center gap-2">
											<FileText className="h-3 w-3" />
											<span>
												{currentRevision
													? `Latest: ${currentRevision.revisionLabel}`
													: "No revisions"}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Clock className="h-3 w-3" />
											<span>
												{skill.validityMonths
													? `${skill.validityMonths}m validity`
													: "No expiration"}
											</span>
										</div>
									</div>
								</div>
								{currentRevision?.status === "draft" && (
									<div className="absolute top-2 right-10 flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-600/20">
										<AlertCircle className="h-3 w-3" />
										Draft
									</div>
								)}
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
