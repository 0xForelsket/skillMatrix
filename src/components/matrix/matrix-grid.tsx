"use client";

import {
	AlertTriangle,
	Check,
	Clock,
	Minus,
	ShieldCheck,
	X,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MatrixCell, MatrixData } from "@/lib/matrix";
import { cn } from "@/lib/utils";

interface MatrixGridProps {
	data: MatrixData;
}

export function MatrixGrid({ data }: MatrixGridProps) {
	const { employees, skills, cells } = data;

	return (
		<div className="w-full overflow-hidden border rounded-md bg-card text-card-foreground shadow-sm">
			<div className="relative overflow-x-auto max-h-[80vh]">
				<table className="w-full text-left text-sm whitespace-nowrap border-collapse">
					<thead className="bg-muted/50 border-b sticky top-0 z-50 shadow-sm">
						<tr>
							<th
								scope="col"
								className="sticky left-0 z-50 bg-muted/95 backdrop-blur-sm p-4 font-semibold border-r min-w-[200px]"
							>
								Employee
							</th>
							{skills.map((skill) => (
								<th
									key={skill.id}
									scope="col"
									className="p-4 font-medium text-muted-foreground min-w-[120px] text-center border-r bg-muted/50"
								>
									<div className="flex flex-col items-center gap-1">
										<span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
											{skill.code}
										</span>
										<span className="truncate max-w-[120px]" title={skill.name}>
											{skill.name}
										</span>
									</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y">
						{employees.map((emp) => (
							<tr key={emp.id} className="hover:bg-muted/30 transition-colors">
								<td className="sticky left-0 z-40 bg-card p-4 font-medium border-r transition-colors group-hover:bg-muted/40">
									<div className="flex flex-col">
										<span className="text-foreground">{emp.name}</span>
										<span className="text-xs text-muted-foreground">
											{emp.employeeNumber}
										</span>
										<div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mt-1">
											<span>{emp.siteName}</span>
											{emp.roleName && <span>• {emp.roleName}</span>}
										</div>
									</div>
								</td>
								{skills.map((skill) => {
									const cell = cells[emp.id]?.[skill.id];
									return (
										<td
											key={skill.id}
											className="p-2 border-r text-center align-middle"
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

			<div className="p-4 bg-muted/20 border-t flex flex-wrap gap-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/50"></div>
					<span>Compliant</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-sm bg-yellow-500/20 border border-yellow-500/50"></div>
					<span>Skill Gap</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/50"></div>
					<span>Missing / Expired</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded-sm border border-dashed border-muted-foreground/30"></div>
					<span>Not Required</span>
				</div>
			</div>
		</div>
	);
}

function CellContent({ cell }: { cell?: MatrixCell }) {
	if (!cell) return <span className="text-muted-foreground/30">-</span>;

	const { status, requiredLevel, achievedLevel, requirementSources } = cell;

	let bgClass = "";
	let borderClass = "";
	let icon = null;
	let textClass = "";

	switch (status) {
		case "compliant":
			bgClass = "bg-emerald-500/10 hover:bg-emerald-500/20";
			borderClass = "border-emerald-500/20";
			textClass = "text-emerald-600 dark:text-emerald-400";
			icon = <Check className="h-3.5 w-3.5" />;
			break;
		case "gap":
			bgClass = "bg-yellow-500/10 hover:bg-yellow-500/20";
			borderClass = "border-yellow-500/20";
			textClass = "text-yellow-600 dark:text-yellow-400";
			icon = <AlertTriangle className="h-3.5 w-3.5" />;
			break;
		case "missing":
			bgClass = "bg-red-500/10 hover:bg-red-500/20";
			borderClass = "border-red-500/20";
			textClass = "text-red-600 dark:text-red-400";
			icon = <X className="h-3.5 w-3.5" />;
			break;
		case "expired":
			bgClass = "bg-red-500/10 hover:bg-red-500/20";
			borderClass = "border-red-500/20";
			textClass = "text-red-600 dark:text-red-400";
			icon = <Clock className="h-3.5 w-3.5" />;
			break;
		case "extra":
			bgClass = "bg-muted/50 hover:bg-muted";
			borderClass = "border-border";
			textClass = "text-muted-foreground";
			icon = <ShieldCheck className="h-3.5 w-3.5" />;
			break;
		default:
			return (
				<div className="h-full w-full opacity-20 hover:opacity-100 transition-opacity flex justify-center">
					<Minus className="h-3 w-3 text-muted-foreground" />
				</div>
			);
	}

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={cn(
							"h-12 w-full rounded-md border flex flex-col items-center justify-center cursor-help transition-all duration-200",
							bgClass,
							borderClass,
							textClass,
						)}
					>
						<div className="flex items-center gap-1">
							{icon}
							<span className="font-bold">
								{achievedLevel > 0 ? achievedLevel : "-"}
							</span>
							{requiredLevel > 0 && (
								<span className="text-[10px] opacity-70">
									/ {requiredLevel}
								</span>
							)}
						</div>
					</div>
				</TooltipTrigger>
				<TooltipContent className="bg-popover text-popover-foreground border shadow-xl p-3 max-w-xs">
					<div className="space-y-2">
						<div className="font-bold text-sm capitalize">
							{status.replace("_", " ")}
						</div>
						<div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
							<span>Required Level:</span>
							<span className="text-foreground font-mono font-bold">
								{requiredLevel || "None"}
							</span>

							<span>Achieved Level:</span>
							<span className="text-foreground font-mono font-bold">
								{achievedLevel || "None"}
							</span>

							{cell.expiresAt && (
								<>
									<span>Expires:</span>
									<span
										className={cn(
											"font-mono font-bold",
											status === "expired" ? "text-red-500" : "text-foreground",
										)}
									>
										{new Date(cell.expiresAt).toLocaleDateString()}
									</span>
								</>
							)}
						</div>
						{requirementSources.length > 0 && (
							<div className="pt-2 border-t mt-2">
								<span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
									Required By:
								</span>
								<ul className="mt-1 space-y-1">
									{requirementSources.map((src, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: List is static
										<li key={`${src}-${i}`} className="text-xs text-foreground font-medium flex items-center gap-1.5">
											<div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
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
