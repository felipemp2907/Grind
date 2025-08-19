import { Platform } from 'react-native';
import Constants from 'expo-constants';
import superjson from 'superjson';
import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/backend/trpc/app-router';
import { useAuthStore } from '@/store/authStore';

let lastError: unknown = null;

const DEFAULT_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_TRPC_TIMEOUT_MS ?? 20000);
const LONG_TIMEOUT: Record<string, number> = {
  'goals.createUltimate': Number(process.env.EXPO_PUBLIC_TRPC_LONG_TIMEOUT_MS ?? 90000),
  'goals.reseed': Number(process.env.EXPO_PUBLIC_TRPC_LONG_TIMEOUT_MS ?? 90000),
};

function deriveLanFromExpo(): string | null {
  try {
    const hostUri: string | undefined = (Constants as any)?.expoConfig?.hostUri || (Constants as any)?.manifest?.debuggerHost;
    if (!hostUri) return null;
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:3000`;
  } catch (e) {
    console.log('[trpc] deriveLanFromExpo failed', e);
  }
  return null;
}

export function resolveApiBaseUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '');
  if (envUrl) return envUrl;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  const lan = deriveLanFromExpo();
  if (lan) return lan;

  console.warn('[trpc] Falling back to http://localhost:3000. Set EXPO_PUBLIC_API_URL to your API base.');
  return 'http://localhost:3000';
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}
function sleep(ms: number) { return new Promise((res) => setTimeout(res, ms)); }

export function getLastError() { return lastError; }
export function getBaseUrl() { return resolveApiBaseUrl(); }

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter, unknown>();

export function resolveTimeoutFromUrl(url: string): number {
  try {
    const m = /trpc\/([^?]+)/.exec(url);
    const path = m?.[1] ?? '';
    return LONG_TIMEOUT[path] ?? DEFAULT_TIMEOUT_MS;
  } catch {
    return DEFAULT_TIMEOUT_MS;
  }
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: superjson,
      url: `${resolveApiBaseUrl()}/api/trpc`,
      async fetch(url, opts) {
        const headers = new Headers(opts?.headers || {});
        try {
          const token = useAuthStore.getState().session?.access_token;
          if (token) headers.set('authorization', `Bearer ${token}`);
        } catch {}

        const timeout = resolveTimeoutFromUrl(String(url));
        const tryFetch = () => fetch(url, { ...opts, headers, keepalive: true as any });
        let attempt = 0;
        let lastErr: unknown;
        while (attempt < 3) {
          try {
            return await withTimeout(tryFetch(), timeout);
          } catch (e) {
            lastErr = e;
            lastError = e;
            attempt++;
            if (attempt >= 3) break;
            const backoff = 1000 * attempt;
            console.log(`[trpc] retrying request in ${backoff}ms (attempt ${attempt + 1}/3)`);
            await sleep(backoff);
          }
        }
        throw lastErr as any;
      },
    }),
  ],
});

export const makeTrpcClient = (getToken?: () => Promise<string | null>) =>
  createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        transformer: superjson,
        url: `${resolveApiBaseUrl()}/api/trpc`,
        async fetch(url, opts) {
          const headers = new Headers(opts?.headers || {});
          if (getToken) {
            try { const t = await getToken(); if (t) headers.set('authorization', `Bearer ${t}`); } catch {}
          }
          const timeout = resolveTimeoutFromUrl(String(url));
          const tryFetch = () => fetch(url, { ...opts, headers, keepalive: true as any });
          let attempt = 0;
          let lastErr: unknown;
          while (attempt < 3) {
            try {
              return await withTimeout(tryFetch(), timeout);
            } catch (e) {
              lastErr = e;
              lastError = e;
              attempt++;
              if (attempt >= 3) break;
              const backoff = 1000 * attempt;
              console.log(`[trpc] retrying request in ${backoff}ms (attempt ${attempt + 1}/3)`);
              await sleep(backoff);
            }
          }
          throw lastErr as any;
        },
      }),
    ],
  });

export const checkApiConnectivity = async (): Promise<{ connected: boolean; url?: string; procedures?: string[]; error?: string; }> => {
  const base = resolveApiBaseUrl();
  try {
    const res = await withTimeout(fetch(`${base}/health`, { method: 'GET' }), 8000);
    if (!res.ok) return { connected: false, url: base, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { connected: true, url: base, procedures: data?.procedures ?? [] };
  } catch (e: any) {
    return { connected: false, url: base, error: e?.message ?? String(e) };
  }
};
// Friendly alias used by UI code
export const pingHealth = checkApiConnectivity;