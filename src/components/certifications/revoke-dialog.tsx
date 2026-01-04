"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { revokeCertification } from "@/actions/certifications";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RevokeCertificationDialogProps {
	employeeSkillId: string;
	skillName: string;
	trigger?: React.ReactNode;
}

export function RevokeCertificationDialog({
	employeeSkillId,
	skillName,
	trigger,
}: RevokeCertificationDialogProps) {
	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [isPending, startTransition] = useTransition();

	const handleRevoke = () => {
		if (!reason || reason.length < 5) {
			toast.error("Please provide a clearer reason (min 5 chars).");
			return;
		}

		startTransition(async () => {
			const result = await revokeCertification({ employeeSkillId, reason });
			if (result.success) {
				toast.success("Certification revoked.");
				setOpen(false);
				setReason("");
			} else {
				toast.error(
					typeof result.error === "string" ? result.error : "Failed to revoke.",
				);
			}
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="destructive" size="sm">
						Revoke
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] bg-slate-950 border-white/10 text-white">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-red-500">
						<AlertTriangle className="h-5 w-5" />
						Revoke Certification
					</DialogTitle>
					<DialogDescription className="text-slate-400">
						Are you sure you want to revoke the certification for{" "}
						<strong>{skillName}</strong>? This action will be logged and
						requires a reason.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="reason" className="text-white">
							Reason for Revocation
						</Label>
						<Textarea
							id="reason"
							placeholder="e.g. Safety violation, retraining required..."
							value={reason}
							onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
								setReason(e.target.value)
							}
							className="bg-slate-900 border-white/10 text-white placeholder:text-slate-600 focus:ring-red-500/50"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => setOpen(false)}
						disabled={isPending}
						className="text-slate-400 hover:text-white hover:bg-white/10"
					>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleRevoke}
						disabled={isPending}
					>
						{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Confirm Revocation
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
