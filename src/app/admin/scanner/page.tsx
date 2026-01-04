import { Award, LucideQrCode } from "lucide-react";
import { BadgeScanner } from "./badge-scanner";

export const metadata = {
	title: "Quick Certify Scanner | Caliber",
	description: "Scan employee badges to quickly certify skills",
};

export default function ScannerPage() {
	return (
		<div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center p-6 sm:p-12">
			<div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
				<div className="text-center space-y-2">
					<div className="flex justify-center mb-4">
						<div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
							<LucideQrCode className="h-8 w-8 text-indigo-400" />
						</div>
					</div>
					<h1 className="text-3xl font-bold text-white tracking-tight">
						Badge Scanner
					</h1>
					<p className="text-slate-400">
						Scan an employee's badge to view their profile or record
						certifications
					</p>
				</div>

				<BadgeScanner />

				<div className="grid grid-cols-2 gap-4 pt-4">
					<div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
						<div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
							Fast Verification
						</div>
						<div className="text-sm text-slate-300">
							Instant skill checks on the shop floor.
						</div>
					</div>
					<div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
						<div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
							Direct Access
						</div>
						<div className="text-sm text-slate-300">
							Quickly link to employee records.
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
