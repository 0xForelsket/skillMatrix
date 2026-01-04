"use client";

import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { initiateUpload } from "@/actions/storage";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
	onUploadComplete: (
		url: string,
		key: string,
		fileData: { name: string; size: number; type: string },
	) => void;
	accept?: string;
	maxSizeMB?: number;
	label?: string;
	className?: string;
}

export function FileUpload({
	onUploadComplete,
	accept = "image/*,application/pdf",
	maxSizeMB = 5,
	label = "Upload File",
	className,
}: FileUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [progress, setProgress] = useState(0);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validation
		if (file.size > maxSizeMB * 1024 * 1024) {
			toast.error(`File too large. Maximum size is ${maxSizeMB}MB.`);
			return;
		}

		setIsUploading(true);
		setProgress(0);

		try {
			// 1. Get Presigned URL
			const initResult = await initiateUpload(file.name, file.type, file.size);
			if (!initResult.success || !initResult.data) {
				throw new Error(initResult.error || "Failed to initiate upload");
			}

			const { uploadUrl, key, publicUrl } = initResult.data;

			// 2. Upload to S3
			const uploadRes = await fetch(uploadUrl, {
				method: "PUT",
				body: file,
				headers: {
					"Content-Type": file.type,
				},
			});

			if (!uploadRes.ok) {
				throw new Error("Failed to upload file to storage provider.");
			}

			// 3. Complete
			setProgress(100);
			onUploadComplete(publicUrl, key, {
				name: file.name,
				size: file.size,
				type: file.type,
			});
			toast.success("File uploaded successfully.");
		} catch (error) {
			console.error(error);
			toast.error("Upload failed. Please try again.");
			if (fileInputRef.current) fileInputRef.current.value = "";
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className={className}>
			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				accept={accept}
				onChange={handleFileSelect}
			/>
			<Button
				type="button"
				variant="outline"
				onClick={() => fileInputRef.current?.click()}
				disabled={isUploading}
				className="w-full relative overflow-hidden"
			>
				{isUploading ? (
					<div className="flex items-center gap-2 z-10">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Uploading...</span>
					</div>
				) : (
					<div className="flex items-center gap-2 z-10">
						<Upload className="h-4 w-4" />
						<span>{label}</span>
					</div>
				)}

				{isUploading && (
					<div
						className="absolute left-0 top-0 bottom-0 bg-indigo-500/10 transition-all duration-300"
						style={{ width: `${progress}%` }}
					/>
				)}
			</Button>
		</div>
	);
}
