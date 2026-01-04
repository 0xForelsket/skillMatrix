"use client";

import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
	createRequirement,
	type RequirementFormData,
} from "@/actions/requirements";
import { Button } from "@/components/ui/button";

interface NewRequirementDialogProps {
	metadata: {
		skills: { id: string; name: string }[];
		sites: { id: string; name: string }[];
		departments: { id: string; name: string }[];
		roles: { id: string; name: string }[];
		projects: { id: string; name: string }[];
	};
}

export function NewRequirementDialog({ metadata }: NewRequirementDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const [formData, setFormData] = useState<RequirementFormData>({
		skillId: "",
		requiredLevel: 1,
		siteId: "",
		departmentId: "",
		roleId: "",
		projectId: "",
	});

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		// Client-side validation for "at least one scope"
		const hasScope =
			formData.siteId ||
			formData.departmentId ||
			formData.roleId ||
			formData.projectId;
		if (!hasScope) {
			setError(
				"Please select at least one scope (Site, Department, Role, or Project).",
			);
			return;
		}

		if (!formData.skillId) {
			setError("Please select a skill.");
			return;
		}

		startTransition(async () => {
			// Clean up empty strings to null/undefined for the action
			const submissionData = {
				skillId: formData.skillId,
				requiredLevel: Number(formData.requiredLevel),
				siteId: formData.siteId || undefined,
				departmentId: formData.departmentId || undefined,
				roleId: formData.roleId || undefined,
				projectId: formData.projectId || undefined,
			};

			const result = await createRequirement(submissionData);

			if (result.success) {
				setIsOpen(false);
				setFormData({
					skillId: "",
					requiredLevel: 1,
					siteId: "",
					departmentId: "",
					roleId: "",
					projectId: "",
				});
				router.refresh();
			} else {
				if (typeof result.error === "string") {
					setError(result.error);
				} else {
					setError("Validation failed. Please check the form.");
				}
			}
		});
	};

	if (!isOpen) {
		return (
			<Button onClick={() => setIsOpen(true)}>
				<Plus className="mr-2 h-4 w-4" />
				Add Requirement
			</Button>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
			<div className="bg-slate-950 border border-white/10 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
				<div className="flex items-center justify-between p-4 border-b border-white/5 bg-slate-900/50">
					<h3 className="text-lg font-semibold text-white">
						Define Skill Requirement
					</h3>
					<button
						type="button"
						onClick={() => setIsOpen(false)}
						className="text-slate-400 hover:text-white transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="p-6 space-y-6">
					{error && (
						<div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
							<AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
							<span>{error}</span>
						</div>
					)}

					<div className="grid grid-cols-2 gap-4">
						<div className="col-span-2 space-y-2">
							<label
								htmlFor="skillId"
								className="text-sm font-medium text-slate-300"
							>
								Target Skill
							</label>
							<select
								id="skillId"
								name="skillId"
								value={formData.skillId}
								onChange={handleChange}
								className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
							>
								<option value="">Select a skill...</option>
								{metadata.skills.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
						</div>

						<div className="col-span-2 space-y-2">
							<label
								htmlFor="requiredLevel"
								className="text-sm font-medium text-slate-300"
							>
								Minimum Level Required (1-5)
							</label>
							<input
								id="requiredLevel"
								type="range"
								name="requiredLevel"
								min="1"
								max="5"
								value={formData.requiredLevel}
								onChange={(e) =>
									setFormData((p) => ({
										...p,
										requiredLevel: Number(e.target.value),
									}))
								}
								className="w-full"
							/>
							<div className="flex justify-between px-1 text-xs text-slate-500">
								<span>1 (Basic)</span>
								<span>2</span>
								<span>3 (Competent)</span>
								<span>4</span>
								<span>5 (Expert)</span>
							</div>
							<div className="text-center font-bold text-indigo-400">
								Level {formData.requiredLevel}
							</div>
						</div>

						<div className="col-span-2 pt-4 pb-2">
							<div className="h-px bg-white/5" />
							<p className="text-xs text-slate-500 mt-2 uppercase tracking-wider font-semibold">
								Scope (Who needs this?)
							</p>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="siteId"
								className="text-xs font-medium text-slate-400"
							>
								Site
							</label>
							<select
								id="siteId"
								name="siteId"
								value={formData.siteId || ""}
								onChange={handleChange}
								className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
							>
								<option value="">Any Site</option>
								{metadata.sites.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="departmentId"
								className="text-xs font-medium text-slate-400"
							>
								Department
							</label>
							<select
								id="departmentId"
								name="departmentId"
								value={formData.departmentId || ""}
								onChange={handleChange}
								className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
							>
								<option value="">Any Department</option>
								{metadata.departments.map((d) => (
									<option key={d.id} value={d.id}>
										{d.name}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="roleId"
								className="text-xs font-medium text-slate-400"
							>
								Job Role
							</label>
							<select
								id="roleId"
								name="roleId"
								value={formData.roleId || ""}
								onChange={handleChange}
								className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
							>
								<option value="">Any Role</option>
								{metadata.roles.map((r) => (
									<option key={r.id} value={r.id}>
										{r.name}
									</option>
								))}
							</select>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="projectId"
								className="text-xs font-medium text-slate-400"
							>
								Project Assignment
							</label>
							<select
								id="projectId"
								name="projectId"
								value={formData.projectId || ""}
								onChange={handleChange}
								className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
							>
								<option value="">Any Project</option>
								{metadata.projects.map((p) => (
									<option key={p.id} value={p.id}>
										{p.name}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="pt-4 flex gap-3">
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsOpen(false)}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isPending}
							className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
						>
							{isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								"Save Requirement"
							)}
						</Button>
					</div>
				</form>
			</div>
		</div>
	);
}
