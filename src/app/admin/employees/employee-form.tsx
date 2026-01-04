"use client";

import {
	Activity,
	Briefcase,
	Building2,
	Hash,
	Image as ImageIcon,
	Loader2,
	Mail,
	MapPin,
	Save,
	User,
	X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
	createEmployee,
	type EmployeeFormData,
	updateEmployee,
} from "@/actions/employees";
import { recordAttachment } from "@/actions/storage";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";

interface EmployeeFormProps {
	initialData?: EmployeeFormData & { id: string };
	metadata: {
		sites: { id: string; name: string; code: string }[];
		departments: { id: string; name: string }[];
		roles: { id: string; name: string }[];
	};
	performerId?: string;
}

export function EmployeeForm({
	initialData,
	metadata,
	performerId,
}: EmployeeFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [errors, setErrors] = useState<Record<string, string[]>>({});

	const [formData, setFormData] = useState<EmployeeFormData>({
		name: initialData?.name || "",
		employeeNumber: initialData?.employeeNumber || "",
		email: initialData?.email || "",
		siteId: initialData?.siteId || "",
		departmentId: initialData?.departmentId || null,
		roleId: initialData?.roleId || null,
		status: initialData?.status || "active",
		photoUrl: initialData?.photoUrl || "",
	});

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
		>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]:
				value === ""
					? name === "departmentId" || name === "roleId" || name === "photoUrl"
						? null
						: ""
					: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setErrors({});

		startTransition(async () => {
			const result = initialData
				? await updateEmployee(initialData.id, { ...formData, performerId })
				: await createEmployee({ ...formData, performerId });

			if (result.success) {
				router.push(
					`/admin/employees${initialData ? `/${initialData.id}` : ""}`,
				);
				router.refresh();
			} else if (typeof result.error === "object") {
				const formattedErrors: Record<string, string[]> = {};
				for (const [key, value] of Object.entries(
					result.error as Record<string, unknown>,
				)) {
					if (value && typeof value === "object" && "_errors" in value) {
						formattedErrors[key] = (value as { _errors: string[] })._errors;
					}
				}
				setErrors(formattedErrors);
			} else {
				setErrors({ global: [result.error as string] });
			}
		});
	};

	return (
		<form onSubmit={handleSubmit} className="max-w-4xl mx-auto py-8">
			<Card className="shadow-lg border-white/10 overflow-hidden">
				<CardHeader className="bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border-b border-white/5">
					<CardTitle className="flex items-center gap-2 text-2xl font-bold">
						<User className="h-6 w-6 text-indigo-400" />
						{initialData ? "Edit Employee" : "Register New Employee"}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-8 space-y-8">
					{errors.global && (
						<div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-in fade-in zoom-in-95">
							{errors.global[0]}
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
						{/* Name */}
						<div className="space-y-2">
							<label
								htmlFor="name"
								className="text-sm font-semibold text-slate-400 flex items-center gap-2"
							>
								<User className="h-4 w-4" /> Full Name
							</label>
							<input
								id="name"
								name="name"
								type="text"
								placeholder="John Doe"
								value={formData.name}
								onChange={handleChange}
								required
								className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
							/>
							{errors.name && (
								<p className="text-xs text-red-400">{errors.name[0]}</p>
							)}
						</div>

						{/* Employee Number */}
						<div className="space-y-2">
							<label
								htmlFor="employeeNumber"
								className="text-sm font-semibold text-slate-400 flex items-center gap-2"
							>
								<Hash className="h-4 w-4" /> Employee ID
							</label>
							<input
								id="employeeNumber"
								name="employeeNumber"
								type="text"
								placeholder="EMP-001"
								value={formData.employeeNumber}
								onChange={handleChange}
								required
								className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
							/>
							{errors.employeeNumber && (
								<p className="text-xs text-red-400">
									{errors.employeeNumber[0]}
								</p>
							)}
						</div>

						{/* Email */}
						<div className="space-y-2">
							<label
								htmlFor="email"
								className="text-sm font-semibold text-slate-400 flex items-center gap-2"
							>
								<Mail className="h-4 w-4" /> Email Address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								placeholder="john@example.com"
								value={formData.email || ""}
								onChange={handleChange}
								className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
							/>
							{errors.email && (
								<p className="text-xs text-red-400">{errors.email[0]}</p>
							)}
						</div>

						{/* Site */}
						<div className="space-y-2">
							<label
								htmlFor="siteId"
								className="text-sm font-semibold text-slate-400 flex items-center gap-2"
							>
								<MapPin className="h-4 w-4" /> Operations Site
							</label>
							<select
								id="siteId"
								name="siteId"
								value={formData.siteId}
								onChange={handleChange}
								required
								className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
							>
								<option value="">Select a site...</option>
								{metadata.sites.map((site) => (
									<option key={site.id} value={site.id}>
										{site.name} ({site.code})
									</option>
								))}
							</select>
							{errors.siteId && (
								<p className="text-xs text-red-400">{errors.siteId[0]}</p>
							)}
						</div>

						{/* Department */}
						<div className="space-y-2">
							<label
								htmlFor="departmentId"
								className="text-sm font-semibold text-slate-400 flex items-center gap-2"
							>
								<Building2 className="h-4 w-4" /> Department
							</label>
							<select
								id="departmentId"
								name="departmentId"
								value={formData.departmentId || ""}
								onChange={handleChange}
								className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
							>
								<option value="">No Department</option>
								{metadata.departments.map((dept) => (
									<option key={dept.id} value={dept.id}>
										{dept.name}
									</option>
								))}
							</select>
						</div>

						{/* Role */}
						<div className="space-y-2">
							<label
								htmlFor="roleId"
								className="text-sm font-semibold text-slate-400 flex items-center gap-2"
							>
								<Briefcase className="h-4 w-4" /> Job Role
							</label>
							<select
								id="roleId"
								name="roleId"
								value={formData.roleId || ""}
								onChange={handleChange}
								className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
							>
								<option value="">No Role</option>
								{metadata.roles.map((role) => (
									<option key={role.id} value={role.id}>
										{role.name}
									</option>
								))}
							</select>
						</div>

						{/* Photo Upload */}
						<div className="space-y-2">
							<label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
								<ImageIcon className="h-4 w-4" /> Profile Photo
							</label>

							{formData.photoUrl ? (
								<div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-slate-900/50">
									<div className="relative h-16 w-16 rounded-full overflow-hidden border border-white/20">
										<img
											src={formData.photoUrl}
											alt="Preview"
											className="h-full w-full object-cover"
										/>
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium text-white">
											Current Photo
										</p>
										<button
											type="button"
											onClick={() =>
												setFormData((p) => ({ ...p, photoUrl: "" }))
											}
											className="text-xs text-red-400 hover:text-red-300 transition-colors"
										>
											Remove Photo
										</button>
									</div>
								</div>
							) : (
								<FileUpload
									accept="image/*"
									label="Upload Profile Photo"
									onUploadComplete={async (url, key, fileData) => {
										setFormData((p) => ({ ...p, photoUrl: url }));
										// Optional: Record in attachments table for audit
										await recordAttachment({
											name: fileData.name,
											key,
											url,
											mimeType: fileData.type,
											size: fileData.size,
											userId: performerId,
										});
									}}
								/>
							)}
							{errors.photoUrl && (
								<p className="text-xs text-red-400">{errors.photoUrl[0]}</p>
							)}
						</div>

						{/* Status */}
						<div className="space-y-2">
							<label
								htmlFor="status"
								className="text-sm font-semibold text-slate-400 flex items-center gap-2"
							>
								<Activity className="h-4 w-4" /> Employment Status
							</label>
							<select
								id="status"
								name="status"
								value={formData.status}
								onChange={handleChange}
								required
								className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none"
							>
								<option value="active">Active</option>
								<option value="terminated">Terminated</option>
								<option value="leave">Leave of Absence</option>
							</select>
						</div>
					</div>
				</CardContent>
				<CardFooter className="bg-slate-950 p-8 border-t border-white/5 flex gap-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.back()}
						className="h-12 px-8 rounded-xl border-white/10 text-slate-300 hover:bg-white/5 transition-all flex items-center gap-2"
					>
						<X className="h-4 w-4" /> Cancel
					</Button>
					<Button
						type="submit"
						disabled={isPending}
						className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2 ml-auto"
					>
						{isPending ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin" /> Saving...
							</>
						) : (
							<>
								<Save className="h-4 w-4" />{" "}
								{initialData ? "Update Employee" : "Register Employee"}
							</>
						)}
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
}
