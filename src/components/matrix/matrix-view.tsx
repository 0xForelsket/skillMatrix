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
				<div className="flex bg-muted/40 p-0.5 rounded-md border shadow-sm">
					<button
						type="button"
						onClick={() => setView("grid")}
						className={cn(
							"px-3 py-1 rounded-[4px] transition-all flex items-center gap-2 text-xs font-bold",
							view === "grid"
								? "bg-background text-foreground shadow-sm ring-1 ring-black/5"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<LayoutGrid className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Grid</span>
					</button>
					<button
						type="button"
						onClick={() => setView("cards")}
						className={cn(
							"px-3 py-1 rounded-[4px] transition-all flex items-center gap-2 text-xs font-bold",
							view === "cards"
								? "bg-background text-foreground shadow-sm ring-1 ring-black/5"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						<List className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Cards</span>
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
