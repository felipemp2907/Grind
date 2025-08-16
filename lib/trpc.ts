import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { useAuthStore } from '@/store/authStore';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  if (envUrl && envUrl.trim().length > 0) {
    console.log('TRPC_URL base (env):', envUrl);
    return envUrl;
  }
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    console.log('TRPC_URL base (window origin):', origin);
    return origin;
  }
  if (__DEV__) {
    console.error('EXPO_PUBLIC_API_URL is not set. Set it to your API base (e.g., http://<LAN-IP>:3000).');
  }
  return 'http://127.0.0.1:3000';
};

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      transformer: superjson,
      headers() {
        const headers: Record<string, string> = {};
        try {
          const authState = useAuthStore.getState();
          if (authState.session?.access_token) {
            headers['Authorization'] = `Bearer ${authState.session.access_token}`;
            console.log('tRPC: Added auth header');
          } else {
            console.log('tRPC: No auth token available');
          }
        } catch (error) {
          console.log('Could not get auth token for tRPC request:', error);
        }
        return headers;
      },
      fetch: async (url, options) => {
        console.log('tRPC request →', url, options?.method);
        const res = await fetch(url, options);
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('text/html')) {
          throw new Error(`Invalid tRPC endpoint. Got HTML from ${url}. Set EXPO_PUBLIC_API_URL to your API, e.g., http://<LAN-IP>:3000`);
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.trim().startsWith('<')) {
            throw new Error(`Invalid tRPC endpoint. Got HTML from ${url}. Set EXPO_PUBLIC_API_URL to your API, e.g., http://<LAN-IP>:3000`);
          }
          try {
            const data = JSON.parse(text);
            throw new Error(data?.message ?? `HTTP ${res.status}`);
          } catch {
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
          }
        }
        return res;
      },
    }),
  ],
});