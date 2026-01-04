"use client";

import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ComplianceGaugeMini } from "@/components/ui/compliance-gauge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	StatusBadge,
	StatusDot,
	LevelComparison,
	type ComplianceStatus,
} from "@/components/ui/status-indicator";
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
			{/* Search */}
			<div className="flex gap-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Filter employees..."
						value={search}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
							setSearch(e.target.value)
						}
						className="pl-10"
					/>
				</div>
			</div>

			{/* Cards Grid */}
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
					const totalReq = missing + gaps + compliant;
					const rate =
						totalReq > 0 ? Math.round((compliant / totalReq) * 100) : 100;

					return (
						<Dialog key={emp.id}>
							<DialogTrigger asChild>
								<Card
									variant="interactive"
									className="text-left group relative flex flex-col gap-4 p-4 cursor-pointer"
								>
									{/* Header */}
									<div className="flex justify-between items-start w-full">
										<div className="min-w-0 flex-1">
											<div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
												{emp.name}
											</div>
											<div className="text-xs text-muted-foreground">
												{emp.roleName || "No Role"} • {emp.siteName}
											</div>
										</div>
										<ComplianceGaugeMini value={rate} size={44} />
									</div>

									{/* Stats */}
									<div className="grid grid-cols-3 gap-2 w-full text-center">
										<div className="bg-status-compliant/10 rounded-lg p-2 border border-status-compliant/20">
											<div className="text-lg font-bold text-status-compliant tabular-nums">
												{compliant}
											</div>
											<div className="text-label">OK</div>
										</div>
										<div className="bg-status-gap/10 rounded-lg p-2 border border-status-gap/20">
											<div className="text-lg font-bold text-status-gap tabular-nums">
												{gaps}
											</div>
											<div className="text-label">Gap</div>
										</div>
										<div className="bg-status-missing/10 rounded-lg p-2 border border-status-missing/20">
											<div className="text-lg font-bold text-status-missing tabular-nums">
												{missing}
											</div>
											<div className="text-label">Miss</div>
										</div>
									</div>

									{/* Footer */}
									<div className="w-full flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
										<span>View Details</span>
										<ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
									</div>
								</Card>
							</DialogTrigger>

							<DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0">
								<DialogHeader className="p-6 border-b">
									<DialogTitle className="flex items-center gap-3">
										<span>{emp.name}</span>
										<ComplianceGaugeMini value={rate} size={32} />
									</DialogTitle>
									<div className="text-sm text-muted-foreground">
										{emp.roleName} • {emp.employeeNumber}
									</div>
								</DialogHeader>

								<div className="overflow-y-auto p-6 space-y-4">
									<h3 className="text-label">Skill Compliance</h3>
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
													className="flex justify-between items-center p-3 rounded-lg border bg-muted/30"
												>
													<div className="flex-1 min-w-0 pr-4">
														<div className="font-medium truncate text-sm">
															{skill.name}
														</div>
														<div className="text-code text-xs text-muted-foreground">
															{skill.code}
														</div>
													</div>
													<div className="flex items-center gap-3 shrink-0">
														<LevelComparison
															currentLevel={
																cell.achievedLevel > 0
																	? cell.achievedLevel
																	: undefined
															}
															requiredLevel={
																cell.requiredLevel > 0
																	? cell.requiredLevel
																	: undefined
															}
														/>
														<StatusDot
															status={cell.status as ComplianceStatus}
															size="md"
														/>
													</div>
												</div>
											);
										})}

										{skills.every(
											(s) =>
												!empCells[s.id] || empCells[s.id].status === "none",
										) && (
											<div className="text-center text-muted-foreground py-8">
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

			{/* Empty State */}
			{filteredEmployees.length === 0 && (
				<div className="text-center py-12 text-muted-foreground">
					No employees match your search.
				</div>
			)}
		</div>
	);
}
