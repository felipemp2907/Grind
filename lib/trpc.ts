import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // For development, use localhost
  if (__DEV__) {
    // For web development
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    // For mobile development (Expo Go)
    return 'http://localhost:3000';
  }
  
  // For production, use the environment variable if available
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }

  // Fallback to current origin for web
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Default fallback for development
  console.warn('No base URL configured, using localhost:3000');
  return 'http://localhost:3000';
};

export const trpcClient = trpc.createClient({
  transformer: superjson,
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      headers: async () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Try to get the current user's session token
        try {
          // Import supabase dynamically to avoid circular dependencies
          const { supabase } = await import('./supabase');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
          }
        } catch (error) {
          console.log('Could not get auth token for tRPC request:', error);
        }
        
        return headers;
      },
      fetch: (url, options) => {
        console.log('tRPC request:', url, options?.method);
        return fetch(url, options).then(async response => {
          if (!response.ok) {
            console.error('tRPC HTTP error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response body:', text);
            
            // If we get HTML instead of JSON, it means the API route isn't working
            if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
              throw new Error(`API route not found or misconfigured. Got HTML response instead of JSON. Check that your backend server is running at ${getBaseUrl()}`);
            }
            
            // Try to parse as JSON to get a better error message
            try {
              const errorData = JSON.parse(text);
              throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            } catch (parseError) {
              throw new Error(`HTTP ${response.status}: ${text}`);
            }
          }
          return response;
        });
      },
    }),
  ],
});