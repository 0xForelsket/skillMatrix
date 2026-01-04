import {
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	Clock,
	GraduationCap,
	Grid3X3,
	Settings,
	Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ComplianceGauge } from "@/components/ui/compliance-gauge";
import { StatusBadge, StatusDot } from "@/components/ui/status-indicator";
import { cn } from "@/lib/utils";

interface MetricCardProps {
	title: string;
	value: string | number;
	description: string;
	icon: LucideIcon;
	trend?: {
		label: string;
		type: "positive" | "negative" | "neutral";
	};
	href?: string;
}

function MetricCard({
	title,
	value,
	description,
	icon: Icon,
	trend,
	href,
}: MetricCardProps) {
	const content = (
		<Card
			variant={href ? "interactive" : "default"}
			className="relative overflow-hidden"
		>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<span className="text-label">{title}</span>
					<div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
						<Icon className="h-4 w-4 text-muted-foreground" />
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-1">
				<div className="text-metric text-3xl">{value}</div>
				<div className="flex items-center gap-2">
					{trend && (
						<span
							className={cn(
								"inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
								trend.type === "positive" &&
									"bg-status-compliant/15 text-status-compliant",
								trend.type === "negative" &&
									"bg-status-missing/15 text-status-missing",
								trend.type === "neutral" && "bg-muted text-muted-foreground",
							)}
						>
							{trend.label}
						</span>
					)}
					<p className="text-xs text-muted-foreground">{description}</p>
				</div>
			</CardContent>
			{href && (
				<div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
					<ArrowRight className="h-4 w-4 text-muted-foreground" />
				</div>
			)}
		</Card>
	);

	if (href) {
		return (
			<Link href={href} className="group">
				{content}
			</Link>
		);
	}

	return content;
}

interface AlertItemProps {
	type: "critical" | "warning" | "info";
	title: string;
	description: string;
	count?: number;
	href: string;
	actionLabel?: string;
}

function AlertItem({
	type,
	title,
	description,
	count,
	href,
	actionLabel = "View",
}: AlertItemProps) {
	const styles = {
		critical: {
			bg: "bg-status-missing/10",
			border: "border-status-missing/20",
			dot: "missing" as const,
			text: "text-status-missing",
		},
		warning: {
			bg: "bg-status-gap/10",
			border: "border-status-gap/20",
			dot: "gap" as const,
			text: "text-status-gap",
		},
		info: {
			bg: "bg-primary/10",
			border: "border-primary/20",
			dot: "compliant" as const,
			text: "text-primary",
		},
	};

	const style = styles[type];

	return (
		<div
			className={cn(
				"flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-muted/50",
				style.bg,
				style.border,
			)}
		>
			<StatusDot status={style.dot} size="lg" pulse={type === "warning"} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className={cn("text-sm font-semibold", style.text)}>
						{title}
					</span>
					{count !== undefined && count > 0 && (
						<span
							className={cn(
								"text-xs font-bold px-1.5 py-0.5 rounded-full",
								style.bg,
								style.text,
							)}
						>
							{count}
						</span>
					)}
				</div>
				<p className="text-xs text-muted-foreground mt-0.5">{description}</p>
			</div>
			<Link
				href={href}
				className={cn(
					"text-xs font-semibold shrink-0 hover:underline",
					style.text,
				)}
			>
				{actionLabel} →
			</Link>
		</div>
	);
}

