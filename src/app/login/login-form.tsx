"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { authenticate } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ errorId }: { errorId?: string }) {
	const [errorMessage, formAction, isPending] = useActionState(
		authenticate,
		undefined,
	);

	const urlError =
		errorId === "disabled"
			? "Your account has been disabled."
			: errorId
				? "Authentication failed. Please try again."
				: null;

	const displayError = errorMessage || urlError;

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col items-center gap-2 text-center">
				<h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
				<p className="text-sm text-muted-foreground leading-relaxed">
					Enter your credentials to access the Caliber dashboard.
				</p>
			</div>
			<div className="grid gap-6">
				<form action={formAction}>
					<div className="grid gap-4">
						<div className="grid gap-1.5">
							<Label
								htmlFor="email"
								className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
							>
								Email Address
							</Label>
							<Input
								id="email"
								type="email"
								name="email"
								placeholder="admin@caliber.io"
								required
								className="h-10 border-muted-foreground/20 focus-visible:ring-primary/20"
							/>
						</div>
						<div className="grid gap-1.5">
							<div className="flex items-center">
								<Label
									htmlFor="password"
									className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
								>
									Password
								</Label>
								<a
									href="/forgot-password"
									className="ml-auto text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
								>
									Forgot?
								</a>
							</div>
							<Input
								id="password"
								type="password"
								name="password"
								required
								className="h-10 border-muted-foreground/20 focus-visible:ring-primary/20"
							/>
						</div>
						<Button
							type="submit"
							disabled={isPending}
							className="h-10 w-full mt-2 font-bold text-xs uppercase tracking-widest shadow-md"
						>
							{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Sign In
						</Button>
						
						{displayError && (
							<div
								className="flex items-center rounded-md border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1"
								role="alert"
							>
								<p>{displayError}</p>
							</div>
						)}
					</div>
				</form>
				<div className="relative text-center text-[10px] font-bold uppercase tracking-widest after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border/50">
					<span className="relative z-10 bg-card px-3 text-muted-foreground/50">
						Enterprise Access
					</span>
				</div>
				<div className="flex flex-col items-center gap-2">
					<p className="text-[11px] text-muted-foreground text-center leading-relaxed">
						SSO is restricted to registered company domains.<br />
						<span className="font-semibold text-primary/70">Contact IT Support</span> to link your identity provider.
					</p>
				</div>
			</div>
		</div>
	);
}
