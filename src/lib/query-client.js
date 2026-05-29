import { QueryClient } from '@tanstack/react-query';

// Environment-aware cache TTL
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const isDev = host.includes('localhost') || host.includes('127.0.0.1');
const isStaging = host.includes('staging');

// Development: 30s | Staging: 2min | Production: 5min
const DEFAULT_STALE_TIME = isDev ? 30_000 : isStaging ? 2 * 60_000 : 5 * 60_000;

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			// Cache TTL policy (environment-aware):
			// Dev: 30s | Staging: 2min | Production: 5min
			// Real-time data (fraud alerts, disputes): override with staleTime: 0 at call site
			// GIS layers: override with staleTime: 10 * 60 * 1000 at call site
			// Reference data (roles, LGAs): override with staleTime: 60 * 60 * 1000 at call site
			staleTime: DEFAULT_STALE_TIME,
		},
	},
});