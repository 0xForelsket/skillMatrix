import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { MobileNav } from "@/components/admin/mobile-nav";
import { SessionProvider } from "@/components/providers/session-provider";
import { db } from "@/db";
import { users } from "@/db/schema";

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
		<SessionProvider>
			<MobileNav>{children}</MobileNav>
		</SessionProvider>
	);
}