export default async function AdminDashboard() {
	const statsResult = await getDashboardStats();

	if (!statsResult.success || !statsResult.data) {
		return (
			<div className="flex items-center justify-center h-full p-8">
				<Card className="p-8 text-center">
					<AlertTriangle className="h-12 w-12 text-status-missing mx-auto mb-4" />
					<h2 className="text-lg font-semibold">Error Loading Dashboard</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Unable to fetch statistics. Please try again.
					</p>
				</Card>
			</div>
		);
	}

	const stats = statsResult.data;

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full">
			{/* Page Header */}
			<div className="flex flex-col gap-1">
				<h1 className="text-page-title">System Overview</h1>
				<p className="text-muted-foreground">
					Real-time metrics for workforce compliance and training.
				</p>
			</div>

			{/* Hero Section with Compliance Gauge */}
			<div className="grid gap-4 md:gap-6 lg:grid-cols-3">
				<Card variant="elevated" className="lg:row-span-2 p-6 md:p-8">
					<div className="flex flex-col items-center justify-center h-full gap-4 md:gap-6">
						{/* Responsive gauge - smaller on mobile */}
						<div className="hidden sm:block">
							<ComplianceGauge
								value={stats.complianceRate}
								size={200}
								label="COMPLIANCE"
								animate
							/>
						</div>
						<div className="sm:hidden">
							<ComplianceGauge
								value={stats.complianceRate}
								size={160}
								label="COMPLIANCE"
								animate
							/>
						</div>
						<div className="text-center space-y-2">
							<p className="text-sm text-muted-foreground">
								{stats.complianceRate >= 90
									? "Excellent compliance rate"
									: stats.complianceRate >= 70
										? "Compliance needs attention"
										: "Critical compliance issues"}
							</p>
							<Button asChild size="default" className="sm:hidden">
								<Link href="/admin/matrix">
									<Grid3X3 className="h-4 w-4" />
									View Matrix
								</Link>
							</Button>
							<Button asChild size="lg" className="hidden sm:inline-flex">
								<Link href="/admin/matrix">
									<Grid3X3 className="h-4 w-4" />
									View Skill Matrix
								</Link>
							</Button>
						</div>
					</div>
				</Card>

				{/* Metrics Grid */}
				<div className="lg:col-span-2 grid gap-3 md:gap-4 grid-cols-2">
					<MetricCard
						title="Workforce Size"
						value={stats.totalEmployees}
						description="Active employees"
						icon={Users}
						trend={{ label: "Active", type: "positive" }}
						href="/admin/employees"
					/>
					<MetricCard
						title="Skills Catalog"
						value={stats.totalSkills}
						description="Tracked skills"
						icon={GraduationCap}
						href="/admin/skills"
					/>
					<MetricCard
						title="Skills Gap"
						value={stats.gapCount}
						description="Missing requirements"
						icon={AlertTriangle}
						trend={{
							label: stats.gapCount === 0 ? "All Clear" : "Action Needed",
							type: stats.gapCount === 0 ? "positive" : "negative",
						}}
					/>
					<MetricCard
						title="Expiring Soon"
						value={stats.expiringSoon}
						description="Within 30 days"
						icon={Clock}
						trend={{
							label: stats.expiringSoon === 0 ? "None" : "Attention",
							type: stats.expiringSoon === 0 ? "positive" : "negative",
						}}
					/>
				</div>
			</div>

			{/* Alerts & Quick Actions */}
			<div className="grid gap-4 md:gap-6 lg:grid-cols-5">
				{/* Alerts Timeline */}
				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle className="text-section-header flex items-center gap-2">
							<Clock className="h-5 w-5 text-primary" />
							Critical Alerts
						</CardTitle>
						<CardDescription>
							Issues requiring immediate attention
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{stats.expiringSoon > 0 && (
							<AlertItem
								type="warning"
								title="Expiring Certifications"
								description="Certifications expiring within the next 30 days"
								count={stats.expiringSoon}
								href="/admin/matrix"
								actionLabel="Review"
							/>
						)}

						{stats.expiredRequiredCount > 0 && (
							<AlertItem
								type="critical"
								title="Expired Requirements"
								description="Required skills that have already expired"
								count={stats.expiredRequiredCount}
								href="/admin/matrix"
								actionLabel="Fix Now"
							/>
						)}

						{stats.gapCount > 0 && (
							<AlertItem
								type="warning"
								title="Skills Gaps"
								description="Employees missing required skill levels"
								count={stats.gapCount}
								href="/admin/matrix"
								actionLabel="View"
							/>
						)}

						{stats.expiringSoon === 0 &&
							stats.expiredRequiredCount === 0 &&
							stats.gapCount === 0 && (
								<div className="text-center py-12">
									<CheckCircle2 className="h-12 w-12 text-status-compliant mx-auto mb-3" />
									<p className="text-sm font-medium text-status-compliant">
										All Clear
									</p>
									<p className="text-xs text-muted-foreground mt-1">
										No critical alerts at this time
									</p>
								</div>
							)}
					</CardContent>
				</Card>

				{/* Quick Actions */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle className="text-section-header">Quick Actions</CardTitle>
						<CardDescription>Common tasks and shortcuts</CardDescription>
					</CardHeader>
					<CardContent className="space-y-2">
						{[
							{
								label: "Add New Employee",
								description: "Register a new team member",
								icon: Users,
								href: "/admin/employees/new",
							},
							{
								label: "Review Matrix",
								description: "Check compliance status",
								icon: Grid3X3,
								href: "/admin/matrix",
							},
							{
								label: "Manage Skills",
								description: "Update skill catalog",
								icon: GraduationCap,
								href: "/admin/skills",
							},
							{
								label: "Configure Requirements",
								description: "Set skill requirements",
								icon: Settings,
								href: "/admin/requirements",
							},
						].map((action) => (
							<Link
								key={action.label}
								href={action.href}
								className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors group"
							>
								<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
									<action.icon className="h-5 w-5 text-primary" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium">{action.label}</div>
									<div className="text-xs text-muted-foreground">
										{action.description}
									</div>
								</div>
								<ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
							</Link>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
