"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteRequirement } from "@/actions/requirements";
import { Button } from "@/components/ui/button";

export function DeleteRequirementButton({ id }: { id: string }) {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();

	const handleDelete = () => {
		if (
			!confirm(
				"Are you sure you want to remove this requirement? This will affect compliance calculations.",
			)
		)
			return;

		startTransition(async () => {
			await deleteRequirement(id);
			router.refresh();
		});
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={handleDelete}
			disabled={isPending}
			className="text-slate-500 hover:text-red-400 hover:bg-red-950/30"
		>
			{isPending ? (
				<Loader2 className="h-4 w-4 animate-spin" />
			) : (
				<Trash2 className="h-4 w-4" />
			)}
		</Button>
	);
}
