
import { GalleryVerticalEnd } from "lucide-react";
import { LoginForm } from "./login-form";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const { error } = await searchParams;

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<div className="flex items-center gap-2 self-center font-medium">
					<div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
						<GalleryVerticalEnd className="size-4" />
					</div>
					Caliber
				</div>
				<div className="flex flex-col gap-6">
					<div className="rounded-xl border bg-card text-card-foreground shadow">
						<div className="p-6 md:p-8">
							<LoginForm errorId={error} />
						</div>
					</div>
				</div>
				<div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
					By clicking continue, you agree to our <a href="/terms">Terms of Service</a>{" "}
					and <a href="/privacy">Privacy Policy</a>.
				</div>
			</div>
		</div>
	);
}
