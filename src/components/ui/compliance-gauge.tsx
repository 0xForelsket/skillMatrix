"use client";

import { cn } from "@/lib/utils";

interface ComplianceGaugeProps {
	/** Percentage value (0-100) */
	value: number;
	/** Size of the gauge in pixels */
	size?: number;
	/** Stroke width of the gauge ring */
	strokeWidth?: number;
	/** Whether to animate the gauge on mount */
	animate?: boolean;
	/** Optional label below the percentage */
	label?: string;
	/** Additional class names */
	className?: string;
}

export function ComplianceGauge({
	value,
	size = 200,
	strokeWidth = 12,
	animate = true,
	label,
	className,
}: ComplianceGaugeProps) {
	// Clamp value between 0 and 100
	const clampedValue = Math.max(0, Math.min(100, value));

	// Calculate circle properties
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (clampedValue / 100) * circumference;

	// Determine color based on value thresholds
	const getStatusColor = () => {
		if (clampedValue >= 90) return "text-status-compliant";
		if (clampedValue >= 70) return "text-status-gap";
		return "text-status-missing";
	};

	const getStrokeColor = () => {
		if (clampedValue >= 90) return "stroke-status-compliant";
		if (clampedValue >= 70) return "stroke-status-gap";
		return "stroke-status-missing";
	};

	return (
		<div
			className={cn("relative inline-flex items-center justify-center", className)}
			style={{ width: size, height: size }}
		>
			<svg
				className="transform -rotate-90"
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
			>
				{/* Background circle */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					className="stroke-muted"
				/>

				{/* Progress circle */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={animate ? circumference : offset}
					className={cn(
						getStrokeColor(),
						"transition-all duration-1000 ease-out",
						animate && "animate-gauge-fill",
					)}
					style={
						animate
							? {
									strokeDashoffset: offset,
									animationFillMode: "forwards",
								}
							: undefined
					}
				/>

				{/* Threshold markers */}
				{[70, 90].map((threshold) => {
					const markerOffset =
						circumference - (threshold / 100) * circumference;
					const angle = (threshold / 100) * 360 - 90;
					const markerRadius = radius + strokeWidth / 2 + 4;
					const x = size / 2 + markerRadius * Math.cos((angle * Math.PI) / 180);
					const y = size / 2 + markerRadius * Math.sin((angle * Math.PI) / 180);

					return (
						<circle
							key={threshold}
							cx={x}
							cy={y}
							r={2}
							className="fill-muted-foreground/30"
						/>
					);
				})}
			</svg>

			{/* Center content */}
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span
					className={cn(
						"font-mono font-bold tracking-tight tabular-nums",
						getStatusColor(),
					)}
					style={{ fontSize: size * 0.22 }}
				>
					{Math.round(clampedValue)}%
				</span>
				{label && (
					<span className="text-label mt-1" style={{ fontSize: size * 0.06 }}>
						{label}
					</span>
				)}
			</div>
		</div>
	);
}

interface ComplianceGaugeMiniProps {
	/** Percentage value (0-100) */
	value: number;
	/** Size of the gauge in pixels */
	size?: number;
	/** Additional class names */
	className?: string;
}

export function ComplianceGaugeMini({
	value,
	size = 40,
	className,
}: ComplianceGaugeMiniProps) {
	const clampedValue = Math.max(0, Math.min(100, value));
	const strokeWidth = 4;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference - (clampedValue / 100) * circumference;

	const getStrokeColor = () => {
		if (clampedValue >= 90) return "stroke-status-compliant";
		if (clampedValue >= 70) return "stroke-status-gap";
		return "stroke-status-missing";
	};

	return (
		<div
			className={cn("relative inline-flex items-center justify-center", className)}
			style={{ width: size, height: size }}
		>
			<svg
				className="transform -rotate-90"
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
			>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					className="stroke-muted"
				/>
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					className={getStrokeColor()}
				/>
			</svg>
			<span
				className="absolute text-xs font-mono font-medium tabular-nums"
				style={{ fontSize: size * 0.28 }}
			>
				{Math.round(clampedValue)}
			</span>
		</div>
	);
}
