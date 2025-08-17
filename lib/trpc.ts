import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { useAuthStore } from '@/store/authStore';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const trpc = createTRPCReact<AppRouter>();

// API URL detection and health checking
async function tryFetchHealth(base: string): Promise<{ procedures: string[] } | null> {
  const healthEndpoints = [
    `${base.replace(/\/$/, '')}/health`,
    `${base.replace(/\/$/, '')}/api/health`,
    `${base.replace(/\/$/, '')}/ping`,
    `${base.replace(/\/$/, '')}/api/ping`
  ];
  
  for (const url of healthEndpoints) {
    try {
      // Create timeout promise for faster detection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000); // 3 second timeout
      });
      
      const fetchPromise = fetch(url, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const res = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!res.ok) {
        continue;
      }
      
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        continue;
      }
      
      const json = (await res.json()) as { procedures?: unknown; message?: string; status?: string };
      
      // Handle different response formats
      let procedures: string[] = [];
      if (Array.isArray(json.procedures)) {
        procedures = json.procedures as string[];
      } else if (json.message === 'pong' || json.status === 'ok') {
        // If it's a simple ping endpoint, assume the API is working
        procedures = ['health.ping', 'goals.createUltimate', 'goals.updateUltimate'];
      }
      
      // Check for required procedures or basic API response
      const hasRequired = procedures.includes('goals.createUltimate') || 
                         procedures.includes('health.ping') ||
                         json.message === 'pong' ||
                         json.status === 'ok';
                         
      if (hasRequired) {
        console.log('✅ Health check passed for:', base);
        return { procedures };
      }
      
      // Continue to next endpoint
    } catch {
      // Continue to next endpoint silently for faster detection
    }
  }
  
  return null;
}

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

export const getApiBaseUrl = async (): Promise<string> => {
  console.log('🔍 Auto-detecting API URL...');
  
  const candidates: string[] = [];
  
  // 1. Environment variable (highest priority)
  const envUrl = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  if (envUrl) {
    candidates.push(envUrl);
    console.log('Added env URL:', envUrl);
  }
  
  // 2. Check if we're in Expo Go (likely production/deployed API)
  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    // When running in Expo Go, try the deployed API first
    const deployedUrls = [
      // Try the current domain if we can detect it (for web)
      ...(typeof window !== 'undefined' && window.location ? [`https://${window.location.hostname}`] : []),
      // Common Vercel deployment patterns
      'https://dailydesk-ai-self-mastery-platform.vercel.app',
      'https://grind-app.vercel.app',
      'https://rork-app.vercel.app',
      'https://expo-app.vercel.app',
      // Try with the Supabase project ID prefix
      'https://ovvihfhkhqigzahlttyf-rork-app.vercel.app',
      // Primary deployment URL from app.json (last as fallback)
      'https://rork.app'
    ];
    candidates.push(...deployedUrls);
    console.log('Added deployed URLs for Expo Go:', deployedUrls);
  }
  
  // 3. Platform-specific defaults for development
  if (Platform.OS === 'android') {
    candidates.push('http://10.0.2.2:3000');
    console.log('Added Android emulator URL');
  }
  if (Platform.OS === 'ios') {
    candidates.push('http://localhost:3000');
    console.log('Added iOS simulator URL');
  }
  
  // 4. Derived from Expo dev server
  const derived = deriveFromExpoOrigin();
  if (derived) {
    candidates.push(derived);
  }
  
  // 5. Common development server URLs
  candidates.push('http://127.0.0.1:3000');
  candidates.push('http://localhost:3000');
  
  // 6. Common LAN IPs for physical device testing
  const commonLanIps = [
    'http://192.168.1.100:3000',
    'http://192.168.1.101:3000',
    'http://192.168.1.102:3000',
    'http://192.168.0.100:3000',
    'http://192.168.0.101:3000',
    'http://192.168.0.102:3000',
    'http://10.0.0.100:3000',
    'http://10.0.0.101:3000',
    'http://172.16.0.100:3000'
  ];
  candidates.push(...commonLanIps);
  
  // 7. Fallback deployed URLs (in case local dev isn't running)
  if (!isExpoGo) {
    const fallbackDeployedUrls = [
      'https://dailydesk-ai-self-mastery-platform.vercel.app',
      'https://grind-app.vercel.app'
    ];
    candidates.push(...fallbackDeployedUrls);
  }
  
  console.log(`Testing ${candidates.length} candidates...`);
  
  // Test each candidate with shorter timeout for faster detection
  for (let i = 0; i < candidates.length; i++) {
    const base = candidates[i];
    console.log(`[${i + 1}/${candidates.length}] Testing: ${base}`);
    
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
        
        // Build the full URL - try /trpc first, then /api/trpc
        const path = url.toString().replace(/^.*\/trpc/, '');
        const endpoints = [
          `${base}/trpc${path}`,
          `${base}/api/trpc${path}`
        ];
        
        let lastError: Error | null = null;
        
        for (const finalUrl of endpoints) {
          console.log('📡 tRPC request:', options?.method || 'GET', finalUrl);
          
          try {
            // Add timeout to prevent hanging
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error('Request timeout')), 15000); // 15 second timeout
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

// Log the final tRPC URL on startup (with timeout)
(async () => {
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('URL detection timeout')), 10000);
    });
    
    const base = await Promise.race([ensureBase(), timeoutPromise]);
    console.log('🚀 TRPC_URL:', `${base}/trpc`);
  } catch (error) {
    console.error('❌ Failed to resolve tRPC URL:', error);
    console.warn('💡 Set EXPO_PUBLIC_API_URL to your server URL');
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