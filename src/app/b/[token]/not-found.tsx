/**
 * 404 Page for Invalid Badge Tokens
 */

import { ShieldX, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BadgeNotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
			<div className="text-center space-y-6 max-w-md">
				<div className="flex justify-center">
					<div className="rounded-full bg-red-500/10 p-4 animate-pulse">
						<ShieldX className="h-16 w-16 text-red-500" />
					</div>
				</div>
				
				<div className="space-y-2">
					<h1 className="text-2xl font-bold text-white">
						Badge Not Found
					</h1>
					<p className="text-slate-400">
						This badge URL is invalid or the employee record has been removed.
						Please verify the QR code and try scanning again.
					</p>
				</div>

				<div className="pt-4">
					<Link
						href="/"
						className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
					>
						<ArrowLeft className="h-4 w-4" />
						Go to Homepage
					</Link>
				</div>

				<p className="text-xs text-slate-600">
					If you believe this is an error, please contact your site administrator.
				</p>
			</div>
		</div>
	);
}
