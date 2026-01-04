import {
	Briefcase,
	Building2,
	MapPin,
	MoreHorizontal,
	Plus,
	Search,
} from "lucide-react";
import NextImage from "next/image";
import Link from "next/link";
import { listEmployees } from "@/actions/employees";
import { Button } from "@/components/ui/button";

export default async function EmployeesPage() {
	const employeesResult = await listEmployees();

	if (!employeesResult.success) {
		return (
			<div className="p-8 text-center text-destructive">
				Failed to load employees: {employeesResult.error}
			</div>
		);
	}

	const employees = employeesResult.data || [];

	return (
		<div className="flex flex-col gap-6 p-6 md:p-8">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h2 className="text-2xl font-bold tracking-tight">Employees</h2>
					<p className="text-muted-foreground">
						Manage workforce and track skill compliance.
					</p>
				</div>
				<Button asChild>
					<Link href="/admin/employees/new">
						<Plus className="mr-2 h-4 w-4" />
						New Employee
					</Link>
				</Button>
			</div>

			{/* Filters Bar */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<input
						type="search"
						placeholder="Search employees..."
						className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					/>
				</div>
			</div>

			<div className="rounded-md border bg-card text-card-foreground shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full caption-bottom text-sm">
						<thead className="[&_tr]:border-b">
							<tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted text-left">
								<th className="h-12 px-4 align-middle font-medium text-muted-foreground">
									Employee
								</th>
								<th className="h-12 px-4 align-middle font-medium text-muted-foreground">
									Site
								</th>
								<th className="h-12 px-4 align-middle font-medium text-muted-foreground">
									Function
								</th>
								<th className="h-12 px-4 align-middle font-medium text-muted-foreground">
									Status
								</th>
								<th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
							{employees.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="p-4 text-center text-muted-foreground"
									>
										No employees found.
									</td>
								</tr>
							) : (
								employees.map((emp) => (
									<tr
										key={emp.id}
										className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
									>
										<td className="p-4 align-middle">
											<Link
												href={`/admin/employees/${emp.id}`}
												className="flex items-center gap-3 group"
											>
												<div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80 text-secondary-foreground overflow-hidden">
													{emp.photoUrl ? (
														<NextImage
															src={emp.photoUrl}
															alt={emp.name}
															fill
															className="object-cover"
														/>
													) : (
														<span className="text-sm font-medium">
															{emp.name.substring(0, 2).toUpperCase()}
														</span>
													)}
												</div>
												<div>
													<div className="font-medium text-sm group-hover:text-indigo-600 transition-colors">
														{emp.name}
													</div>
													<div className="text-xs text-muted-foreground">
														{emp.employeeNumber}
													</div>
												</div>
											</Link>
										</td>
										<td className="p-4 align-middle">
											<div className="flex items-center gap-2 text-muted-foreground">
												<MapPin className="h-3 w-3" />
												<span>{emp.site.code}</span>
											</div>
										</td>
										<td className="p-4 align-middle">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<Building2 className="h-3 w-3 text-muted-foreground" />
													<span>{emp.department?.name || "No Dept"}</span>
												</div>
												<div className="flex items-center gap-2 text-xs text-muted-foreground">
													<Briefcase className="h-3 w-3" />
													<span>{emp.role?.name || "No Job Role"}</span>
												</div>
											</div>
										</td>
										<td className="p-4 align-middle">
											<span
												className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
													emp.status === "active"
														? "bg-green-50 text-green-700 ring-green-600/20"
														: emp.status === "terminated"
															? "bg-red-50 text-red-700 ring-red-600/20"
															: "bg-gray-50 text-gray-600 ring-gray-500/10"
												}`}
											>
												{emp.status}
											</span>
										</td>
										<td className="p-4 align-middle text-right">
											<div className="flex justify-end gap-2">
												<Button variant="ghost" size="sm" asChild>
													<Link href={`/admin/employees/${emp.id}/edit`}>
														Edit
													</Link>
												</Button>
												<Button variant="ghost" size="icon">
													<MoreHorizontal className="h-4 w-4" />
												</Button>
											</div>
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
