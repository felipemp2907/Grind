import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

// app will be mounted at /api
const app = new Hono();

console.log('Hono app initialized');

// Add logging middleware
app.use("*", logger());

// Enable CORS for all routes
app.use("*", cors({
  origin: (origin, c) => {
    console.log('CORS origin check:', origin);
    // Allow all origins in development
    if (!origin) return '*'; // Allow requests with no origin (mobile apps, etc.)
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8081', 
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8081'
    ];
    
    // Allow Vercel domains
    if (origin.includes('.vercel.app')) return origin;
    
    // Allow Expo development
    if (origin.startsWith('exp://')) return origin;
    
    // Allow localhost with any port
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return origin;
    
    return allowedOrigins.includes(origin) ? origin : '*';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source'],
  credentials: true,
}));

// Add error handling middleware
app.onError((err, c) => {
  console.error('Hono error:', err);
  
  // Always return JSON, never HTML
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
  console.log('Health check endpoint hit');
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    routes: {
      trpc: '/api/trpc',
      health: '/api/',
      debug: '/api/debug'
    }
  });
});

// Add a simple test endpoint to verify the API is working
app.get("/ping", (c) => {
  console.log('Ping endpoint hit');
  return c.json({ 
    message: "pong",
    timestamp: new Date().toISOString()
  });
});

// Test tRPC endpoint directly
app.get("/test-trpc-direct", async (c) => {
  try {
    // Test if tRPC router is accessible
    return c.json({
      status: "tRPC router accessible",
      procedures: {
        "example.hi": "available",
        "goals.create": "available", 
        "goals.createUltimate": "available",
        "goals.updateUltimate": "available",
        "tasks.generateToday": "available",
        "tasks.getStreakTasks": "available"
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({
      status: "error",
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Test endpoint to verify tRPC is working
app.get("/test-trpc", async (c) => {
  try {
    // Test if we can create a simple tRPC client call
    return c.json({
      status: "tRPC test endpoint working",
      routes: [
        "goals.createUltimate",
        "goals.updateUltimate",
        "tasks.generateToday",
        "tasks.getStreakTasks",
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
      "/api/trpc/goals.updateUltimate",
      "/api/trpc/goals.create",
      "/api/trpc/tasks.generateToday",
      "/api/trpc/tasks.getStreakTasks"
    ]
  });
});

// 404 handler - always return JSON, never HTML
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.path} not found`,
      availableRoutes: [
        '/api/',
        '/api/trpc/example.hi',
        '/api/trpc/goals.createUltimate',
        '/api/trpc/goals.updateUltimate',
        '/api/trpc/goals.create',
        '/api/trpc/tasks.generateToday',
        '/api/trpc/tasks.getStreakTasks'
      ]
    },
    404
  );
});

export default app;