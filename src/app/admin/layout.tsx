
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();

	if (!session?.user?.id) {
		redirect("/login");
	}

	const user = await db.query.users.findFirst({
		where: eq(users.id, session.user.id),
		columns: { status: true },
	});

	if (!user || user.status !== "active") {
		await signOut({ redirectTo: "/login?error=disabled" });
	}

	return (
		<div className="flex h-screen w-full flex-col">
			<main className="flex-1 overflow-auto bg-gray-50">{children}</main>
		</div>
	);
}
