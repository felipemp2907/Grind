import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { useAuthStore } from '@/store/authStore';
import { Platform } from 'react-native';

export const trpc = createTRPCReact<AppRouter>();

async function tryFetchHealth(base: string): Promise<{ procedures: string[] } | null> {
  try {
    const url = `${base.replace(/\/$/, '')}/health`;
    const res = await fetch(url, { method: 'GET' });
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return null;
    const json = (await res.json()) as { procedures?: unknown };
    const list = Array.isArray(json.procedures) ? (json.procedures as string[]) : [];
    if (list.includes('goals.createUltimate') || list.includes('health.ping')) return { procedures: list };
    return null;
  } catch {
    return null;
  }
}

function deriveFromExpoOrigin(): string | null {
  const anyGlobal = global as unknown as { __expo?: { plugins?: { Manifest?: { hostUri?: string } } } };
  const hostUri = anyGlobal.__expo?.plugins?.Manifest?.hostUri;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000`;
  }
  return null;
}

export const getApiBaseUrl = async (): Promise<string> => {
  const candidates: string[] = [];
  const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  if (envUrl) candidates.push(envUrl);
  if (Platform.OS === 'android') candidates.push('http://10.0.2.2:3000');
  if (Platform.OS === 'ios') candidates.push('http://localhost:3000');
  const derived = deriveFromExpoOrigin();
  if (derived) candidates.push(derived);
  candidates.push('http://127.0.0.1:3000');

  for (const base of candidates) {
    const ok = await tryFetchHealth(base);
    if (ok) return base.replace(/\/$/, '');
  }
  return candidates[0]?.replace(/\/$/, '') || 'http://127.0.0.1:3000';
};

let resolvedBasePromise: Promise<string> | null = null;
const ensureBase = () => {
  if (!resolvedBasePromise) resolvedBasePromise = getApiBaseUrl();
  return resolvedBasePromise;
};

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc',
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
        const base = await ensureBase();
        let finalUrl = `${base}/trpc${url.toString().replace(/^.*\/trpc/, '')}`;
        console.log('tRPC request →', finalUrl, options?.method);
        let res = await fetch(finalUrl, options);
        if (res.status === 404) {
          const alt = `${base}/api/trpc${url.toString().replace(/^.*\/trpc/, '')}`;
          console.log('tRPC 404 → retrying with', alt);
          res = await fetch(alt, options);
          finalUrl = alt;
        }
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('text/html')) {
          throw new Error(`Invalid tRPC endpoint. Got HTML from ${finalUrl}. Set EXPO_PUBLIC_API_URL to your API, e.g., http://<LAN-IP>:3000`);
        }
        if (!res.ok) {
          const text = await res.text();
          if (text.trim().startsWith('<')) {
            throw new Error(`Invalid tRPC endpoint. Got HTML from ${finalUrl}. Set EXPO_PUBLIC_API_URL to your API, e.g., http://<LAN-IP>:3000`);
          }
          try {
            const data = JSON.parse(text as string);
            throw new Error((data as any)?.message ?? `HTTP ${res.status}`);
          } catch {
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
          }
        }
        return res;
      },
    }),
  ],
});

(async () => {
  const base = await ensureBase();
  console.log('TRPC_URL', `${base}/trpc`);
})();
