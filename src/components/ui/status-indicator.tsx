import { cva, type VariantProps } from "class-variance-authority";
import {
	AlertTriangle,
	Check,
	Clock,
	Diamond,
	Minus,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ComplianceStatus =
	| "compliant"
	| "gap"
	| "missing"
	| "expired"
	| "extra"
	| "not_required";

const statusIndicatorVariants = cva(
	"inline-flex items-center justify-center rounded-full transition-all duration-200",
	{
		variants: {
			status: {
				compliant:
					"bg-status-compliant/15 text-status-compliant border border-status-compliant/30",
				gap: "bg-status-gap/15 text-status-gap border border-status-gap/30 animate-pulse-subtle",
				missing:
					"bg-status-missing/15 text-status-missing border border-status-missing/30",
				expired:
					"bg-status-expired/15 text-status-expired border border-status-expired/30",
				extra:
					"bg-status-extra/15 text-status-extra border border-status-extra/30",
				not_required: "bg-muted text-muted-foreground border border-dashed",
			},
			size: {
				sm: "h-6 w-6",
				md: "h-8 w-8",
				lg: "h-10 w-10",
			},
		},
		defaultVariants: {
			status: "compliant",
			size: "md",
		},
	},
);

const iconSizes = {
	sm: "h-3 w-3",
	md: "h-4 w-4",
	lg: "h-5 w-5",
} as const;

export interface StatusIndicatorProps
	extends VariantProps<typeof statusIndicatorVariants> {
	/** The compliance status to display */
	status: ComplianceStatus;
	/** Optional level to display inside (for compliant/gap states) */
	level?: number;
	/** Additional class names */
	className?: string;
}

const statusIcons: Record<ComplianceStatus, React.ComponentType<{ className?: string }>> = {
	compliant: Check,
	gap: AlertTriangle,
	missing: X,
	expired: Clock,
	extra: Diamond,
	not_required: Minus,
};

export function StatusIndicator({
	status,
	size = "md",
	level,
	className,
}: StatusIndicatorProps) {
	const Icon = statusIcons[status];
	const showLevel = level !== undefined && (status === "compliant" || status === "gap");

	return (
		<div
			className={cn(statusIndicatorVariants({ status, size }), className)}
			role="status"
			aria-label={status.replace("_", " ")}
		>
			{showLevel ? (
				<span className="text-xs font-bold tabular-nums">{level}</span>
			) : (
				<Icon className={iconSizes[size ?? "md"]} />
			)}
		</div>
	);
}

// Badge variant for use in tables/lists
const statusBadgeVariants = cva(
	"inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all duration-200",
	{
		variants: {
			status: {
				compliant:
					"bg-status-compliant/15 text-status-compliant border border-status-compliant/20",
				gap: "bg-status-gap/15 text-status-gap border border-status-gap/20",
				missing:
					"bg-status-missing/15 text-status-missing border border-status-missing/20",
				expired:
					"bg-status-expired/15 text-status-expired border border-status-expired/20",
				extra:
					"bg-status-extra/15 text-status-extra border border-status-extra/20",
				not_required:
					"bg-muted text-muted-foreground border border-dashed",
			},
		},
		defaultVariants: {
			status: "compliant",
		},
	},
);

export interface StatusBadgeProps
	extends VariantProps<typeof statusBadgeVariants> {
	/** The compliance status to display */
	status: ComplianceStatus;
	/** Optional label text (defaults to status name) */
	label?: string;
	/** Whether to show the icon */
	showIcon?: boolean;
	/** Additional class names */
	className?: string;
}

const statusLabels: Record<ComplianceStatus, string> = {
	compliant: "Compliant",
	gap: "Gap",
	missing: "Missing",
	expired: "Expired",
	extra: "Extra",
	not_required: "N/A",
};

export function StatusBadge({
	status,
	label,
	showIcon = true,
	className,
}: StatusBadgeProps) {
	const Icon = statusIcons[status];
	const displayLabel = label ?? statusLabels[status];

	return (
		<span className={cn(statusBadgeVariants({ status }), className)}>
			{showIcon && <Icon className="h-3 w-3" />}
			{displayLabel}
		</span>
	);
}

// Compact dot indicator for dense UIs
export interface StatusDotProps {
	status: ComplianceStatus;
	size?: "sm" | "md" | "lg";
	pulse?: boolean;
	className?: string;
}

const dotSizes = {
	sm: "h-2 w-2",
	md: "h-3 w-3",
	lg: "h-4 w-4",
} as const;

const dotColors: Record<ComplianceStatus, string> = {
	compliant: "bg-status-compliant",
	gap: "bg-status-gap",
	missing: "bg-status-missing",
	expired: "bg-status-expired",
	extra: "bg-status-extra",
	not_required: "bg-muted-foreground",
};

export function StatusDot({
	status,
	size = "md",
	pulse = false,
	className,
}: StatusDotProps) {
	return (
		<span
			className={cn(
				"inline-block rounded-full",
				dotSizes[size],
				dotColors[status],
				pulse && status === "gap" && "animate-pulse-subtle",
				className,
			)}
			role="status"
			aria-label={status.replace("_", " ")}
		/>
	);
}

// Level comparison display (e.g., "L3/L4")
export interface LevelComparisonProps {
	/** Current achieved level */
	currentLevel?: number;
	/** Required level */
	requiredLevel?: number;
	/** Additional class names */
	className?: string;
}

export function LevelComparison({
	currentLevel,
	requiredLevel,
	className,
}: LevelComparisonProps) {
	if (currentLevel === undefined && requiredLevel === undefined) {
		return <span className={cn("text-muted-foreground text-xs", className)}>—</span>;
	}

	const isCompliant = currentLevel !== undefined &&
		requiredLevel !== undefined &&
		currentLevel >= requiredLevel;
	const isGap = currentLevel !== undefined &&
		requiredLevel !== undefined &&
		currentLevel < requiredLevel;

	return (
		<span
			className={cn(
				"font-mono text-xs tabular-nums",
				isCompliant && "text-status-compliant",
				isGap && "text-status-gap",
				!isCompliant && !isGap && "text-muted-foreground",
				className,
			)}
		>
			{currentLevel !== undefined ? `L${currentLevel}` : "—"}
			{requiredLevel !== undefined && (
				<>
					<span className="text-muted-foreground/50">/</span>
					<span className="text-muted-foreground">L{requiredLevel}</span>
				</>
			)}
		</span>
	);
}
