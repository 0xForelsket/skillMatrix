
"use client";

import { useActionState, useState } from "react";
import { createUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, X } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";

// Simple modal since we don't have Radix Dialog yet
function Modal({
	isOpen,
	onClose,
	children,
}: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
			<div className="w-full max-w-md bg-card rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
				<div className="flex justify-end p-2">
					<button
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
                <div className="px-6 pb-6">
				    {children}
                </div>
			</div>
		</div>
	);
}

const initialState = {
	success: false,
	error: "",
    data: null as any
};

export function CreateUserButton() {
    const { user } = useCurrentUser();
	const [isOpen, setIsOpen] = useState(false);
	const [state, formAction, isPending] = useActionState(
		async (prevState: any, formData: FormData) => {
            const rawData = Object.fromEntries(formData);
            const result = await createUser({
                email: rawData.email as string,
                password: rawData.password as string,
                appRole: rawData.appRole as any,
                performerId: user?.id,
            });
            
            if (result.success) {
                setIsOpen(false);
                return { success: true, error: "", data: result.data };
            }
            return { success: false, error: JSON.stringify(result.error), data: null };
        },
		initialState,
	);

	return (
		<>
			<Button onClick={() => setIsOpen(true)}>
				<Plus className="mr-2 h-4 w-4" />
				Add User
			</Button>

			<Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
				<div className="flex flex-col gap-4">
					<div className="space-y-2 text-center">
						<h3 className="text-lg font-semibold">Create New User</h3>
						<p className="text-sm text-muted-foreground">
							Add a new user to the system. They will receive an email to set up their
							account.
						</p>
					</div>
					<form action={formAction} className="flex flex-col gap-4">
						<div className="grid gap-2">
							<label htmlFor="email" className="text-sm font-medium">Email</label>
							<input
								id="email"
								name="email"
								type="email"
								required
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="alice@example.com"
							/>
						</div>
                        <div className="grid gap-2">
							<label htmlFor="password" className="text-sm font-medium">Temporary Password</label>
							<input
								id="password"
								name="password"
								type="password"
								required
                                minLength={8}
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="********"
							/>
						</div>
						<div className="grid gap-2">
							<label htmlFor="appRole" className="text-sm font-medium">Role</label>
							<select
								id="appRole"
								name="appRole"
								className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
							>
								<option value="viewer">Viewer</option>
								<option value="trainer">Trainer</option>
								<option value="auditor">Auditor</option>
								<option value="skill_manager">Skill Manager</option>
								<option value="admin">Admin</option>
							</select>
						</div>
                        {state.error && (
                            <p className="text-sm text-destructive">{state.error}</p>
                        )}
						<Button type="submit" disabled={isPending}>
							{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Create User
						</Button>
					</form>
				</div>
			</Modal>
		</>
	);
}
