import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
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
    // For mobile development (Expo Go) - use the correct port
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

// Create the vanilla tRPC client for non-React contexts
export const trpcClient = createTRPCClient<AppRouter>({
  transformer: superjson,
  links: [
    httpBatchLink({
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
        console.log('Base URL:', getBaseUrl());
        console.log('Full URL:', url);
        
        return fetch(url, options).then(async response => {
          console.log('tRPC response status:', response.status, response.statusText);
          
          if (!response.ok) {
            console.error('tRPC HTTP error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response body:', text.substring(0, 500)); // Log first 500 chars
            
            // If we get HTML instead of JSON, it means the API route isn't working
            if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
              const baseUrl = getBaseUrl();
              console.error('Got HTML response instead of JSON. This usually means:');
              console.error('1. The API server is not running');
              console.error('2. The API route is not properly configured');
              console.error('3. The URL is incorrect');
              console.error(`Current base URL: ${baseUrl}`);
              console.error(`Full tRPC URL: ${baseUrl}/api/trpc`);
              
              throw new Error(`API route not found or misconfigured. Got HTML response instead of JSON. Check that your backend server is running at ${baseUrl}`);
            }
            
            // Try to parse as JSON to get a better error message
            try {
              const errorData = JSON.parse(text);
              throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            } catch (parseError) {
              throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
            }
          }
          
          console.log('tRPC response OK');
          return response;
        }).catch(error => {
          console.error('tRPC fetch error:', error);
          throw error;
        });
      },
    }),
  ],
});