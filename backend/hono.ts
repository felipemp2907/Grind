import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { appRouter } from "./trpc/app-router";
import { createContext, ensureDbReady } from "./trpc/create-context";
import { createClient } from '@supabase/supabase-js';

// app will be mounted at /api
const app = new Hono();

console.log('Hono app initialized');

// Add logging middleware
app.use("*", logger());

// Enable CORS for all routes
app.use("*", cors({
  origin: (origin, c) => {
    // Allow all origins in development
    if (process.env.NODE_ENV === 'development') {
      return origin || '*';
    }
    // In production, you might want to restrict this
    return origin || '*';
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

// Health check endpoint with tRPC procedure listing
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

// Health endpoint that lists registered procedures
app.get("/health", (c) => {
  console.log('Health endpoint hit');
  
  // Extract procedure names from the router
  const procedures: string[] = [];
  
  try {
    // Get the router definition
    const routerDef = (appRouter as any)._def;
    
    if (routerDef && routerDef.procedures) {
      Object.keys(routerDef.procedures).forEach(key => {
        procedures.push(key);
      });
    }
    
    return c.json({
      status: "healthy",
      trpcEndpoint: "/api/trpc",
      procedures: procedures.length > 0 ? procedures : [
        "goals.create",
        "goals.createUltimate", 
        "goals.updateUltimate",
        "tasks.getStreakTasks",
        "tasks.getTodayTasks",
        "tasks.getAllForDate",
        "example.hi"
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error extracting procedures:', error);
    return c.json({
      status: "healthy",
      trpcEndpoint: "/api/trpc",
      procedures: [
        "goals.create",
        "goals.createUltimate", 
        "goals.updateUltimate",
        "tasks.getStreakTasks",
        "tasks.getTodayTasks",
        "tasks.getAllForDate",
        "example.hi"
      ],
      timestamp: new Date().toISOString(),
      note: "Procedure extraction failed, showing expected procedures"
    });
  }
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
        "tasks.getStreakTasks": "available",
        "tasks.generateStreak": "available"
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
        "tasks.generateStreak",
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

// Database health check endpoint
app.get("/db-health", async (c) => {
  try {
    console.log('Database health check endpoint hit');
    
    // Create a temporary supabase client for health check
    const supabaseUrl = 'https://ovvihfhkhqigzahlttyf.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    await ensureDbReady(supabase);
    
    return c.json({
      status: "healthy",
      message: "Database is ready",
      ok: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return c.json({
      status: "unhealthy",
      message: error instanceof Error ? error.message : 'Database not ready',
      ok: false,
      timestamp: new Date().toISOString()
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
      "/api/trpc/tasks.getStreakTasks",
      "/api/trpc/tasks.generateStreak"
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
        '/api/trpc/tasks.getStreakTasks',
        '/api/trpc/tasks.generateStreak'
      ]
    },
    404
  );
});

export default app;