"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	type Persister,
	PersistQueryClientProvider,
} from "@tanstack/react-query-persist-client";
import { useEffect, useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 1000 * 60 * 5, // 5 minutes
						gcTime: 1000 * 60 * 60 * 24, // 24 hours
					},
				},
			}),
	);

	const [persister, setPersister] = useState<Persister | null>(null);

	useEffect(() => {
		if (typeof window !== "undefined") {
			const localStoragePersister = createSyncStoragePersister({
				storage: window.localStorage,
			});
			setPersister(localStoragePersister);
		}
	}, []);

	if (!persister) {
		return (
			<QueryClientProvider client={queryClient}>
				{children}
				<ReactQueryDevtools initialIsOpen={false} />
			</QueryClientProvider>
		);
	}

	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{ persister }}
			onSuccess={() => {
				console.log("Query cache restored");
			}}
		>
			{children}
			<ReactQueryDevtools initialIsOpen={false} />
		</PersistQueryClientProvider>
	);
}
