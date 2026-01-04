"use client";

import {
	BarChart3,
	BookOpen,
	CheckCircle,
	FileText,
	Grid3X3,
	LayoutDashboard,
	LogOut,
	Shield,
	Users,
	type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { usePermissions } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface NavItem {
	title: string;
	icon: LucideIcon;
	href: string;
	show: boolean;
}

interface NavSection {
	label: string;
	items: NavItem[];
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
	const pathname = usePathname();
	const permissions = usePermissions([
		"users:view",
		"employees:view",
		"skills:view",
		"audit:view",
	]);

	const sections: NavSection[] = [
		{
			label: "Overview",
			items: [
				{
					title: "Dashboard",
					icon: LayoutDashboard,
					href: "/admin",
					show: true,
				},
			],
		},
		{
			label: "Workforce",
			items: [
				{
					title: "Employees",
					icon: Users,
					href: "/admin/employees",
					show: permissions["employees:view"],
				},
				{
					title: "Skill Matrix",
					icon: Grid3X3,
					href: "/admin/matrix",
					show: permissions["skills:view"],
				},
			],
		},
		{
			label: "Configuration",
			items: [
				{
					title: "Skills Catalog",
					icon: BookOpen,
					href: "/admin/skills",
					show: permissions["skills:view"],
				},
				{
					title: "Requirements",
					icon: CheckCircle,
					href: "/admin/requirements",
					show: permissions["skills:view"],
				},
			],
		},
		{
			label: "Administration",
			items: [
				{
					title: "User Access",
					icon: Shield,
					href: "/admin/users",
					show: permissions["users:view"],
				},
				{
					title: "Audit Logs",
					icon: FileText,
					href: "/admin/audit",
					show: permissions["audit:view"],
				},
			],
		},
	];

	const isActive = (href: string) =>
		pathname === href ||
		(href !== "/admin" && pathname.startsWith(href));

	return (
		<div
			className={cn(
				"w-64 border-r bg-sidebar h-full flex flex-col",
				className,
			)}
		>
			{/* Logo Section - hidden on mobile (shown in mobile header instead) */}
			<div className="hidden lg:block p-6 border-b border-sidebar-border">
				<Link href="/admin" className="flex items-center gap-3 group">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
						<BarChart3 className="size-5" />
					</div>
					<div>
						<h1 className="text-lg font-bold tracking-tight text-sidebar-foreground">
							Caliber
						</h1>
						<p className="text-xs text-muted-foreground">Skill Matrix</p>
					</div>
				</Link>
			</div>

			{/* Navigation */}
			<nav className="flex-1 overflow-y-auto p-4 space-y-6">
				{sections.map((section) => {
					const visibleItems = section.items.filter((item) => item.show);
					if (visibleItems.length === 0) return null;

					return (
						<div key={section.label}>
							<h2 className="text-label px-3 mb-2">{section.label}</h2>
							<div className="space-y-1">
								{visibleItems.map((item) => (
									<Link
										key={item.href}
										href={item.href}
										className={cn(
											"flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
											isActive(item.href)
												? "bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary pl-[10px]"
												: "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
										)}
									>
										<item.icon
											className={cn(
												"h-4 w-4 shrink-0",
												isActive(item.href) && "text-sidebar-primary",
											)}
										/>
										{item.title}
									</Link>
								))}
							</div>
						</div>
					);
				})}
			</nav>

			{/* Footer */}
			<div className="p-4 border-t border-sidebar-border">
				<button
					type="button"
					onClick={() => signOut()}
					className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
				>
					<LogOut className="h-4 w-4" />
					Sign Out
				</button>
			</div>
		</div>
	);
}
