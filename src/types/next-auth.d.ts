import { DefaultSession } from "next-auth";

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			role: string;
		} & DefaultSession["user"];
	}

	interface User {
		appRole?: string;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		role?: string;
	}
}
