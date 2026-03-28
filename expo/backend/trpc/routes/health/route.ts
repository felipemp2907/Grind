import { publicProcedure, supabaseAdmin } from "../../create-context";

export const healthPingProcedure = publicProcedure.query(() => {
  return "ok" as const;
});

export const healthProcedure = publicProcedure
  .query(async () => {
    try {
      // Test database connection with admin client
      const { data: profilesTest, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .limit(1);
        
      const { data: goalsTest, error: goalsError } = await supabaseAdmin
        .from('goals')
        .select('id')
        .limit(1);
        
      const { data: tasksTest, error: tasksError } = await supabaseAdmin
        .from('tasks')
        .select('id')
        .limit(1);
      
      const dbStatus = {
        profiles: profilesError ? `ERROR: ${profilesError.message}` : 'OK',
        goals: goalsError ? `ERROR: ${goalsError.message}` : 'OK',
        tasks: tasksError ? `ERROR: ${tasksError.message}` : 'OK'
      };
      
      const allTablesOk = !profilesError && !goalsError && !tasksError;
      
      return {
        status: allTablesOk ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        message: allTablesOk ? 'tRPC server and database are running' : 'Database issues detected',
        database: dbStatus,
        supabaseUrl: 'https://ovvihfhkhqigzahlttyf.supabase.co'
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const testInsertProcedure = publicProcedure
  .query(async () => {
    try {
      console.log('🧪 Testing database insert with admin client...');
      
      // Test insert with service role
      const testId = '00000000-0000-0000-0000-000000000001';
      
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: testId,
          full_name: 'Test Insert User',
          level: 1,
          xp: 0,
          streak_days: 0,
          longest_streak: 0,
          experience_level: 'beginner'
        }, { onConflict: 'id' })
        .select()
        .single();
        
      if (error) {
        console.error('❌ Test insert failed:', error);
        return {
          status: 'failed',
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        };
      }
      
      console.log('✅ Test insert successful');
      return {
        status: 'success',
        data: data,
        timestamp: new Date().toISOString(),
        message: 'Admin client can insert into database'
      };
    } catch (error) {
      console.error('❌ Test insert error:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

export const testGoalInsertProcedure = publicProcedure
  .query(async () => {
    try {
      console.log('🎯 Testing goal insert with admin client...');
      
      // Test goal insert with service role
      const testUserId = '00000000-0000-0000-0000-000000000001';
      
      const { data, error } = await supabaseAdmin
        .from('goals')
        .insert({
          user_id: testUserId,
          title: 'Test Goal',
          description: 'Test goal description',
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          category: 'test',
          target_value: 100,
          priority: 'medium'
        })
        .select()
        .single();
        
      if (error) {
        console.error('❌ Test goal insert failed:', error);
        return {
          status: 'failed',
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        };
      }
      
      console.log('✅ Test goal insert successful');
      return {
        status: 'success',
        data: data,
        timestamp: new Date().toISOString(),
        message: 'Admin client can insert goals'
      };
    } catch (error) {
      console.error('❌ Test goal insert error:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

export const testTaskInsertProcedure = publicProcedure
  .query(async () => {
    try {
      console.log('📋 Testing task insert with admin client...');
      
      // Test task insert with service role
      const testUserId = '00000000-0000-0000-0000-000000000001';
      
      const { data, error } = await supabaseAdmin
        .from('tasks')
        .insert({
          user_id: testUserId,
          title: 'Test Task',
          description: 'Test task description',
          status: 'pending',
          type: 'today',
          due_at: new Date().toISOString(),
          load_score: 1,
          proof_mode: 'flex',
          completed: false,
          xp_value: 10,
          is_habit: false,
          priority: 'medium'
        })
        .select()
        .single();
        
      if (error) {
        console.error('❌ Test task insert failed:', error);
        return {
          status: 'failed',
          error: error.message,
          code: error.code,
          timestamp: new Date().toISOString()
        };
      }
      
      console.log('✅ Test task insert successful');
      return {
        status: 'success',
        data: data,
        timestamp: new Date().toISOString(),
        message: 'Admin client can insert tasks'
      };
    } catch (error) {
      console.error('❌ Test task insert error:', error);
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  });

export default healthPingProcedure;