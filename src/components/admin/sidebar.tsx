
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
	BarChart3,
	BookOpen,
	Users,
    Shield,
    FileText,
    Settings,
    LayoutDashboard,
    LogOut,
    CheckCircle
} from "lucide-react";
import { usePermissions } from "@/hooks/use-auth";
import { signOut } from "next-auth/react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
	const pathname = usePathname();
    const permissions = usePermissions([
        "users:view",
        "employees:view",
        "skills:view",
        "audit:view"
    ]);

	const items = [
		{
			title: "Dashboard",
			icon: LayoutDashboard,
			href: "/admin",
            show: true,
		},
		{
			title: "Employees",
			icon: Users,
			href: "/admin/employees",
            show: permissions["employees:view"],
		},
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
	];

	return (
		<div className={cn("pb-12 w-64 border-r bg-card h-full flex flex-col", className)}>
			<div className="space-y-4 py-4 flex-1">
				<div className="px-3 py-2">
                    <div className="flex items-center gap-2 mb-6 px-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <BarChart3 className="size-5" />
                        </div>
					    <h2 className="text-xl font-bold tracking-tight">Caliber</h2>
                    </div>
					<div className="space-y-1">
						{items.map((item) => (
                            item.show && (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                                        pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                                            ? "bg-accent text-accent-foreground"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.title}
                                </Link>
                            )
						))}
					</div>
				</div>
			</div>
            <div className="p-4 border-t">
                 <button 
                    type="button"
                    onClick={() => signOut()}
                    className="flex w-full items-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </button>
            </div>
		</div>
	);
}
