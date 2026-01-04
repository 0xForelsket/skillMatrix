import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
	// We can't use hooks in server components, wait.
	// This is a server component.

	return (
		<div className="p-8">
			<h1 className="text-3xl font-bold mb-8">Dashboard</h1>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Employees
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">--</div>
						<p className="text-xs text-muted-foreground">+0% from last month</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Skill Coverage
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">--%</div>
						<p className="text-xs text-muted-foreground">Target: 95%</p>
					</CardContent>
				</Card>
			</div>

			<div className="mt-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
				<h3 className="font-semibold">Welcome to Caliber</h3>
				<p>Select a module from the sidebar to get started.</p>
			</div>
		</div>
	);
}
