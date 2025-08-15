// Simple test script to verify goal creation and task generation
// Run this with: node scripts/test-goal-creation.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ovvihfhkhqigzahlttyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dmloZmhraHFpZ3phaGx0dHlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxNDQ2MDIsImV4cCI6MjA2MjcyMDYwMn0.S1GkUtQR3d7YvmuJObDwZlYRMa4hBFc3NWBid9FHn2I';

async function testGoalCreation() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  console.log('=== GOAL CREATION TEST ===');
  
  // Test parameters
  const testGoal = {
    title: 'Learn Guitar in 7 Days',
    description: 'Master basic guitar chords and play a simple song',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    user_id: 'demo-user-id'
  };
  
  console.log('Test goal:', testGoal);
  
  try {
    // 1. Create the goal
    const { data: goalData, error: goalError } = await supabase
      .from('goals')
      .insert({
        user_id: testGoal.user_id,
        title: testGoal.title,
        description: testGoal.description,
        deadline: new Date(testGoal.deadline).toISOString(),
        status: 'active'
      })
      .select()
      .single();
      
    if (goalError) {
      console.error('Goal creation failed:', goalError);
      return;
    }
    
    console.log('Goal created:', goalData.id);
    
    // 2. Check if tasks were created (this would happen via tRPC in real app)
    const { count: streakCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testGoal.user_id)
      .eq('goal_id', goalData.id)
      .eq('type', 'streak');
      
    const { count: todayCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', testGoal.user_id)
      .eq('goal_id', goalData.id)
      .eq('type', 'today');
    
    console.log(`Tasks found: ${streakCount || 0} streak, ${todayCount || 0} today`);
    
    // 3. Expected results for 7-day goal
    const expectedStreakTasks = 7 * 3; // 7 days * up to 3 streak habits
    console.log(`Expected streak tasks (max): ${expectedStreakTasks}`);
    
    // 4. Assertions
    if (streakCount === 0) {
      console.log('❌ NO STREAK TASKS FOUND - This indicates the batch planner is not working');
    } else {
      console.log(`✅ Found ${streakCount} streak tasks`);
    }
    
    if (streakCount > 0 && streakCount <= expectedStreakTasks) {
      console.log('✅ Streak task count is within expected range');
    } else if (streakCount > expectedStreakTasks) {
      console.log('⚠️  More streak tasks than expected');
    }
    
    // 5. Sample tasks
    const { data: sampleTasks } = await supabase
      .from('tasks')
      .select('id, title, type, task_date, due_at, load_score, proof_mode')
      .eq('user_id', testGoal.user_id)
      .eq('goal_id', goalData.id)
      .limit(5);
      
    console.log('Sample tasks:', sampleTasks);
    
    // 6. Clean up
    await supabase.from('tasks').delete().eq('goal_id', goalData.id);
    await supabase.from('goals').delete().eq('id', goalData.id);
    console.log('Test data cleaned up');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  console.log('=== TEST COMPLETE ===');
}

// Run the test
testGoalCreation().catch(console.error);