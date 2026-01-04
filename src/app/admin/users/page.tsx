import { format } from "date-fns";
import { MoreHorizontal, Search, Shield, User as UserIcon } from "lucide-react";
import { listUsers } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { CreateUserButton } from "./create-user-button";

export default async function UsersPage() {
	const usersResult = await listUsers();

	if (!usersResult.success) {
		return (
			<div className="p-8 text-center text-destructive">
				Failed to load users: {usersResult.error}
			</div>
		);
	}

	const users = usersResult.data || [];

	return (
		<div className="flex flex-col gap-6 p-6 md:p-8">
			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h2 className="text-2xl font-bold tracking-tight">Users</h2>
					<p className="text-muted-foreground">
						Manage system access and roles.
					</p>
				</div>
				<CreateUserButton />
			</div>

			{/* Filters Bar */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<input
						type="search"
						placeholder="Search users..."
						className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
			</div>

			<div className="rounded-md border bg-card text-card-foreground shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full caption-bottom text-sm">
						<thead className="[&_tr]:border-b">
							<tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
								<th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
									User
								</th>
								<th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
									Role
								</th>
								<th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
									Status
								</th>
								<th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
									Created
								</th>
								<th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="[&_tr]:border-b [&_tr:last-child]:border-0">
							{users.length === 0 ? (
								<tr>
									<td
										colSpan={5}
										className="p-4 text-center text-muted-foreground"
									>
										No users found.
									</td>
								</tr>
							) : (
								users.map((user) => (
									<tr
										key={user.id}
										className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
									>
										<td className="p-4 align-middle">
											<div className="flex items-center gap-3">
												<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
													<UserIcon className="h-4 w-4" />
												</div>
												<div className="font-medium text-sm">{user.email}</div>
											</div>
										</td>
										<td className="p-4 align-middle">
											<div className="flex items-center gap-2">
												{user.appRole === "admin" && (
													<Shield className="h-3 w-3 text-amber-500" />
												)}
												<span className="capitalize">
													{user.appRole?.replace("_", " ")}
												</span>
											</div>
										</td>
										<td className="p-4 align-middle">
											<span
												className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
													user.status === "active"
														? "bg-green-50 text-green-700 ring-green-600/20"
														: "bg-red-50 text-red-700 ring-red-600/20"
												}`}
											>
												{user.status}
											</span>
										</td>
										<td className="p-4 align-middle text-muted-foreground">
											{format(user.createdAt, "MMM d, yyyy")}
										</td>
										<td className="p-4 align-middle text-right">
											<Button variant="ghost" size="icon">
												<MoreHorizontal className="h-4 w-4" />
											</Button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
