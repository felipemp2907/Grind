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

  throw new Error(
    "No base url found, please set EXPO_PUBLIC_RORK_API_BASE_URL for production"
  );
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      headers: () => {
        return {
          'Content-Type': 'application/json',
        };
      },
    }),
  ],
});