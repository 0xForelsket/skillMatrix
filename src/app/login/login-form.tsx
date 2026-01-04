"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { authenticate } from "@/actions/auth";

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
				<h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
				<p className="text-sm text-muted-foreground">
					Enter your email below to login to your account
				</p>
			</div>
			<div className="grid gap-6">
				<form action={formAction}>
					<div className="grid gap-4">
						<div className="grid gap-2">
							<label
								htmlFor="email"
								className="text-sm font-medium leading-none"
							>
								Email
							</label>
							<input
								id="email"
								type="email"
								name="email"
								placeholder="m@example.com"
								required
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							/>
						</div>
						<div className="grid gap-2">
							<div className="flex items-center">
								<label
									htmlFor="password"
									className="text-sm font-medium leading-none"
								>
									Password
								</label>
								<a
									href="/forgot-password"
									className="ml-auto text-sm underline-offset-4 hover:underline"
								>
									Forgot your password?
								</a>
							</div>
							<input
								id="password"
								type="password"
								name="password"
								required
								className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
							/>
						</div>
						<button
							type="submit"
							disabled={isPending}
							className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
						>
							{isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Sign In
						</button>
						{displayError && (
							<div
								className="flex items-center rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
								role="alert"
							>
								<p>{displayError}</p>
							</div>
						)}
					</div>
				</form>
				<div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
					<span className="relative z-10 bg-background px-2 text-muted-foreground">
						Or continue with
					</span>
				</div>
				<div className="flex justify-center text-xs text-muted-foreground">
					<p>Contact IT for SSO access.</p>
				</div>
			</div>
		</div>
	);
}
