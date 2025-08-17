import { handle } from 'hono/vercel';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../backend/trpc/app-router';
import { createContext } from '../backend/trpc/create-context';

const app = new Hono();

console.log('🚀 API starting');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Supabase URL configured:', !!process.env.SUPABASE_URL);

// Add logging middleware
app.use('*', logger());

// Enable CORS for all routes
app.use('*', cors({
  origin: (origin) => {
    console.log('CORS request from origin:', origin);
    return origin || '*';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source', 'Accept'],
  credentials: true,
}));

// Error handling middleware - always return JSON
app.onError((err, c) => {
  console.error('API error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    500
  );
});

// Extract procedures from router for health endpoint
function extractProcedures(): string[] {
  try {
    const routerDef = (appRouter as any)._def;
    if (!routerDef?.record) return [];
    
    const procedures: string[] = [];
    const extract = (obj: any, prefix = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if ((v as any)?._def?.procedure) procedures.push(full);
        if ((v as any)?._def?.record) extract((v as any)._def.record, full);
      }
    };
    extract(routerDef.record);
    return procedures;
  } catch (error) {
    console.error('Error extracting procedures:', error);
    return ['goals.createUltimate', 'goals.updateUltimate', 'health.ping'];
  }
}

// Health check endpoint
app.get('/health', (c) => {
  console.log('Health endpoint hit');
  
  const procedures = extractProcedures();
  const payload = {
    trpcEndpoint: '/trpc',
    procedures,
    supabaseUrlPresent: Boolean(process.env.SUPABASE_URL),
    timestamp: new Date().toISOString(),
    ok: true
  };
  
  console.log('Health check response:', JSON.stringify(payload, null, 2));
  return c.json(payload);
});

// Mount tRPC at /trpc/*
app.all('/trpc/*', async (c) => {
  console.log('tRPC request:', c.req.method, c.req.url);
  
  try {
    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      router: appRouter,
      req: c.req.raw,
      createContext,
      onError({ error, path }) {
        console.error(`tRPC Error on ${path}:`, error);
      },
    });
    
    console.log('tRPC response status:', response.status);
    return response;
  } catch (error) {
    console.error('tRPC handler error:', error);
    return c.json({ 
      error: 'tRPC handler failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    routes: {
      health: '/health',
      trpc: '/trpc'
    }
  });
});

// 404 handler - always return JSON
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route ${c.req.path} not found`,
      availableRoutes: ['/health', '/trpc/*']
    },
    404
  );
});

// Log available procedures on startup
const procedures = extractProcedures();
console.log('🎯 API up');
console.log('📋 Procedures:', procedures.join(', '));

export default handle(app);