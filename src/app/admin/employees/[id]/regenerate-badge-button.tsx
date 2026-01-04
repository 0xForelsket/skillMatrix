"use client";

import { useState, useTransition } from "react";
import { regenerateBadgeToken } from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, Check, Copy, QrCode } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";

interface RegenerateBadgeButtonProps {
	employeeId: string;
	employeeName: string;
}

export function RegenerateBadgeButton({
	employeeId,
	employeeName,
}: RegenerateBadgeButtonProps) {
	const { user } = useCurrentUser();
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [result, setResult] = useState<{
		success: boolean;
		newToken?: string;
		error?: string;
	} | null>(null);
	const [copied, setCopied] = useState(false);

	const handleRegenerate = () => {
		startTransition(async () => {
			const res = await regenerateBadgeToken({
				employeeId,
				performerId: user?.id,
				reason: "Manual regeneration by admin",
			});

			if (res.success && res.data) {
				setResult({
					success: true,
					newToken: res.data.newBadgeToken,
				});
			} else {
				setResult({
					success: false,
					error: res.error as string,
				});
			}
		});
	};

	const handleCopy = async () => {
		if (result?.newToken) {
			const badgeUrl = `${window.location.origin}/b/${result.newToken}`;
			await navigator.clipboard.writeText(badgeUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleClose = () => {
		setIsOpen(false);
		setResult(null);
		setCopied(false);
	};

	return (
		<>
			<Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
				<RefreshCw className="mr-2 h-4 w-4" />
				Regenerate Badge
			</Button>

			{/* Modal */}
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
					<div className="w-full max-w-md bg-card rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<div className="p-6">
							{!result ? (
								<>
									{/* Confirmation Step */}
									<div className="flex items-start gap-4">
										<div className="rounded-full bg-amber-100 p-2 shrink-0">
											<AlertTriangle className="h-6 w-6 text-amber-600" />
										</div>
										<div>
											<h3 className="text-lg font-semibold">
												Regenerate Badge Token?
											</h3>
											<p className="mt-1 text-sm text-muted-foreground">
												This will invalidate {employeeName}'s current QR code
												badge. They will need to print a new badge to access the
												skill viewer.
											</p>
											<p className="mt-2 text-sm text-muted-foreground">
												<strong>Use this when:</strong>
											</p>
											<ul className="mt-1 text-sm text-muted-foreground list-disc list-inside">
												<li>Badge was lost or stolen</li>
												<li>Security rotation is required</li>
												<li>QR code was compromised</li>
											</ul>
										</div>
									</div>

									<div className="mt-6 flex justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={handleClose}
											disabled={isPending}
										>
											Cancel
										</Button>
										<Button
											type="button"
											variant="destructive"
											onClick={handleRegenerate}
											disabled={isPending}
										>
											{isPending && (
												<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
											)}
											Regenerate Badge
										</Button>
									</div>
								</>
							) : result.success ? (
								<>
									{/* Success Step */}
									<div className="flex items-start gap-4">
										<div className="rounded-full bg-green-100 p-2 shrink-0">
											<Check className="h-6 w-6 text-green-600" />
										</div>
										<div className="flex-1">
											<h3 className="text-lg font-semibold text-green-700">
												Badge Regenerated
											</h3>
											<p className="mt-1 text-sm text-muted-foreground">
												{employeeName}'s old badge is now invalid. Copy the new
												badge URL below.
											</p>

											<div className="mt-4 p-3 bg-muted rounded-md flex items-center gap-2">
												<QrCode className="h-5 w-5 text-muted-foreground shrink-0" />
												<code className="text-xs font-mono text-muted-foreground flex-1 truncate">
													/b/{result.newToken}
												</code>
												<Button
													type="button"
													size="sm"
													variant="ghost"
													onClick={handleCopy}
													className="shrink-0"
												>
													{copied ? (
														<Check className="h-4 w-4 text-green-600" />
													) : (
														<Copy className="h-4 w-4" />
													)}
												</Button>
											</div>
										</div>
									</div>

									<div className="mt-6 flex justify-end">
										<Button type="button" onClick={handleClose}>
											Done
										</Button>
									</div>
								</>
							) : (
								<>
									{/* Error Step */}
									<div className="flex items-start gap-4">
										<div className="rounded-full bg-red-100 p-2 shrink-0">
											<AlertTriangle className="h-6 w-6 text-red-600" />
										</div>
										<div>
											<h3 className="text-lg font-semibold text-red-700">
												Regeneration Failed
											</h3>
											<p className="mt-1 text-sm text-muted-foreground">
												{result.error || "An unexpected error occurred."}
											</p>
										</div>
									</div>

									<div className="mt-6 flex justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={handleClose}
										>
											Cancel
										</Button>
										<Button type="button" onClick={handleRegenerate}>
											Try Again
										</Button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
