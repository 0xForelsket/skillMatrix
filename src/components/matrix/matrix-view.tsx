"use client";

import { LayoutGrid, List } from "lucide-react";
import { useState } from "react";
import type { MatrixData } from "@/lib/matrix";
import { cn } from "@/lib/utils";
import { MatrixCards } from "./matrix-cards";
import { MatrixGrid } from "./matrix-grid";

interface MatrixViewProps {
	data: MatrixData;
}

export function MatrixView({ data }: MatrixViewProps) {
	const [view, setView] = useState<"grid" | "cards">("grid");

	return (
		<div className="flex flex-col h-full gap-4">
			<div className="flex justify-end gap-2">
				<div className="flex bg-slate-900 p-1 rounded-lg border border-white/10">
					<button
						type="button"
						onClick={() => setView("grid")}
						className={cn(
							"p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
							view === "grid"
								? "bg-indigo-600 text-white shadow-lg"
								: "text-slate-400 hover:text-white",
						)}
					>
						<LayoutGrid className="h-4 w-4" />
						<span className="hidden sm:inline">Grid View</span>
					</button>
					<button
						type="button"
						onClick={() => setView("cards")}
						className={cn(
							"p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
							view === "cards"
								? "bg-indigo-600 text-white shadow-lg"
								: "text-slate-400 hover:text-white",
						)}
					>
						<List className="h-4 w-4" /> {/* Or a Card icon if available */}
						<span className="hidden sm:inline">Card View</span>
					</button>
				</div>
			</div>

			<div className="flex-1 min-h-0">
				{view === "grid" ? (
					<MatrixGrid data={data} />
				) : (
					<MatrixCards data={data} />
				)}
			</div>
		</div>
	);
}
