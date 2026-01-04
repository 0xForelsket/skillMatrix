"use client";

import {
	AlertTriangle,
	BadgeCheck,
	ChevronRight,
	Search,
	XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MatrixCell, MatrixData } from "@/lib/matrix";
import { cn } from "@/lib/utils";

interface MatrixCardsProps {
	data: MatrixData;
}

export function MatrixCards({ data }: MatrixCardsProps) {
	const { employees, skills, cells } = data;
	const [search, setSearch] = useState("");

	const filteredEmployees = useMemo(() => {
		if (!search) return employees;
		const lower = search.toLowerCase();
		return employees.filter(
			(e) =>
				e.name.toLowerCase().includes(lower) ||
				e.roleName?.toLowerCase().includes(lower) ||
				e.siteName.toLowerCase().includes(lower),
		);
	}, [employees, search]);

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
					<Input
						placeholder="Filter employees..."
						value={search}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setSearch(e.target.value)
						}
						className="pl-9 bg-slate-900 border-white/10"
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{filteredEmployees.map((emp) => {
					const empCells = cells[emp.id] || {};
					const skillList = skills.map((s) => empCells[s.id]).filter(Boolean);

					// Stats
					const missing = skillList.filter(
						(c) => c.status === "missing" || c.status === "expired",
					).length;
					const gaps = skillList.filter((c) => c.status === "gap").length;
					const compliant = skillList.filter(
						(c) => c.status === "compliant",
					).length;
					const totalReq = missing + gaps + compliant; // Roughly total required
					const rate =
						totalReq > 0 ? Math.round((compliant / totalReq) * 100) : 100;

					return (
						<Dialog key={emp.id}>
							<DialogTrigger asChild>
								<button
									type="button"
									className="text-left group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950 p-4 hover:bg-slate-900/50 transition-all hover:border-indigo-500/30"
								>
									<div className="flex justify-between items-start w-full">
										<div>
											<div className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
												{emp.name}
											</div>
											<div className="text-xs text-slate-500">
												{emp.roleName || "No Role"} • {emp.siteName}
											</div>
										</div>
										<div
											className={cn(
												"text-xs font-bold px-2 py-1 rounded",
												rate >= 100
													? "bg-emerald-500/20 text-emerald-400"
													: rate >= 80
														? "bg-amber-500/20 text-amber-400"
														: "bg-red-500/20 text-red-400",
											)}
										>
											{rate}%
										</div>
									</div>

									<div className="grid grid-cols-3 gap-2 w-full text-center">
										<div className="bg-emerald-500/5 rounded p-1 border border-emerald-500/10">
											<div className="text-lg font-bold text-emerald-500">
												{compliant}
											</div>
											<div className="text-[10px] uppercase text-slate-500 tracking-wider">
												OK
											</div>
										</div>
										<div className="bg-amber-500/5 rounded p-1 border border-amber-500/10">
											<div className="text-lg font-bold text-amber-500">
												{gaps}
											</div>
											<div className="text-[10px] uppercase text-slate-500 tracking-wider">
												Gap
											</div>
										</div>
										<div className="bg-red-500/5 rounded p-1 border border-red-500/10">
											<div className="text-lg font-bold text-red-500">
												{missing}
											</div>
											<div className="text-[10px] uppercase text-slate-500 tracking-wider">
												Miss
											</div>
										</div>
									</div>

									<div className="w-full flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/5">
										<span>View Details</span>
										<ChevronRight className="h-4 w-4" />
									</div>
								</button>
							</DialogTrigger>
							<DialogContent className="max-w-md bg-slate-950 border-white/10 text-white max-h-[85vh] overflow-hidden flex flex-col p-0">
								<DialogHeader className="p-6 border-b border-white/10">
									<DialogTitle>{emp.name}</DialogTitle>
									<div className="text-sm text-slate-400">
										{emp.roleName} • {emp.employeeNumber}
									</div>
								</DialogHeader>
								<div className="overflow-y-auto p-6 space-y-4">
									<h3 className="font-medium text-sm text-slate-400 uppercase tracking-wider">
										Skill Compliance
									</h3>
									<div className="space-y-2">
										{skills.map((skill) => {
											const cell = empCells[skill.id];
											if (
												!cell ||
												cell.status === "none" ||
												cell.status === "extra"
											)
												return null;

											return (
												<div
													key={skill.id}
													className="flex justify-between items-center p-3 rounded-lg border border-white/5 bg-white/5"
												>
													<div className="flex-1 min-w-0 pr-4">
														<div className="font-medium truncate">
															{skill.name}
														</div>
														<div className="text-xs text-slate-500">
															{skill.code}
														</div>
													</div>
													<div className="text-right shrink-0">
														<SkillStatusBadge cell={cell} />
														<div className="text-xs text-slate-500 mt-1">
															Lvl {cell.achievedLevel} / {cell.requiredLevel}
														</div>
													</div>
												</div>
											);
										})}
										{skills.every(
											(s) =>
												!empCells[s.id] || empCells[s.id].status === "none",
										) && (
											<div className="text-center text-slate-500 py-8">
												No specific requirements found.
											</div>
										)}
									</div>
								</div>
							</DialogContent>
						</Dialog>
					);
				})}
			</div>
		</div>
	);
}

function SkillStatusBadge({ cell }: { cell: MatrixCell }) {
	switch (cell.status) {
		case "compliant":
			return (
				<div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
					<BadgeCheck className="h-3 w-3" /> OK
				</div>
			);
		case "gap":
			return (
				<div className="text-xs font-bold text-amber-400 flex items-center gap-1">
					<AlertTriangle className="h-3 w-3" /> Gap
				</div>
			);
		case "missing":
			return (
				<div className="text-xs font-bold text-red-400 flex items-center gap-1">
					<XCircle className="h-3 w-3" /> Missing
				</div>
			);
		case "expired":
			return (
				<div className="text-xs font-bold text-red-500 flex items-center gap-1">
					<AlertTriangle className="h-3 w-3" /> Expired
				</div>
			);
		default:
			return <div className="text-xs text-slate-500">-</div>;
	}
}
