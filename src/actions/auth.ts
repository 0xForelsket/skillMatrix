"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function authenticate(
	_prevState: string | undefined,
	formData: FormData,
) {
	try {
		// We use redirect: false if we wanted to handle it manually, but
		// default behavior helps with callbackUrl handling.
		// However, standard NextAuth v5 example uses redirect: undefined (default true).
		await signIn("credentials", formData);
	} catch (error) {
		if (error instanceof AuthError) {
			switch (error.type) {
				case "CredentialsSignin":
					return "Invalid email or password.";
				default:
					return "Something went wrong.";
			}
		}
		throw error;
	}
}
