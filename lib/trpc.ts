import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { useAuthStore } from '@/store/authStore';

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // For production, use the environment variable if available
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log('Using production API URL:', process.env.EXPO_PUBLIC_API_URL as string);
    return process.env.EXPO_PUBLIC_API_URL as string;
  }

  // For development
  if (__DEV__) {
    // For web development - use current origin
    if (typeof window !== 'undefined') {
      console.log('Using web development URL:', window.location.origin);
      return window.location.origin;
    }
    // For mobile development (Expo Go) - use localhost
    console.log('Using mobile development URL: http://localhost:3000');
    return 'http://localhost:3000';
  }

  // Production fallback to current origin for web
  if (typeof window !== 'undefined') {
    console.log('Using production web URL:', window.location.origin);
    return window.location.origin;
  }

  // Final fallback
  console.warn('No base URL configured, using localhost:3000');
  return 'http://localhost:3000';
};

// Create the vanilla tRPC client for non-React contexts
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers() {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Try to get the current user's session token
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
            } catch {
              throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
            }
          }
          
          console.log('tRPC response OK');
          return response;
        }).catch(error => {
          console.error('tRPC fetch error:', error);
          
          // Provide more helpful error messages for common network issues
          if (error.message.includes('Failed to fetch')) {
            const baseUrl = getBaseUrl();
            console.error('Network error - possible causes:');
            console.error('1. Backend server is not running');
            console.error('2. CORS issues');
            console.error('3. Network connectivity problems');
            console.error(`Trying to reach: ${baseUrl}/api/trpc`);
            
            // For development, suggest starting the server
            if (__DEV__) {
              console.error('Development tip: Make sure your backend server is running');
              console.error('If using Vercel dev: vercel dev');
              console.error('If using Next.js: npm run dev');
            }
          }
          
          throw error;
        });
      },
    }),
  ],
});