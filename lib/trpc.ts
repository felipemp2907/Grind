import { Platform } from 'react-native';
import Constants from 'expo-constants';
import superjson from 'superjson';
import { createTRPCReact, type CreateTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/backend/trpc/app-router';
import { useAuthStore } from '@/store/authStore';

let lastError: unknown = null;

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

async function withTimeout<T>(p: Promise<T>, ms = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export async function pingHealth() {
  const base = resolveApiBaseUrl();
  try {
    const res = await withTimeout(fetch(`${base}/health`, { method: 'GET' }), 5000);
    const json = await res.json();
    lastError = null;
    return { ok: true as const, base, json };
  } catch (e) {
    lastError = e;
    return { ok: false as const, base, error: String(e) };
  }
}

export function getLastError() { return lastError; }
export function getBaseUrl() { return resolveApiBaseUrl(); }

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter, unknown>();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      transformer: superjson,
      url: `${resolveApiBaseUrl()}/trpc`,
      async fetch(url, opts) {
        const headers = new Headers(opts?.headers || {});
        try {
          const token = useAuthStore.getState().session?.access_token;
          if (token) headers.set('authorization', `Bearer ${token}`);
        } catch (e) {}

        try {
          return await withTimeout(fetch(url, { ...opts, headers }), 5000);
        } catch (e) {
          lastError = e;
          try { return await withTimeout(fetch(url, { ...opts, headers }), 5000); }
          catch (e2) { lastError = e2; throw e2; }
        }
      },
    }),
  ],
});

export const makeTrpcClient = (getToken?: () => Promise<string | null>) =>
  createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        transformer: superjson,
        url: `${resolveApiBaseUrl()}/trpc`,
        async fetch(url, opts) {
          const headers = new Headers(opts?.headers || {});
          if (getToken) {
            try { const t = await getToken(); if (t) headers.set('authorization', `Bearer ${t}`); } catch {}
          }
          try {
            return await withTimeout(fetch(url, { ...opts, headers }), 5000);
          } catch (e) {
            lastError = e;
            try { return await withTimeout(fetch(url, { ...opts, headers }), 5000); }
            catch (e2) { lastError = e2; throw e2; }
          }
        },
      }),
    ],
  });

export const checkApiConnectivity = async (): Promise<{ connected: boolean; url?: string; procedures?: string[]; error?: string; }> => {
  const base = resolveApiBaseUrl();
  try {
    const res = await withTimeout(fetch(`${base}/health`, { method: 'GET' }), 5000);
    if (!res.ok) return { connected: false, url: base, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { connected: true, url: base, procedures: data?.procedures ?? [] };
  } catch (e: any) {
    return { connected: false, url: base, error: e?.message ?? String(e) };
  }
};