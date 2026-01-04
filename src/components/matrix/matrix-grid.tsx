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
import type { MatrixCell, MatrixData, MatrixStatus } from "@/lib/matrix";
import { cn } from "@/lib/utils";

interface MatrixGridProps {
	data: MatrixData;
}

export function MatrixGrid({ data }: MatrixGridProps) {
	const { employees, skills, cells } = data;

	return (
		<div className="w-full overflow-hidden border border-white/10 rounded-xl bg-slate-950 shadow-2xl">
			<div className="relative overflow-x-auto max-h-[80vh]">
				<table className="w-full text-left text-sm whitespace-nowrap border-collapse">
					<thead className="bg-slate-900 border-b border-white/10 sticky top-0 z-50 shadow-md">
						<tr>
							<th
								scope="col"
								className="sticky left-0 z-50 bg-slate-900 p-4 font-semibold text-white border-r border-white/10 min-w-[200px]"
							>
								Employee
							</th>
							{skills.map((skill) => (
								<th
									key={skill.id}
									scope="col"
									className="p-4 font-medium text-slate-300 min-w-[120px] text-center border-r border-white/5 bg-slate-900"
								>
									<div className="flex flex-col items-center gap-1">
										<span className="text-xs uppercase tracking-wider text-slate-500">
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
					<tbody className="divide-y divide-white/5">
						{employees.map((emp) => (
							<tr key={emp.id} className="hover:bg-white/5 transition-colors">
								<td className="sticky left-0 z-40 bg-slate-950 p-4 font-medium text-white border-r border-white/10 group-hover:bg-slate-900/50">
									<div className="flex flex-col">
										<span>{emp.name}</span>
										<span className="text-xs text-slate-500">
											{emp.employeeNumber}
										</span>
										<div className="flex gap-2 text-xs text-slate-600 mt-1">
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
											className="p-2 border-r border-white/5 text-center align-middle"
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

			<div className="p-4 bg-slate-900 border-t border-white/10 flex gap-6 text-xs text-slate-400">
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50"></div>
					<span>Compliant</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/50"></div>
					<span>Skill Gap / Level Mismatch</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50"></div>
					<span>Missing / Expired</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-3 h-3 rounded border border-white/10 border-dashed"></div>
					<span>Not Required</span>
				</div>
			</div>
		</div>
	);
}

function CellContent({ cell }: { cell?: MatrixCell }) {
	if (!cell) return <span className="text-slate-700">-</span>;

	const { status, requiredLevel, achievedLevel, requirementSources } = cell;

	let bgClass = "";
	let borderClass = "";
	let icon = null;
	let textClass = "";

	switch (status) {
		case "compliant":
			bgClass = "bg-emerald-500/10 hover:bg-emerald-500/20";
			borderClass = "border-emerald-500/30";
			textClass = "text-emerald-400";
			icon = <Check className="h-3.5 w-3.5" />;
			break;
		case "gap":
			bgClass = "bg-yellow-500/10 hover:bg-yellow-500/20";
			borderClass = "border-yellow-500/30";
			textClass = "text-yellow-400";
			icon = <AlertTriangle className="h-3.5 w-3.5" />;
			break;
		case "missing":
			bgClass = "bg-red-500/10 hover:bg-red-500/20";
			borderClass = "border-red-500/30";
			textClass = "text-red-400";
			icon = <X className="h-3.5 w-3.5" />;
			break;
		case "expired":
			bgClass = "bg-red-500/10 hover:bg-red-500/20";
			borderClass = "border-red-500/30";
			textClass = "text-red-400";
			icon = <Clock className="h-3.5 w-3.5" />;
			break;
		case "extra":
			bgClass = "bg-slate-800/50 hover:bg-slate-800";
			borderClass = "border-white/5";
			textClass = "text-slate-400";
			icon = <ShieldCheck className="h-3.5 w-3.5" />;
			break;
		default:
			return (
				<div className="h-full w-full opacity-20 hover:opacity-100 transition-opacity flex justify-center">
					<Minus className="h-3 w-3 text-slate-700" />
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
				<TooltipContent className="bg-slate-950 border border-white/10 p-3 max-w-xs">
					<div className="space-y-2">
						<div className="font-semibold text-white capitalize">
							{status.replace("_", " ")}
						</div>
						<div className="text-xs text-slate-400 grid grid-cols-2 gap-x-4 gap-y-1">
							<span>Required Level:</span>
							<span className="text-white font-mono">
								{requiredLevel || "None"}
							</span>

							<span>Achieved Level:</span>
							<span className="text-white font-mono">
								{achievedLevel || "None"}
							</span>

							{cell.expiresAt && (
								<>
									<span>Expires:</span>
									<span
										className={cn(
											"font-mono",
											status === "expired" ? "text-red-400" : "text-white",
										)}
									>
										{new Date(cell.expiresAt).toLocaleDateString()}
									</span>
								</>
							)}
						</div>
						{requirementSources.length > 0 && (
							<div className="pt-2 border-t border-white/10">
								<span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
									Required By:
								</span>
								<ul className="mt-1 space-y-1">
									{requirementSources.map((src, i) => (
										<li key={`${src}-${i}`} className="text-xs text-slate-300">
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
