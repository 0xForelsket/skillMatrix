"use client";

import {
	Award,
	Check,
	Loader2,
	MessageSquare,
	Plus,
	Star,
	X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner"; // Assuming sonner is available or similar toast
import {
	certifySkill,
	getSkillsForCertification,
} from "@/actions/certifications";
import { Button } from "@/components/ui/button";

interface QuickCertifyFlowProps {
	employeeId: string;
	employeeName: string;
}

type SkillChoice = {
	id: string;
	name: string;
	code: string | null;
};

export function QuickCertifyFlow({
	employeeId,
	employeeName,
}: QuickCertifyFlowProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [skills, setSkills] = useState<SkillChoice[]>([]);
	const [selectedSkillId, setSelectedSkillId] = useState("");
	const [level, setLevel] = useState(1);
	const [notes, setNotes] = useState("");
	const [isLoadingSkills, setIsLoadingSkills] = useState(false);

	const handleOpen = async () => {
		setIsOpen(true);
		setIsLoadingSkills(true);
		const result = await getSkillsForCertification();
		if (result.success && result.data) {
			setSkills(
				result.data.map((s) => ({ id: s.id, name: s.name, code: s.code })),
			);
		}
		setIsLoadingSkills(false);
	};

	const handleCertify = () => {
		if (!selectedSkillId) return;

		startTransition(async () => {
			const result = await certifySkill({
				employeeId,
				skillId: selectedSkillId,
				achievedLevel: level,
				notes,
			});

			if (result.success) {
				setIsOpen(false);
				setSelectedSkillId("");
				setLevel(1);
				setNotes("");
				toast.success(`Successfully certified ${employeeName}`);
				window.location.reload(); // Refresh to show new skill
			} else {
				toast.error(result.error || "Failed to record certification");
			}
		});
	};

	if (!isOpen) {
		return (
			<div className="fixed bottom-6 right-6 z-40 sm:bottom-8 sm:right-8">
				<Button
					size="lg"
					onClick={handleOpen}
					className="h-14 w-14 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-700 text-white border-4 border-slate-900 overflow-hidden group transition-all hover:scale-110 active:scale-95"
				>
					<div className="absolute inset-0 bg-white/20 opacity-0 group-active:opacity-100 transition-opacity" />
					<Plus className="h-8 w-8" />
				</Button>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
			<div className="w-full max-w-lg bg-slate-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-4 duration-500">
				{/* Header */}
				<div className="p-6 border-b border-white/5 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
							<Award className="h-6 w-6 text-indigo-400" />
						</div>
						<div>
							<h3 className="text-lg font-bold text-white leading-none">
								Quick Certify
							</h3>
							<p className="text-sm text-slate-400 mt-1">{employeeName}</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => setIsOpen(false)}
						className="text-slate-400 hover:text-white hover:bg-white/5"
					>
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Form Content */}
				<div className="p-6 space-y-6">
					{/* Skill Selection */}
					<div className="space-y-2">
						<label
							htmlFor="skill-select"
							className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"
						>
							<Award className="h-3 w-3" />
							Select Skill
						</label>
						<div className="relative">
							<select
								id="skill-select"
								value={selectedSkillId}
								onChange={(e) => setSelectedSkillId(e.target.value)}
								disabled={isLoadingSkills || isPending}
								className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
							>
								<option value="">
									{isLoadingSkills ? "Loading skills..." : "Choose a skill..."}
								</option>
								{skills.map((s) => (
									<option key={s.id} value={s.id}>
										{s.name} {s.code ? `(${s.code})` : ""}
									</option>
								))}
							</select>
							<div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
								<Plus className="h-4 w-4 rotate-45" />
							</div>
						</div>
					</div>

					{/* Level Selection */}
					<div className="space-y-4">
						<div className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
							<Star className="h-3 w-3" />
							Achieved Level
						</div>
						<div className="grid grid-cols-5 gap-2">
							{[1, 2, 3, 4, 5].map((l) => (
								<button
									key={l}
									type="button"
									onClick={() => setLevel(l)}
									disabled={isPending}
									className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
										level === l
											? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
											: "bg-slate-950 border border-white/5 text-slate-400 hover:border-white/20"
									}`}
								>
									<span className="text-sm font-bold">{l}</span>
								</button>
							))}
						</div>
						<div className="bg-indigo-500/5 rounded-lg p-3 border border-indigo-500/10">
							<p className="text-xs text-indigo-300 text-center italic">
								{level === 1 && "Level 1: Novice (requires supervision)"}
								{level === 2 && "Level 2: Competent (standard tasks)"}
								{level === 3 && "Level 3: Proficient (complex tasks)"}
								{level === 4 && "Level 4: Expert (can train others)"}
								{level === 5 && "Level 5: Master (subject matter expert)"}
							</p>
						</div>
					</div>

					{/* Notes */}
					<div className="space-y-2">
						<label
							htmlFor="trainer-notes"
							className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"
						>
							<MessageSquare className="h-3 w-3" />
							Trainer Notes
						</label>
						<textarea
							id="trainer-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							disabled={isPending}
							placeholder="Add any specific observations or limits..."
							rows={3}
							className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all disabled:opacity-50 text-sm"
						/>
					</div>
				</div>

				{/* Footer Options */}
				<div className="p-6 bg-slate-950 border-t border-white/5 flex gap-3">
					<Button
						variant="ghost"
						onClick={() => setIsOpen(false)}
						disabled={isPending}
						className="flex-1 h-12 rounded-xl text-slate-400 border border-white/5 hover:bg-white/5"
					>
						Cancel
					</Button>
					<Button
						onClick={handleCertify}
						disabled={!selectedSkillId || isPending}
						className="flex-[2] h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50"
					>
						{isPending ? (
							<Loader2 className="h-5 w-5 animate-spin" />
						) : (
							<>
								<Check className="h-5 w-5 mr-2" />
								Record Certification
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
