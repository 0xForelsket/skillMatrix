import { 
	AlertTriangle, 
	CheckCircle2, 
	Clock, 
	GraduationCap, 
	TrendingUp, 
	Users 
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { getDashboardStats } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
	title: string;
	value: string | number;
	description: string;
	icon: LucideIcon;
	trend?: string;
	trendType?: "positive" | "negative" | "neutral";
	className?: string;
}

function StatCard({ title, value, description, icon: Icon, trend, trendType = "neutral", className }: StatCardProps) {
	return (
		<Card className={cn("overflow-hidden group transition-all hover:shadow-md", className)}>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
					{title}
				</CardTitle>
				<Icon className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
			</CardHeader>
			<CardContent>
				<div className="text-3xl font-bold tracking-tight">{value}</div>
				<div className="flex items-center gap-1.5 mt-1">
					{trend && (
						<span className={cn(
							"text-[10px] font-bold px-1.5 py-0.5 rounded-full",
							trendType === "positive" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
							trendType === "negative" && "bg-red-500/10 text-red-600 dark:text-red-400",
							trendType === "neutral" && "bg-muted text-muted-foreground"
						)}>
							{trend}
						</span>
					)}
					<p className="text-xs text-muted-foreground">{description}</p>
				</div>
			</CardContent>
		</Card>
	);
}

export default async function AdminDashboard() {
	const statsResult = await getDashboardStats();
	
	if (!statsResult.success || !statsResult.data) {
		return <div className="p-8">Error loading stats.</div>;
	}

	const stats = statsResult.data;

	return (
		<div className="flex flex-col gap-8 p-6 md:p-8 max-w-7xl mx-auto w-full">
			<div className="flex flex-col gap-1">
				<h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
				<p className="text-muted-foreground">Real-time metrics for workforce compliance and training.</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard 
					title="Workforce Size" 
					value={stats.totalEmployees} 
					description="Active employees" 
					icon={Users}
					trend="+2"
					trendType="positive"
				/>
				<StatCard 
					title="Compliance Rate" 
					value={`${stats.complianceRate}%`} 
					description="Requirements met" 
					icon={CheckCircle2}
					trend={stats.complianceRate >= 90 ? "Target Met" : "Below Target"}
					trendType={stats.complianceRate >= 90 ? "positive" : "negative"}
					className={stats.complianceRate < 80 ? "border-red-500/20" : ""}
				/>
				<StatCard 
					title="Skills Gap" 
					value={stats.gapCount} 
					description="Missing requirements" 
					icon={AlertTriangle}
					trend={stats.gapCount === 0 ? "Perfect" : "Action Needed"}
					trendType={stats.gapCount === 0 ? "positive" : "negative"}
				/>
				<StatCard 
					title="Recent Revs" 
					value={stats.totalSkills} 
					description="Certified skills" 
					icon={GraduationCap}
				/>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
				{/* Main Action Banner */}
				<Card className="col-span-full overflow-hidden relative border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
					<div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none transition-transform group-hover:scale-110">
						<TrendingUp className="size-48" />
					</div>
					<CardContent className="p-8 relative h-full flex flex-col md:flex-row md:items-center justify-between gap-6">
						<div className="space-y-2">
							<div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
								Dashboard Overview
							</div>
							<h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back, Administrator</h2>
							<p className="text-muted-foreground max-w-xl text-sm leading-relaxed">
								The system is currently stable. You have <span className="text-foreground font-bold">{stats.expiringSoon} certification{stats.expiringSoon !== 1 ? 's' : ''}</span> requiring attention within the next 30 days.
							</p>
						</div>
						<div className="flex items-center gap-3 shrink-0">
							<Button asChild size="sm" className="h-9 px-4 font-bold bg-[#5e6ad2] hover:bg-[#4d59c1]">
								<Link href="/admin/matrix">Review Compliance</Link>
							</Button>
							<Button asChild variant="outline" size="sm" className="h-9 px-4 font-bold border-primary/20 hover:bg-primary/5 hover:text-primary">
								<Link href="/admin/requirements">View Analytics</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Secondary Info Area */}
				<Card className="md:col-span-4 transition-all">
					<CardHeader>
						<CardTitle className="text-lg font-semibold flex items-center gap-2">
							<Clock className="h-5 w-5 text-primary" />
							Critical Alerts
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{stats.expiringSoon > 0 ? (
							<div className="flex items-center gap-4 p-4 rounded-lg bg-red-500/5 border border-red-500/10">
								<div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-600">
									<AlertTriangle className="size-5" />
								</div>
								<div className="flex-1">
									<div className="text-sm font-bold text-red-600 dark:text-red-400">Expiring Certifications</div>
									<div className="text-xs text-muted-foreground">{stats.expiringSoon} employees need training updates this month.</div>
								</div>
								<Link href="/admin/matrix" className="text-xs font-bold text-red-600 hover:underline">Fix Now</Link>
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground text-sm italic">
								No critical alerts at this time.
							</div>
						)}

						{stats.expiredRequiredCount > 0 && (
							<div className="flex items-center gap-4 p-4 rounded-lg bg-orange-500/5 border border-orange-500/10">
								<div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-600">
									<Clock className="size-5" />
								</div>
								<div className="flex-1">
									<div className="text-sm font-bold text-orange-600 dark:text-orange-400">Expired Requirements</div>
									<div className="text-xs text-muted-foreground">{stats.expiredRequiredCount} required skills have already expired.</div>
								</div>
								<Link href="/admin/matrix" className="text-xs font-bold text-orange-600 hover:underline">Manage</Link>
							</div>
						)}
					</CardContent>
				</Card>

				<Card className="md:col-span-3 transition-all">
					<CardHeader>
						<CardTitle className="text-lg font-semibold">Quick Access</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-2">
						{[
							{ label: "Add New Employee", icon: Users, href: "/admin/employees/new" },
							{ label: "Update Matrix", icon: GraduationCap, href: "/admin/matrix" },
							{ label: "System Roles", icon: AlertTriangle, href: "/admin/users" }
						].map((item) => (
							<Link key={item.label} href={item.href} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-left text-sm font-medium">
								<item.icon className="size-4 text-muted-foreground" />
								{item.label}
							</Link>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

