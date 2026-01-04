"use client";

import {
	AlertTriangle,
	Check,
	Link2,
	Loader2,
	Unlink,
	User,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
	getAvailableUsersForLinking,
	linkUserToEmployee,
	unlinkUserFromEmployee,
} from "@/actions/employees";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";

interface UserLinkManagerProps {
	employeeId: string;
	employeeName: string;
	currentUserId: string | null;
	currentUserEmail: string | null;
}

type AvailableUser = {
	id: string;
	email: string;
	appRole: string | null;
	status: string | null;
	isLinked: boolean;
};

export function UserLinkManager({
	employeeId,
	employeeName,
	currentUserId,
	currentUserEmail,
}: UserLinkManagerProps) {
	const { user: currentSessionUser } = useCurrentUser();
	const [isOpen, setIsOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	// Load available users when modal opens
	useEffect(() => {
		if (isOpen) {
			getAvailableUsersForLinking().then((result) => {
				if (result.success && result.data) {
					setAvailableUsers(result.data);
				}
			});
		}
	}, [isOpen]);

	const handleLink = () => {
		if (!selectedUserId) {
			setError("Please select a user");
			return;
		}

		setError(null);
		startTransition(async () => {
			const result = await linkUserToEmployee({
				employeeId,
				userId: selectedUserId,
				performerId: currentSessionUser?.id,
			});

			if (result.success) {
				setSuccess(true);
				setTimeout(() => {
					setIsOpen(false);
					setSuccess(false);
					setSelectedUserId("");
				}, 1500);
			} else {
				setError(result.error as string);
			}
		});
	};

	const handleUnlink = () => {
		setError(null);
		startTransition(async () => {
			const result = await unlinkUserFromEmployee({
				employeeId,
				performerId: currentSessionUser?.id,
			});

			if (result.success) {
				setSuccess(true);
				setTimeout(() => {
					setIsOpen(false);
					setSuccess(false);
				}, 1500);
			} else {
				setError(result.error as string);
			}
		});
	};

	const handleClose = () => {
		setIsOpen(false);
		setError(null);
		setSuccess(false);
		setSelectedUserId("");
	};

	return (
		<>
			{/* Current Link Status Display */}
			{currentUserId ? (
				<div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
					<User className="h-4 w-4 text-green-600" />
					<div className="flex-1 min-w-0">
						<div className="text-sm font-medium text-green-700 dark:text-green-400">
							Linked User Account
						</div>
						<div className="text-xs text-green-600 dark:text-green-500 truncate">
							{currentUserEmail}
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setIsOpen(true)}
						className="text-green-600 hover:text-green-700 hover:bg-green-100"
					>
						<Unlink className="h-4 w-4" />
					</Button>
				</div>
			) : (
				<Button
					variant="outline"
					size="sm"
					onClick={() => setIsOpen(true)}
					className="w-full"
				>
					<Link2 className="mr-2 h-4 w-4" />
					Link User Account
				</Button>
			)}

			{/* Modal */}
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
					<div className="w-full max-w-md bg-card rounded-xl border shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
						<div className="p-6">
							{success ? (
								<div className="text-center py-4">
									<div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
										<Check className="h-6 w-6 text-green-600" />
									</div>
									<h3 className="mt-4 text-lg font-semibold text-green-700">
										{currentUserId ? "User Unlinked" : "User Linked"}
									</h3>
								</div>
							) : currentUserId ? (
								<>
									{/* Unlink Confirmation */}
									<div className="flex items-start gap-4">
										<div className="rounded-full bg-amber-100 p-2 shrink-0">
											<AlertTriangle className="h-6 w-6 text-amber-600" />
										</div>
										<div>
											<h3 className="text-lg font-semibold">
												Unlink User Account?
											</h3>
											<p className="mt-1 text-sm text-muted-foreground">
												This will remove the link between{" "}
												<strong>{employeeName}</strong> and the user account{" "}
												<strong>{currentUserEmail}</strong>.
											</p>
											<p className="mt-2 text-sm text-muted-foreground">
												The user will no longer be able to view this employee's
												skills as their own.
											</p>
										</div>
									</div>

									{error && (
										<div className="mt-4 p-3 rounded-md bg-red-50 text-sm text-red-600 border border-red-200">
											{error}
										</div>
									)}

									<div className="mt-6 flex justify-end gap-2">
										<Button
											variant="outline"
											onClick={handleClose}
											disabled={isPending}
										>
											Cancel
										</Button>
										<Button
											variant="destructive"
											onClick={handleUnlink}
											disabled={isPending}
										>
											{isPending && (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											)}
											Unlink User
										</Button>
									</div>
								</>
							) : (
								<>
									{/* Link User Form */}
									<h3 className="text-lg font-semibold">Link User Account</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										Link a user account to <strong>{employeeName}</strong>. This
										allows the user to see their own skills.
									</p>

									<div className="mt-4">
										<label
											htmlFor="user-select"
											className="text-sm font-medium"
										>
											Select User
										</label>
										<select
											id="user-select"
											value={selectedUserId}
											onChange={(e) => setSelectedUserId(e.target.value)}
											className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
										>
											<option value="">Choose a user...</option>
											{availableUsers
												.filter((u) => !u.isLinked && u.status === "active")
												.map((u) => (
													<option key={u.id} value={u.id}>
														{u.email} ({u.appRole})
													</option>
												))}
										</select>
										{availableUsers.filter((u) => u.isLinked).length > 0 && (
											<p className="mt-2 text-xs text-muted-foreground">
												{availableUsers.filter((u) => u.isLinked).length} users
												are already linked to other employees
											</p>
										)}
									</div>

									{error && (
										<div className="mt-4 p-3 rounded-md bg-red-50 text-sm text-red-600 border border-red-200">
											{error}
										</div>
									)}

									<div className="mt-6 flex justify-end gap-2">
										<Button
											variant="outline"
											onClick={handleClose}
											disabled={isPending}
										>
											Cancel
										</Button>
										<Button
											onClick={handleLink}
											disabled={isPending || !selectedUserId}
										>
											{isPending && (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											)}
											Link User
										</Button>
									</div>
								</>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
