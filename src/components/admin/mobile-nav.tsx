"use client";

import { BarChart3, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface MobileNavProps {
	children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();

	// Close menu on route change
	useEffect(() => {
		setIsOpen(false);
	}, [pathname]);

	// Prevent body scroll when menu is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	return (
		<div className="flex h-screen w-full flex-col lg:flex-row overflow-hidden">
			{/* Mobile Header - only visible on mobile */}
			<header className="lg:hidden flex items-center justify-between h-14 px-4 border-b bg-sidebar shrink-0">
				<Link href="/admin" className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
						<BarChart3 className="size-4" />
					</div>
					<span className="font-bold">Caliber</span>
				</Link>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setIsOpen(!isOpen)}
					aria-label={isOpen ? "Close menu" : "Open menu"}
				>
					{isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</Button>
			</header>

			{/* Mobile Sidebar Overlay - only on mobile when open */}
			<div
				className={cn(
					"lg:hidden fixed inset-0 top-14 z-40 bg-black/50 transition-opacity duration-200",
					isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
				)}
				onClick={() => setIsOpen(false)}
			/>

			{/* Sidebar - slides in on mobile, fixed on desktop */}
			<div
				className={cn(
					// Mobile: absolute positioned drawer
					"fixed inset-y-0 left-0 top-14 z-50 w-64 transform transition-transform duration-300 ease-in-out",
					// Desktop: relative positioned, always visible
					"lg:relative lg:top-0 lg:z-auto lg:translate-x-0 lg:transition-none",
					// Mobile open/close state
					isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
				)}
			>
				<Sidebar className="h-full" />
			</div>

			{/* Main Content */}
			<main className="flex-1 overflow-auto bg-background bg-grid">
				<div className="min-h-full">{children}</div>
			</main>
		</div>
	);
}
