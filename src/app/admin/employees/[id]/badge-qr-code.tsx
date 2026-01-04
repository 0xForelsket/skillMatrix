"use client";

import { useEffect, useState, useRef } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Printer, Copy, Check } from "lucide-react";

interface BadgeQRCodeProps {
	badgeToken: string;
	employeeName: string;
	employeeNumber: string;
}

export function BadgeQRCode({
	badgeToken,
	employeeName,
	employeeNumber,
}: BadgeQRCodeProps) {
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const badgeUrl =
		typeof window !== "undefined"
			? `${window.location.origin}/b/${badgeToken}`
			: `/b/${badgeToken}`;

	useEffect(() => {
		// Generate QR code when modal opens
		if (isOpen) {
			QRCode.toDataURL(badgeUrl, {
				width: 300,
				margin: 2,
				color: {
					dark: "#000000",
					light: "#ffffff",
				},
				errorCorrectionLevel: "H",
			})
				.then(setQrDataUrl)
				.catch(console.error);
		}
	}, [isOpen, badgeUrl]);

	const handleDownload = () => {
		if (!qrDataUrl) return;

		const link = document.createElement("a");
		link.download = `badge-${employeeNumber}.png`;
		link.href = qrDataUrl;
		link.click();
	};

	const handlePrint = () => {
		if (!qrDataUrl) return;

		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		printWindow.document.write(`
			<!DOCTYPE html>
			<html>
			<head>
				<title>Badge - ${employeeName}</title>
				<style>
					body {
						font-family: system-ui, -apple-system, sans-serif;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
						min-height: 100vh;
						margin: 0;
						padding: 20px;
					}
					.badge-card {
						border: 2px solid #e5e7eb;
						border-radius: 12px;
						padding: 24px;
						text-align: center;
						max-width: 300px;
					}
					.qr-code {
						width: 200px;
						height: 200px;
					}
					.name {
						font-size: 18px;
						font-weight: 600;
						margin-top: 16px;
						margin-bottom: 4px;
					}
					.emp-number {
						font-size: 12px;
						color: #6b7280;
						font-family: monospace;
					}
					.footer {
						margin-top: 16px;
						font-size: 10px;
						color: #9ca3af;
					}
					@media print {
						body { margin: 0; }
						.badge-card { border: 1px solid #000; }
					}
				</style>
			</head>
			<body>
				<div class="badge-card">
					<img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
					<div class="name">${employeeName}</div>
					<div class="emp-number">${employeeNumber}</div>
					<div class="footer">Scan to verify skills</div>
				</div>
				<script>
					window.onload = function() {
						window.print();
						window.onafterprint = function() { window.close(); };
					};
				</script>
			</body>
			</html>
		`);
		printWindow.document.close();
	};

	const handleCopyUrl = async () => {
		await navigator.clipboard.writeText(badgeUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<>
			<Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
				<QrCode className="mr-2 h-4 w-4" />
				View Badge
			</Button>

			{/* Modal */}
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
					<div className="w-full max-w-sm bg-card rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<div className="p-6 text-center">
							<h3 className="text-lg font-semibold mb-4">Employee Badge</h3>

							{/* QR Code Display */}
							<div className="bg-white rounded-lg p-4 inline-block">
								{qrDataUrl ? (
									<img
										src={qrDataUrl}
										alt="Badge QR Code"
										className="w-48 h-48"
									/>
								) : (
									<div className="w-48 h-48 flex items-center justify-center">
										<QrCode className="w-12 h-12 text-muted-foreground animate-pulse" />
									</div>
								)}
							</div>

							{/* Employee Info */}
							<div className="mt-4">
								<div className="font-semibold text-lg">{employeeName}</div>
								<div className="text-sm text-muted-foreground font-mono">
									{employeeNumber}
								</div>
							</div>

							{/* URL Display */}
							<div className="mt-4 p-2 bg-muted rounded-md flex items-center justify-center gap-2">
								<code className="text-xs text-muted-foreground truncate">
									{badgeUrl}
								</code>
								<Button
									size="sm"
									variant="ghost"
									className="shrink-0 h-6 w-6 p-0"
									onClick={handleCopyUrl}
								>
									{copied ? (
										<Check className="h-3 w-3 text-green-600" />
									) : (
										<Copy className="h-3 w-3" />
									)}
								</Button>
							</div>

							{/* Actions */}
							<div className="mt-6 flex gap-2 justify-center">
								<Button
									variant="outline"
									size="sm"
									onClick={handleDownload}
									disabled={!qrDataUrl}
								>
									<Download className="mr-2 h-4 w-4" />
									Download
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={handlePrint}
									disabled={!qrDataUrl}
								>
									<Printer className="mr-2 h-4 w-4" />
									Print
								</Button>
							</div>

							{/* Close */}
							<Button
								className="mt-4 w-full"
								variant="secondary"
								onClick={() => setIsOpen(false)}
							>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Hidden canvas for QR generation */}
			<canvas ref={canvasRef} className="hidden" />
		</>
	);
}
