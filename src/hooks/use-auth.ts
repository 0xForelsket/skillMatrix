
import { useSession } from "next-auth/react";
import { type Permission, hasPermission, type Role } from "@/lib/permissions";

export function useCurrentUser() {
	const session = useSession();
	return {
		user: session.data?.user,
		isAuthenticated: session.status === "authenticated",
		isLoading: session.status === "loading",
		role: session.data?.user?.role as Role | undefined,
	};
}

export function usePermission(permission: Permission) {
	const { user } = useCurrentUser();
	return hasPermission(user?.role as Role | undefined, permission);
}

/**
 * Hook to check multiple permissions at once.
 * Returns { [permission]: boolean }
 */
export function usePermissions(permissions: Permission[]) {
	const { user } = useCurrentUser();
	
	return permissions.reduce((acc, permission) => {
		acc[permission] = hasPermission(user?.role as Role | undefined, permission);
		return acc;
	}, {} as Record<Permission, boolean>);
}
