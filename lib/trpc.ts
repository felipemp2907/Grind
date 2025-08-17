import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { useAuthStore } from '@/store/authStore';
import { Platform } from 'react-native';

export const trpc = createTRPCReact<AppRouter>();

// API URL detection and health checking
async function tryFetchHealth(base: string): Promise<{ procedures: string[] } | null> {
  try {
    const url = `${base.replace(/\/$/, '')}/health`;
    console.log('Trying health check:', url);
    const res = await fetch(url, { 
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) {
      console.log(`Health check failed: ${res.status} ${res.statusText}`);
      return null;
    }
    
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) {
      console.log('Health check returned non-JSON:', ct);
      return null;
    }
    
    const json = (await res.json()) as { procedures?: unknown };
    const list = Array.isArray(json.procedures) ? (json.procedures as string[]) : [];
    console.log('Health check procedures:', list);
    
    // Check for required procedures
    const hasRequired = list.includes('goals.createUltimate') || list.includes('health.ping');
    if (hasRequired) {
      console.log('✅ Health check passed for:', base);
      return { procedures: list };
    }
    
    console.log('❌ Health check failed - missing required procedures');
    return null;
  } catch (error) {
    console.log('Health check error:', error);
    return null;
  }
}

function deriveFromExpoOrigin(): string | null {
  try {
    const anyGlobal = global as unknown as { __expo?: { plugins?: { Manifest?: { hostUri?: string } } } };
    const hostUri = anyGlobal.__expo?.plugins?.Manifest?.hostUri;
    if (typeof hostUri === 'string' && hostUri.length > 0) {
      const host = hostUri.split(':')[0];
      const derived = `http://${host}:3000`;
      console.log('Derived API URL from Expo:', derived);
      return derived;
    }
  } catch (error) {
    console.log('Could not derive from Expo origin:', error);
  }
  return null;
}

export const getApiBaseUrl = async (): Promise<string> => {
  console.log('🔍 Auto-detecting API URL...');
  
  const candidates: string[] = [];
  
  // 1. Environment variable (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  if (envUrl) {
    candidates.push(envUrl);
    console.log('Added env URL:', envUrl);
  }
  
  // 2. Platform-specific defaults
  if (Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:3000');
    console.log('Added Android emulator URL');
  }
  if (Platform.OS === 'ios') {
    candidates.push('http://localhost:3000');
    console.log('Added iOS simulator URL');
  }
  
  // 3. Derived from Expo dev server
  const derived = deriveFromExpoOrigin();
  if (derived) {
    candidates.push(derived);
  }
  
  // 4. Fallbacks
  candidates.push('http://127.0.0.1:3000');
  candidates.push('http://192.168.1.100:3000'); // Common LAN IP
  
  console.log('Testing candidates:', candidates);
  
  // Test each candidate
  for (const base of candidates) {
    const health = await tryFetchHealth(base);
    if (health) {
      const finalUrl = base.replace(/\/$/, '');
      console.log('🎯 API URL detected:', finalUrl);
      return finalUrl;
    }
  }
  
  // If nothing works, return the first candidate with a warning
  const fallback = candidates[0]?.replace(/\/$/, '') || 'http://127.0.0.1:3000';
  console.warn('⚠️ No working API URL found, using fallback:', fallback);
  console.warn('💡 Set EXPO_PUBLIC_API_URL to your server URL if needed');
  
  return fallback;
};

// Cache the base URL promise
let resolvedBasePromise: Promise<string> | null = null;
const ensureBase = () => {
  if (!resolvedBasePromise) {
    resolvedBasePromise = getApiBaseUrl();
  }
  return resolvedBasePromise;
};

// Create the tRPC client
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/trpc', // This will be replaced by the fetch function
      transformer: superjson,
      headers() {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        try {
          const authState = useAuthStore.getState();
          if (authState.session?.access_token) {
            headers['Authorization'] = `Bearer ${authState.session.access_token}`;
            console.log('🔐 tRPC: Added auth header');
          } else {
            console.log('🔓 tRPC: No auth token available');
          }
        } catch (error) {
          console.log('❌ Could not get auth token for tRPC request:', error);
        }
        
        return headers;
      },
      fetch: async (url, options) => {
        const base = await ensureBase();
        
        // Build the full URL
        const path = url.toString().replace(/^.*\/trpc/, '');
        let finalUrl = `${base}/trpc${path}`;
        
        console.log('📡 tRPC request:', options?.method || 'GET', finalUrl);
        
        try {
          let res = await fetch(finalUrl, {
            ...options,
            headers: {
              ...options?.headers,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          // If 404, try the /api/trpc prefix
          if (res.status === 404) {
            const altUrl = `${base}/api/trpc${path}`;
            console.log('🔄 tRPC 404, retrying with:', altUrl);
            res = await fetch(altUrl, {
              ...options,
              headers: {
                ...options?.headers,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
            finalUrl = altUrl;
          }
          
          // Check response content type
          const contentType = res.headers.get('content-type') ?? '';
          if (contentType.includes('text/html')) {
            throw new Error(`❌ Invalid tRPC endpoint. Got HTML from ${finalUrl}. Set EXPO_PUBLIC_API_URL to your API server URL.`);
          }
          
          // Handle non-OK responses
          if (!res.ok) {
            const text = await res.text();
            if (text.trim().startsWith('<')) {
              throw new Error(`❌ Invalid tRPC endpoint. Got HTML from ${finalUrl}. Set EXPO_PUBLIC_API_URL to your API server URL.`);
            }
            
            try {
              const errorData = JSON.parse(text);
              const message = errorData?.message || errorData?.error || `HTTP ${res.status}`;
              throw new Error(message);
            } catch (parseError) {
              throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
            }
          }
          
          console.log('✅ tRPC response:', res.status);
          return res;
          
        } catch (error) {
          console.error('❌ tRPC request failed:', error);
          throw error;
        }
      },
    }),
  ],
});

// Log the final tRPC URL on startup
(async () => {
  try {
    const base = await ensureBase();
    console.log('🚀 TRPC_URL:', `${base}/trpc`);
  } catch (error) {
    console.error('❌ Failed to resolve tRPC URL:', error);
  }
})();

// Export a function to check API connectivity
export const checkApiConnectivity = async (): Promise<{
  connected: boolean;
  url?: string;
  procedures?: string[];
  error?: string;
}> => {
  try {
    const base = await getApiBaseUrl();
    const health = await tryFetchHealth(base);
    
    if (health) {
      return {
        connected: true,
        url: base,
        procedures: health.procedures
      };
    } else {
      return {
        connected: false,
        url: base,
        error: 'Health check failed'
      };
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};