"use client";

import {
	AlertTriangle,
	Check,
	Clock,
	Diamond,
	Minus,
	X,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { StatusDot, LevelComparison } from "@/components/ui/status-indicator";
import type { MatrixCell, MatrixData } from "@/lib/matrix";
import { cn } from "@/lib/utils";

interface MatrixGridProps {
	data: MatrixData;
}

export function MatrixGrid({ data }: MatrixGridProps) {
	const { employees, skills, cells } = data;

	return (
		<div className="w-full overflow-hidden border rounded-xl bg-card text-card-foreground shadow-sm">
			<div className="relative overflow-x-auto max-h-[80vh]">
				<table className="w-full text-left text-sm whitespace-nowrap border-collapse">
					<thead className="bg-muted/80 border-b sticky top-0 z-50">
						<tr>
							<th
								scope="col"
								className="sticky left-0 z-50 bg-muted p-4 font-semibold border-r min-w-[220px]"
							>
								<span className="text-label">Employee</span>
							</th>
							{skills.map((skill) => (
								<th
									key={skill.id}
									scope="col"
									className="p-3 font-medium text-muted-foreground min-w-[100px] text-center border-r bg-muted/80"
								>
									<div className="flex flex-col items-center gap-0.5">
										<span className="text-code text-[10px] text-muted-foreground/60">
											{skill.code}
										</span>
										<span
											className="truncate max-w-[90px] text-xs font-medium"
											title={skill.name}
										>
											{skill.name}
										</span>
									</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-border/50">
						{employees.map((emp) => (
							<tr
								key={emp.id}
								className="hover:bg-muted/40 transition-colors group"
							>
								<td className="sticky left-0 z-40 bg-card group-hover:bg-muted/40 p-4 font-medium border-r transition-colors">
									<div className="flex flex-col gap-0.5">
										<span className="text-foreground font-semibold">
											{emp.name}
										</span>
										<span className="text-code text-xs text-muted-foreground">
											{emp.employeeNumber}
										</span>
										<div className="flex gap-2 text-label mt-1">
											<span>{emp.siteName}</span>
											{emp.roleName && (
												<>
													<span className="text-muted-foreground/30">•</span>
													<span>{emp.roleName}</span>
												</>
											)}
										</div>
									</div>
								</td>
								{skills.map((skill) => {
									const cell = cells[emp.id]?.[skill.id];
									return (
										<td
											key={skill.id}
											className="p-1.5 border-r text-center align-middle"
										>
											<CellContent cell={cell} />
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Legend */}
			<div className="p-4 bg-muted/30 border-t flex flex-wrap gap-6 text-label">
				<div className="flex items-center gap-2">
					<StatusDot status="compliant" size="sm" />
					<span>Compliant</span>
				</div>
				<div className="flex items-center gap-2">
					<StatusDot status="gap" size="sm" />
					<span>Skill Gap</span>
				</div>
				<div className="flex items-center gap-2">
					<StatusDot status="missing" size="sm" />
					<span>Missing</span>
				</div>
				<div className="flex items-center gap-2">
					<StatusDot status="expired" size="sm" />
					<span>Expired</span>
				</div>
				<div className="flex items-center gap-2">
					<StatusDot status="extra" size="sm" />
					<span>Extra</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full border border-dashed border-muted-foreground/40" />
					<span>N/A</span>
				</div>
			</div>
		</div>
	);
}

const statusConfig = {
	compliant: {
		bg: "bg-status-compliant/10 hover:bg-status-compliant/20",
		border: "border-status-compliant/30",
		text: "text-status-compliant",
		icon: Check,
	},
	gap: {
		bg: "bg-status-gap/10 hover:bg-status-gap/20",
		border: "border-status-gap/30",
		text: "text-status-gap",
		icon: AlertTriangle,
	},
	missing: {
		bg: "bg-status-missing/10 hover:bg-status-missing/20",
		border: "border-status-missing/30",
		text: "text-status-missing",
		icon: X,
	},
	expired: {
		bg: "bg-status-expired/10 hover:bg-status-expired/20",
		border: "border-status-expired/30",
		text: "text-status-expired",
		icon: Clock,
	},
	extra: {
		bg: "bg-status-extra/10 hover:bg-status-extra/20",
		border: "border-status-extra/30",
		text: "text-status-extra",
		icon: Diamond,
	},
} as const;

function CellContent({ cell }: { cell?: MatrixCell }) {
	if (!cell) return <span className="text-muted-foreground/30">—</span>;

	const { status, requiredLevel, achievedLevel, requirementSources } = cell;

	// Not required / none state
	if (status === "none" || !statusConfig[status as keyof typeof statusConfig]) {
		return (
			<div className="h-12 w-full opacity-30 hover:opacity-60 transition-opacity flex justify-center items-center">
				<Minus className="h-3 w-3 text-muted-foreground" />
			</div>
		);
	}

	const config = statusConfig[status as keyof typeof statusConfig];
	const Icon = config.icon;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={cn(
							"h-12 w-full min-w-[80px] rounded-lg border flex flex-col items-center justify-center cursor-help transition-all duration-200",
							config.bg,
							config.border,
							config.text,
						)}
					>
						<div className="flex items-center gap-1.5">
							<Icon className="h-3.5 w-3.5" />
							<LevelComparison
								currentLevel={achievedLevel > 0 ? achievedLevel : undefined}
								requiredLevel={requiredLevel > 0 ? requiredLevel : undefined}
							/>
						</div>
					</div>
				</TooltipTrigger>
				<TooltipContent
					className="bg-popover text-popover-foreground border shadow-xl p-4 max-w-xs"
					sideOffset={5}
				>
					<div className="space-y-3">
						{/* Status Header */}
						<div className="flex items-center gap-2">
							<StatusDot
								status={status as "compliant" | "gap" | "missing" | "expired" | "extra"}
								size="md"
							/>
							<span className="font-semibold text-sm capitalize">
								{status.replace("_", " ")}
							</span>
						</div>

						{/* Level Details */}
						<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
							<span className="text-muted-foreground">Required Level</span>
							<span className="font-mono font-bold text-foreground">
								{requiredLevel > 0 ? `L${requiredLevel}` : "None"}
							</span>

							<span className="text-muted-foreground">Achieved Level</span>
							<span
								className={cn(
									"font-mono font-bold",
									achievedLevel >= requiredLevel
										? "text-status-compliant"
										: achievedLevel > 0
											? "text-status-gap"
											: "text-muted-foreground",
								)}
							>
								{achievedLevel > 0 ? `L${achievedLevel}` : "None"}
							</span>

							{cell.expiresAt && (
								<>
									<span className="text-muted-foreground">Expires</span>
									<span
										className={cn(
											"font-mono font-bold",
											status === "expired"
												? "text-status-expired"
												: "text-foreground",
										)}
									>
										{new Date(cell.expiresAt).toLocaleDateString()}
									</span>
								</>
							)}
						</div>

						{/* Requirement Sources */}
						{requirementSources.length > 0 && (
							<div className="pt-2 border-t">
								<span className="text-label">Required By</span>
								<ul className="mt-1.5 space-y-1">
									{requirementSources.map((src, i) => (
										<li
											// biome-ignore lint/suspicious/noArrayIndexKey: List is static
											key={`${src}-${i}`}
											className="text-xs text-foreground font-medium flex items-center gap-2"
										>
											<div className="w-1 h-1 rounded-full bg-primary" />
											{src}
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
