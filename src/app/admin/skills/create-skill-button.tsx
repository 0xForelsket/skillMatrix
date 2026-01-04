"use client";

import { Loader2, Plus, X } from "lucide-react";
import { useActionState, useState } from "react";
import { createSkill } from "@/actions/skills";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";

// We utilize the simple Modal pattern from the User page again.
// In a real app we'd extract this to a shared component.

function Modal({
	isOpen,
	onClose,
	children,
}: {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
}) {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
			<div className="w-full max-w-md bg-card rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
				<div className="flex justify-end p-2">
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="px-6 pb-6">{children}</div>
			</div>
		</div>
	);
}

const initialState = {
	success: false,
	error: "",
	data: null as any,
};

export function CreateSkillButton() {
	const { user } = useCurrentUser();
	const [isOpen, setIsOpen] = useState(false);
	const [state, formAction, isPending] = useActionState(
		async (_prevState: any, formData: FormData) => {
			const rawData = Object.fromEntries(formData);
			const result = await createSkill({
				name: rawData.name as string,
				code: rawData.code as string,
				description: rawData.description as string,
				validityMonths: rawData.validityMonths
					? Number(rawData.validityMonths)
					: null,
				maxLevel: rawData.maxLevel ? Number(rawData.maxLevel) : 1,
				performerId: user?.id,
			});

			if (result.success) {
				setIsOpen(false);
				return { success: true, error: "", data: result.data };
			}
			return {
				success: false,
				error:
					typeof result.error === "string" ? result.error : "Validation failed",
				data: null,
			};
		},
		initialState,
	);

	return (
		<>
			<Button onClick={() => setIsOpen(true)}>
				<Plus className="mr-2 h-4 w-4" />
				New Skill
			</Button>

			<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
				<div className="flex flex-col gap-4">
					<div className="space-y-2 text-center">
						<h3 className="text-lg font-semibold">Create New Skill</h3>
						<p className="text-sm text-muted-foreground">
							Define a new operational skill or certification.
						</p>
					</div>
					<form action={formAction} className="flex flex-col gap-4">
						<div className="grid gap-2">
							<label htmlFor="name" className="text-sm font-medium">
								Skill Name
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								placeholder="e.g. Forklift Operation"
							/>
						</div>
						<div className="grid gap-2">
							<label htmlFor="code" className="text-sm font-medium">
								Code
							</label>
							<input
								id="code"
								name="code"
								type="text"
								required
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								placeholder="e.g. EHS-001"
							/>
						</div>
						<div className="grid gap-2">
							<label htmlFor="description" className="text-sm font-medium">
								Description
							</label>
							<textarea
								id="description"
								name="description"
								rows={3}
								className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								placeholder="Brief description of the skill..."
							/>
						</div>
						<div className="grid gap-2">
							<label htmlFor="validityMonths" className="text-sm font-medium">
								Validity (Months)
							</label>
							<input
								id="validityMonths"
								name="validityMonths"
								type="number"
								min="0"
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
								placeholder="Leave empty if never expires"
							/>
						</div>
						{state.error && (
							<p className="text-sm text-destructive">{state.error}</p>
						)}
						<Button type="submit" disabled={isPending}>
							{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Create Skill
						</Button>
					</form>
				</div>
			</Modal>
		</>
	);
}
