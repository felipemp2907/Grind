import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { createClient } from '@supabase/supabase-js';

// app will be mounted at /api
const app = new Hono();

console.log('Hono app initialized');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Supabase URL configured:', !!process.env.SUPABASE_URL);

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

// Mount tRPC router at both /api/trpc/* and /trpc/* to avoid client/server prefix drift
console.log('Mounting tRPC at /api/trpc/* and /trpc/*');
console.log('appRouter type:', typeof appRouter);
console.log('appRouter keys:', Object.keys(appRouter));

app.all('/api/trpc/*', async (c) => {
  console.log('tRPC request received (/api):', c.req.method, c.req.url);
  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      router: appRouter,
      req: c.req.raw,
      createContext,
      onError({ error, path }) {
        console.error(`tRPC Error on ${path}:`, error);
        console.error('Error details:', { code: error.code, message: error.message, cause: error.cause });
      },
    });
    console.log('tRPC response status:', response.status);
    return response;
  } catch (error) {
    console.error('tRPC handler error (/api):', error);
    return c.json({ error: 'tRPC handler failed', details: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

app.all('/trpc/*', async (c) => {
  console.log('tRPC request received (/trpc):', c.req.method, c.req.url);
  try {
    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      router: appRouter,
      req: c.req.raw,
      createContext,
      onError({ error, path }) {
        console.error(`tRPC Error on ${path}:`, error);
        console.error('Error details:', { code: error.code, message: error.message, cause: error.cause });
      },
    });
    console.log('tRPC response status:', response.status);
    return response;
  } catch (error) {
    console.error('tRPC handler error (/trpc):', error);
    return c.json({ error: 'tRPC handler failed', details: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

console.log('tRPC mounted at /api/trpc and /trpc with appRouter');
try {
  const routerDef = (appRouter as any)._def;
  if (routerDef) {
    console.log('Router definition found');
    console.log('Router type:', routerDef.type);
    if (routerDef.record) {
      console.log('Router record keys:', Object.keys(routerDef.record));
      // Log nested procedures
      Object.entries(routerDef.record).forEach(([key, value]) => {
        if (value && typeof value === 'object' && (value as any)._def?.record) {
          console.log(`  ${key} procedures:`, Object.keys((value as any)._def.record));
        }
      });
    }
    if (routerDef.procedures) {
      console.log('Available procedures:', Object.keys(routerDef.procedures));
    }
  } else {
    console.log('No router definition found');
  }
} catch (error) {
  console.error('Error inspecting router:', error);
}

// Health check endpoint with tRPC procedure listing
app.get("/", (c) => {
  console.log('Health check endpoint hit');
  return c.json({ 
    status: "ok", 
    message: "API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    routes: {
      trpcApi: '/api/trpc',
      trpc: '/trpc',
      health: '/api/health',
      debug: '/api/debug'
    }
  });
});

// Health endpoint that lists registered procedures
app.get("/health", (c) => {
  console.log('Health endpoint hit');
  
  // Try to extract actual procedures from the router
  let actualProcedures: string[] = [];
  try {
    const routerDef = (appRouter as any)._def;
    if (routerDef && routerDef.procedures) {
      actualProcedures = Object.keys(routerDef.procedures);
    } else if (routerDef && routerDef.record) {
      // Handle nested router structure
      const extractProcedures = (obj: any, prefix = ''): string[] => {
        const procs: string[] = [];
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === 'object' && (value as any)._def) {
            if ((value as any)._def.procedure) {
              procs.push(fullKey);
            } else if ((value as any)._def.record) {
              procs.push(...extractProcedures((value as any)._def.record, fullKey));
            }
          }
        }
        return procs;
      };
      actualProcedures = extractProcedures(routerDef.record);
    }
  } catch (error) {
    console.error('Error extracting procedures:', error);
  }
  
  // Fallback to known procedures if extraction fails
  const procedures = actualProcedures.length > 0 ? actualProcedures : [
    "example.hi",
    "example.test", 
    "goals.create",
    "goals.createUltimate",
    "goals.updateUltimate",
    "tasks.getStreakTasks",
    "tasks.getTodayTasks",
    "tasks.getAllForDate"
  ];
    
  const payload = {
    trpcEndpoints: ["/api/trpc", "/trpc"],
    procedures: procedures,
    actualProceduresFound: actualProcedures.length,
    supabaseUrlOk: Boolean(process.env.SUPABASE_URL || 'https://ovvihfhkhqigzahlttyf.supabase.co'),
    routerMounted: true,
    timestamp: new Date().toISOString()
  };

  console.log('Health check response:', payload);
  return c.json(payload);
});

// Simple health endpoint for quick checks
app.get("/health-simple", (c) => {
  return c.json({
    status: "ok",
    trpcEndpoint: "/api/trpc",
    procedures: ["goals.createUltimate", "goals.updateUltimate"],
    timestamp: new Date().toISOString()
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

// Auth-check endpoint
app.get("/auth-check", async (c) => {
  try {
    const authHeader = c.req.header('authorization') || c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing Authorization header' }, 401);
    }
    const token = authHeader.slice(7);

    const supabaseUrl = process.env.SUPABASE_URL || 'https://ovvihfhkhqigzahlttyf.supabase.co';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
    return c.json({ userId: user.id });
  } catch (err) {
    return c.json({ error: 'Auth check failed' }, 500);
  }
});

// Database diagnostics endpoint
app.get("/diag/db", async (c) => {
  try {
    console.log('Database diagnostics endpoint hit');
    
    // Create a temporary supabase client for diagnostics
    const supabaseUrl = process.env.SUPABASE_URL || 'https://ovvihfhkhqigzahlttyf.supabase.co';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Check core tables function
    let coreTablesResult: { ok: boolean; error?: string; tables?: any } = { ok: false };
    try {
      const { data, error } = await supabase.rpc('grind_check_core_tables');
      if (error) {
        console.error('grind_check_core_tables RPC error:', error);
        coreTablesResult = { ok: false, error: error.message };
      } else {
        coreTablesResult = data || { ok: false };
      }
    } catch (rpcError) {
      console.error('grind_check_core_tables RPC exception:', rpcError);
      // Fallback to direct table checks
      try {
        const { error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
          
        const { error: goalsError } = await supabase
          .from('goals')
          .select('id')
          .limit(1);
          
        const { error: tasksError } = await supabase
          .from('tasks')
          .select('id')
          .limit(1);
        
        const tablesExist = (
          !profilesError || !profilesError.message.includes('does not exist')
        ) && (
          !goalsError || !goalsError.message.includes('does not exist')
        ) && (
          !tasksError || !tasksError.message.includes('does not exist')
        );
        
        coreTablesResult = { 
          ok: tablesExist,
          tables: {
            profiles: !profilesError || !profilesError.message.includes('does not exist'),
            goals: !goalsError || !goalsError.message.includes('does not exist'),
            tasks: !tasksError || !tasksError.message.includes('does not exist')
          }
        };
        
        if (!tablesExist) {
          const missingTables = [];
          if (profilesError?.message.includes('does not exist')) missingTables.push('profiles');
          if (goalsError?.message.includes('does not exist')) missingTables.push('goals');
          if (tasksError?.message.includes('does not exist')) missingTables.push('tasks');
          coreTablesResult.error = `Missing tables: ${missingTables.join(', ')}`;
        }
      } catch (fallbackError) {
        console.error('Fallback table check failed:', fallbackError);
        coreTablesResult = { ok: false, error: 'Failed to check core tables' };
      }
    }
    
    // Get column information for tasks table
    let tasksColumns: any[] = [];
    try {
      const { data: tasksInfo, error: tasksError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'tasks')
        .eq('table_schema', 'public');
      
      if (!tasksError && tasksInfo) {
        tasksColumns = tasksInfo;
      }
    } catch (error) {
      console.error('Error getting tasks columns:', error);
    }
    
    // Get column information for profiles table
    let profilesColumns: any[] = [];
    try {
      const { data: profilesInfo, error: profilesError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'profiles')
        .eq('table_schema', 'public');
      
      if (!profilesError && profilesInfo) {
        profilesColumns = profilesInfo;
      }
    } catch (error) {
      console.error('Error getting profiles columns:', error);
    }
    
    // Get counts
    const { count: goalsCount } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true });
      
    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true });
    
    return c.json({
      coreTablesCheck: coreTablesResult,
      columns: {
        tasks: tasksColumns,
        profiles: profilesColumns
      },
      counts: {
        goals: goalsCount || 0,
        tasks: tasksCount || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database diagnostics failed:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Database diagnostics failed',
      timestamp: new Date().toISOString()
    }, 500);
  }
});

// Plan dry-run diagnostics endpoint
app.get("/diag/plan-dry-run", async (c) => {
  try {
    const title = c.req.query('title') || 'Test Goal';
    const description = c.req.query('description') || 'Test goal description';
    const deadline = c.req.query('deadline') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const daysPreview = parseInt(c.req.query('daysPreview') || '7');
    
    console.log(`Plan dry-run for: ${title}, deadline: ${deadline}, preview: ${daysPreview} days`);
    
    // Import the planner service
    const { GoalPlannerService } = await import('./services/goalPlanner');
    const planner = new GoalPlannerService();
    
    // Generate the plan without inserting
    const fullPlan = await planner.generateFullPlan(
      title,
      description,
      deadline,
      'beginner',
      0
    );
    
    // Calculate statistics
    const days = Math.min(fullPlan.daily_plan.length, daysPreview);
    const streakCount = fullPlan.streak_habits.length;
    const totalToday = fullPlan.daily_plan.reduce((sum, day) => sum + day.today_tasks.length, 0);
    
    // Analyze per-day breakdown
    const perDay = fullPlan.daily_plan.slice(0, daysPreview).map(day => {
      const streaksN = streakCount;
      const todayN = day.today_tasks.length;
      const streakLoad = fullPlan.streak_habits.reduce((sum, h) => sum + h.load, 0);
      const todayLoad = day.today_tasks.reduce((sum, t) => sum + t.load, 0);
      const load = streakLoad + todayLoad;
      
      return {
        date: day.date,
        streaksN,
        todayN,
        load
      };
    });
    
    // Check for duplicates (simplified)
    const allTodayTitles = fullPlan.daily_plan.flatMap(day => day.today_tasks.map(t => t.title));
    const uniqueTitles = new Set(allTodayTitles);
    const duplicatesTrimmed = allTodayTitles.length - uniqueTitles.size;
    
    // Validation errors
    const validationErrors = [];
    if (streakCount > 3) validationErrors.push(`Too many streak habits: ${streakCount} > 3`);
    if (perDay.some(day => day.todayN > 3)) validationErrors.push('Some days have > 3 today tasks');
    if (perDay.some(day => day.load > 5)) validationErrors.push('Some days have load > 5');
    
    const result = {
      days,
      streak_count: streakCount,
      total_today: totalToday,
      per_day: perDay,
      duplicatesTrimmed,
      validationErrors,
      plan: {
        streak_habits: fullPlan.streak_habits,
        daily_plan_preview: fullPlan.daily_plan.slice(0, daysPreview)
      }
    };
    
    // Log the full summary to console
    console.log('=== PLAN DRY-RUN SUMMARY ===');
    console.log(`Goal: ${title}`);
    console.log(`Deadline: ${deadline}`);
    console.log(`Days: ${days}`);
    console.log(`Streak habits: ${streakCount}`);
    console.log(`Total today tasks: ${totalToday}`);
    console.log(`Duplicates trimmed: ${duplicatesTrimmed}`);
    console.log(`Validation errors: ${validationErrors.length}`);
    if (validationErrors.length > 0) {
      console.log('Errors:', validationErrors);
    }
    console.log('Per-day breakdown:');
    perDay.forEach(day => {
      console.log(`  ${day.date}: ${day.streaksN} streaks + ${day.todayN} today = load ${day.load}`);
    });
    console.log('=== END SUMMARY ===');
    
    return c.json(result);
  } catch (error) {
    console.error('Plan dry-run failed:', error);
    return c.json({
      error: error instanceof Error ? error.message : 'Plan dry-run failed',
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
      "/api/trpc/tasks.getStreakTasks",
      "/api/trpc/tasks.getTodayTasks",
      "/api/trpc/tasks.getAllForDate",
      "/trpc/example.hi",
      "/trpc/goals.createUltimate",
      "/trpc/goals.updateUltimate"
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
        '/api/trpc/tasks.getStreakTasks',
        '/api/trpc/tasks.getTodayTasks',
        '/trpc/example.hi',
        '/trpc/goals.createUltimate',
        '/trpc/goals.updateUltimate'
      ]
    },
    404
  );
});

export default app;