import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { useAuthStore } from '@/store/authStore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const trpc = createTRPCReact<AppRouter>();

// API URL detection

function deriveFromExpoOrigin(): string | null {
  try {
    // Try multiple ways to get the dev server host
    let host: string | null = null;
    
    // Method 1: Expo Constants
    if (Constants.expoConfig?.hostUri) {
      host = Constants.expoConfig.hostUri.split(':')[0];
      console.log('Got host from Constants.expoConfig.hostUri:', host);
    }
    
    // Method 2: Legacy manifest (with type assertion)
    if (!host && (Constants.manifest as any)?.hostUri) {
      host = (Constants.manifest as any).hostUri.split(':')[0];
      console.log('Got host from Constants.manifest.hostUri:', host);
    }
    
    // Method 3: Global expo object
    if (!host) {
      const anyGlobal = global as unknown as { __expo?: { plugins?: { Manifest?: { hostUri?: string } } } };
      const hostUri = anyGlobal.__expo?.plugins?.Manifest?.hostUri;
      if (typeof hostUri === 'string' && hostUri.length > 0) {
        host = hostUri.split(':')[0];
        console.log('Got host from global.__expo:', host);
      }
    }
    
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      const derived = `http://${host}:3000`;
      console.log('Derived API URL from Expo:', derived);
      return derived;
    }
  } catch (error) {
    console.log('Could not derive from Expo origin:', error);
  }
  return null;
}

export const getApiBaseUrl = (): string => {
  console.log('🔍 Getting API URL...');
  
  // 1. Environment variable (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  if (envUrl) {
    console.log('Using env URL:', envUrl);
    return envUrl.replace(/\/$/, '');
  }
  
  // 2. For web, use current origin
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const webUrl = `${window.location.protocol}//${window.location.host}`;
    console.log('Using web origin:', webUrl);
    return webUrl;
  }
  
  // 3. Try to derive from Expo dev server first (for development)
  const derived = deriveFromExpoOrigin();
  if (derived) {
    console.log('Using derived URL from Expo dev server:', derived);
    return derived;
  }
  
  // 4. Default to deployed API if no local dev server found
  const deployedUrl = 'https://rork.app';
  console.log('Using deployed API as fallback:', deployedUrl);
  return deployedUrl;
};

// Cache the base URL
let cachedBaseUrl: string | null = null;
const ensureBase = (): string => {
  if (!cachedBaseUrl) {
    cachedBaseUrl = getApiBaseUrl();
  }
  return cachedBaseUrl;
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
        const base = ensureBase();
        
        // Build the full URL - use /trpc directly (new clean API structure)
        const path = url.toString().replace(/^.*\/trpc/, '');
        const endpoints = [
          `${base}/trpc${path}`
        ];
        
        let lastError: Error | null = null;
        
        for (const finalUrl of endpoints) {
          console.log('📡 tRPC request:', options?.method || 'GET', finalUrl);
          
          try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Request timeout')), 5000); // 5 second timeout
            });
            
            const fetchPromise = fetch(finalUrl, {
              ...options,
              headers: {
                ...options?.headers,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
            
            const res = await Promise.race([fetchPromise, timeoutPromise]);
            
            // Check response content type
            const contentType = res.headers.get('content-type') ?? '';
            if (contentType.includes('text/html')) {
              const error = new Error(`❌ Invalid tRPC endpoint. Got HTML from ${finalUrl}. Set EXPO_PUBLIC_API_URL to your API server URL.`);
              lastError = error;
              console.log('Got HTML, trying next endpoint...');
              continue;
            }
            
            // Handle non-OK responses
            if (!res.ok) {
              const text = await res.text();
              if (text.trim().startsWith('<')) {
                const error = new Error(`❌ Invalid tRPC endpoint. Got HTML from ${finalUrl}. Set EXPO_PUBLIC_API_URL to your API server URL.`);
                lastError = error;
                console.log('Got HTML error, trying next endpoint...');
                continue;
              }
              
              try {
                const errorData = JSON.parse(text);
                const message = errorData?.message || errorData?.error || `HTTP ${res.status}`;
                throw new Error(message);
              } catch {
                throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
              }
            }
            
            console.log('✅ tRPC response:', res.status, 'from', finalUrl);
            return res;
            
          } catch (error) {
            console.log('❌ tRPC request failed for', finalUrl, ':', error);
            lastError = error as Error;
            // Continue to next endpoint
          }
        }
        
        // If we get here, all endpoints failed
        console.error('❌ All tRPC endpoints failed');
        throw lastError || new Error('All tRPC endpoints failed');
      },
    }),
  ],
});

// Log the final tRPC URL on startup
try {
  const base = ensureBase();
  console.log('🚀 TRPC_URL:', `${base}/trpc`);
} catch (error) {
  console.error('❌ Failed to resolve tRPC URL:', error);
  console.warn('💡 Set EXPO_PUBLIC_API_URL to your server URL');
}

// Export a function to check API connectivity
export const checkApiConnectivity = async (): Promise<{
  connected: boolean;
  url?: string;
  procedures?: string[];
  error?: string;
}> => {
  try {
    const base = getApiBaseUrl();
    
    // Try a simple health check
    const healthEndpoints = [
      `${base}/health`
    ];
    
    for (const url of healthEndpoints) {
      try {
        const res = await fetch(url, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (res.ok) {
          const data = await res.json();
          return {
            connected: true,
            url: base,
            procedures: data.procedures || ['health.ping', 'goals.createUltimate', 'goals.updateUltimate']
          };
        }
      } catch {
        // Continue to next endpoint
      }
    }
    
    return {
      connected: false,
      url: base,
      error: 'Health check failed'
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};