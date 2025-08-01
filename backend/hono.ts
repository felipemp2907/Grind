import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

// Add logging middleware
app.use("*", logger());

// Enable CORS for all routes
app.use("*", cors({
  origin: ['http://localhost:3000', 'http://localhost:8081', 'https://*.vercel.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Add error handling middleware
app.onError((err, c) => {
  console.error('Hono error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    500
  );
});

// Mount tRPC router at /trpc
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
    onError({ error, path }) {
      console.error(`tRPC Error on ${path}:`, error);
    },
  })
);

// Simple health check endpoint
app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test endpoint to verify tRPC is working
app.get("/test-trpc", async (c) => {
  try {
    // Test if we can create a simple tRPC client call
    return c.json({
      status: "tRPC test endpoint working",
      routes: [
        "goals.createUltimate",
        "tasks.generateToday",
        "example.hi"
      ]
    });
  } catch (error) {
    return c.json({
      status: "error",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Debug endpoint to check tRPC routes
app.get("/debug", (c) => {
  return c.json({
    message: "Debug endpoint",
    availableRoutes: [
      "/api/trpc/example.hi",
      "/api/trpc/goals.createUltimate",
      "/api/trpc/tasks.generateToday"
    ]
  });
});

export default app;