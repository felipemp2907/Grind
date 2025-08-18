import { createClientPlan, convertPlanToTasks } from '@/lib/clientPlanner';

// Test the client planner
console.log('🧪 Testing client planner...');

const testGoal = {
  title: 'Learn React Native',
  description: 'Master React Native development to build amazing mobile apps',
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
};

const plan = createClientPlan(testGoal);
console.log('📋 Generated plan:', {
  streakCount: plan.streak_habits.length,
  totalDays: plan.daily_plan.length,
  totalTodayTasks: plan.daily_plan.reduce((sum, day) => sum + day.today_tasks.length, 0)
});

const tasks = convertPlanToTasks(plan, 'test-goal-id');
console.log('📝 Generated tasks:', {
  totalTasks: tasks.length,
  streakTasks: tasks.filter(t => t.type === 'streak').length,
  todayTasks: tasks.filter(t => t.type === 'today').length
});

console.log('✅ Client planner test completed!');