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

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
		<form onSubmit={handleSubmit} className="max-w-3xl mx-auto py-4">
			<Card className="shadow-sm border">
				<CardHeader className="bg-muted/30 border-b">
					<CardTitle className="flex items-center gap-2 text-xl font-bold">
						<User className="h-5 w-5 text-primary" />
						{initialData ? "Edit Employee" : "Register New Employee"}
					</CardTitle>
				</CardHeader>
				<CardContent className="p-6 space-y-6">
					{errors.global && (
						<div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in zoom-in-95">
							{errors.global[0]}
						</div>
					)}

					<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
						{/* Name */}
						<div className="space-y-1.5">
							<Label
								htmlFor="name"
								className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"
							>
								<User className="h-3 w-3" /> Full Name
							</Label>
							<Input
								id="name"
								name="name"
								type="text"
								placeholder="John Doe"
								value={formData.name}
								onChange={handleChange}
								required
								className="h-10 border-muted-foreground/20 focus-visible:ring-primary/20"
							/>
							{errors.name && (
								<p className="text-xs text-destructive font-medium">{errors.name[0]}</p>
							)}
						</div>

						{/* Employee Number */}
						<div className="space-y-1.5">
							<Label
								htmlFor="employeeNumber"
								className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"
							>
								<Hash className="h-3 w-3" /> Employee ID
							</Label>
							<Input
								id="employeeNumber"
								name="employeeNumber"
								type="text"
								placeholder="EMP-001"
								value={formData.employeeNumber}
								onChange={handleChange}
								required
								className="h-10 border-muted-foreground/20 focus-visible:ring-primary/20 font-mono"
							/>
							{errors.employeeNumber && (
								<p className="text-xs text-destructive font-medium">
									{errors.employeeNumber[0]}
								</p>
							)}
						</div>

						{/* Email */}
						<div className="space-y-1.5">
							<Label
								htmlFor="email"
								className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"
							>
								<Mail className="h-3 w-3" /> Email Address
							</Label>
							<Input
								id="email"
								name="email"
								type="email"
								placeholder="john@example.com"
								value={formData.email || ""}
								onChange={handleChange}
								className="h-10 border-muted-foreground/20 focus-visible:ring-primary/20"
							/>
							{errors.email && (
								<p className="text-xs text-destructive font-medium">{errors.email[0]}</p>
							)}
						</div>

						{/* Site */}
						<div className="space-y-1.5">
							<Label
								htmlFor="siteId"
								className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"
							>
								<MapPin className="h-3 w-3" /> Operations Site
							</Label>
							<div className="relative">
								<select
									id="siteId"
									name="siteId"
									value={formData.siteId}
									onChange={handleChange}
									required
									className="flex h-10 w-full rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22rgba(0,0,0,0.5)%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
								>
									<option value="">Select a site...</option>
									{metadata.sites.map((site) => (
										<option key={site.id} value={site.id}>
											{site.name} ({site.code})
										</option>
									))}
								</select>
							</div>
							{errors.siteId && (
								<p className="text-xs text-destructive font-medium">{errors.siteId[0]}</p>
							)}
						</div>

						{/* Department */}
						<div className="space-y-1.5">
							<Label
								htmlFor="departmentId"
								className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"
							>
								<Building2 className="h-3 w-3" /> Department
							</Label>
							<select
								id="departmentId"
								name="departmentId"
								value={formData.departmentId || ""}
								onChange={handleChange}
								className="flex h-10 w-full rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22rgba(0,0,0,0.5)%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
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
						<div className="space-y-1.5">
							<Label
								htmlFor="roleId"
								className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"
							>
								<Briefcase className="h-3 w-3" /> Job Role
							</Label>
							<select
								id="roleId"
								name="roleId"
								value={formData.roleId || ""}
								onChange={handleChange}
								className="flex h-10 w-full rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22rgba(0,0,0,0.5)%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
							>
								<option value="">No Role</option>
								{metadata.roles.map((role) => (
									<option key={role.id} value={role.id}>
										{role.name}
									</option>
								))}
							</select>
						</div>

						{/* Profile Photo */}
						<div className="space-y-1.5 md:col-span-2">
							<Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
								<ImageIcon className="h-3 w-3" /> Profile Photo
							</Label>

							{formData.photoUrl ? (
								<div className="flex items-center gap-4 p-3 rounded-md border bg-muted/10">
									<div className="relative h-12 w-12 rounded-full overflow-hidden border">
										<img
											src={formData.photoUrl}
											alt="Preview"
											className="h-full w-full object-cover"
										/>
									</div>
									<div className="flex-1">
										<p className="text-xs font-bold text-foreground">
											Photo Uploaded
										</p>
										<button
											type="button"
											onClick={() =>
												setFormData((p) => ({ ...p, photoUrl: "" }))
											}
											className="text-[10px] font-bold uppercase tracking-wider text-destructive hover:underline"
										>
											Remove
										</button>
									</div>
								</div>
							) : (
								<FileUpload
									accept="image/*"
									label="Upload Photo"
									onUploadComplete={async (url, key, fileData) => {
										setFormData((p) => ({ ...p, photoUrl: url }));
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
						</div>

						{/* Status */}
						<div className="space-y-1.5">
							<Label
								htmlFor="status"
								className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"
							>
								<Activity className="h-3 w-3" /> Employment Status
							</Label>
							<select
								id="status"
								name="status"
								value={formData.status}
								onChange={handleChange}
								required
								className="flex h-10 w-full rounded-md border border-muted-foreground/20 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22rgba(0,0,0,0.5)%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
							>
								<option value="active">Active</option>
								<option value="terminated">Terminated</option>
								<option value="leave">Leave of Absence</option>
							</select>
						</div>
					</div>
				</CardContent>
				<CardFooter className="bg-muted/30 p-6 border-t flex justify-end gap-3">
					<Button
						type="button"
						variant="outline"
						onClick={() => router.back()}
						className="h-10 px-6 font-bold text-xs uppercase tracking-widest"
					>
						Cancel
					</Button>
					<Button
						type="submit"
						disabled={isPending}
						className="h-10 px-6 font-bold text-xs uppercase tracking-widest bg-primary"
					>
						{isPending ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...
							</>
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />{" "}
								{initialData ? "Update Employee" : "Register Employee"}
							</>
						)}
					</Button>
				</CardFooter>
			</Card>
		</form>
	);
}
