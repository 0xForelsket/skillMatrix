"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, AlertCircle } from "lucide-react";

export function BadgeScanner() {
	const router = useRouter();
	const scannerRef = useRef<Html5QrcodeScanner | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const scanner = new Html5QrcodeScanner(
			"reader",
			{
				fps: 10,
				qrbox: { width: 250, height: 250 },
				aspectRatio: 1.0,
				formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
			},
			/* verbose= */ false,
		);

		scanner.render(
			(decodedText) => {
				// Success
				console.log("Decoded text:", decodedText);
				
				// Check if the URL matches our badge pattern
				// e.g. https://domain.com/b/token or just /b/token
				try {
					const url = new URL(decodedText);
					if (url.pathname.startsWith("/b/")) {
						scanner.clear();
						router.push(url.pathname);
					} else {
						setError("Invalid QR code. Please scan a valid employee badge.");
					}
				} catch {
					// Not a full URL, check relative path
					if (decodedText.startsWith("/b/")) {
						scanner.clear();
						router.push(decodedText);
					} else {
						setError("Invalid QR code. Please scan a valid employee badge.");
					}
				}
			},
			() => {
				// Silently log scan errors (lots of them happen while waiting for a code)
				// console.warn("Scan error:", errorMessage);
			},
		);

		scannerRef.current = scanner;

		return () => {
			if (scannerRef.current) {
				scannerRef.current.clear().catch((error) => {
					console.error("Failed to clear scanner", error);
				});
			}
		};
	}, [router]);

	return (
		<div className="space-y-4">
			<Card className="overflow-hidden bg-black border-white/10 shadow-2xl relative group">
				<div id="reader" className="w-full aspect-square" />
				
				{!error && (
					<div className="absolute inset-x-0 top-4 flex justify-center pointer-events-none transition-opacity group-hover:opacity-100 opacity-70">
						<div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
							<Camera className="h-4 w-4 text-indigo-400" />
							<span className="text-xs font-medium text-white uppercase tracking-wider">Scanning for Badge...</span>
						</div>
					</div>
				)}

				{error && (
					<div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 text-center animate-in fade-in duration-300">
						<div className="space-y-4 max-w-xs">
							<div className="flex justify-center">
								<AlertCircle className="h-12 w-12 text-red-500" />
							</div>
							<p className="text-sm text-slate-300">{error}</p>
							<Button 
								variant="outline" 
								onClick={() => setError(null)}
								className="border-white/20 text-white hover:bg-white/10"
							>
								Try Again
							</Button>
						</div>
					</div>
				)}
			</Card>

			<div className="text-center space-y-2">
				<p className="text-sm text-slate-400">Position the employee badge center-frame</p>
			</div>
		</div>
	);
}
