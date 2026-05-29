import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Cache TTL policy:
			// Dashboard/stats: 5 min | GIS/reference: 10 min | Real-time alerts: 30s
			staleTime: 5 * 60 * 1000, // 5 minutes default
		},
	},
});