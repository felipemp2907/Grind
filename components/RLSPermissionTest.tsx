import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { supabase, getCurrentUser, ensureUserProfile } from '@/lib/supabase';

export const RLSPermissionTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runPermissionTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    try {
      addResult('🔍 Starting RLS permission test...');
      
      // 1. Check authentication
      addResult('1️⃣ Checking authentication...');
      const { user, error: userError } = await getCurrentUser();
      
      if (userError || !user) {
        addResult(`❌ Authentication failed: ${userError || 'No user found'}`);
        return;
      }
      
      addResult(`✅ User authenticated: ${user.email}`);
      
      // 2. Ensure profile exists
      addResult('2️⃣ Ensuring user profile exists...');
      const profileResult = await ensureUserProfile(user.id, {
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Test User',
        email: user.email
      });
      
      if (!profileResult.success) {
        addResult(`❌ Profile creation failed: ${profileResult.error}`);
        return;
      }
      
      addResult('✅ User profile ensured');
      
      // 3. Test profile read access
      addResult('3️⃣ Testing profile read access...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        addResult(`❌ Profile read failed: ${profileError.message}`);
        return;
      }
      
      addResult(`✅ Profile read successful: ${profileData.name}`);
      
      // 4. Test goals table access
      addResult('4️⃣ Testing goals table access...');
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);
        
      if (goalsError) {
        addResult(`❌ Goals read failed: ${goalsError.message}`);
        return;
      }
      
      addResult(`✅ Goals read successful (${goalsData.length} goals found)`);
      
      // 5. Test tasks table access
      addResult('5️⃣ Testing tasks table access...');
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);
        
      if (tasksError) {
        addResult(`❌ Tasks read failed: ${tasksError.message}`);
        return;
      }
      
      addResult(`✅ Tasks read successful (${tasksData.length} tasks found)`);
      
      // 6. Test task insertion
      addResult('6️⃣ Testing task insertion...');
      
      // First create a test goal if none exists
      let testGoalId = goalsData.length > 0 ? goalsData[0].id : null;
      
      if (!testGoalId) {
        addResult('Creating test goal...');
        const { data: newGoal, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            title: 'Test Goal for RLS',
            description: 'This is a test goal to verify RLS permissions',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          })
          .select()
          .single();
          
        if (goalError) {
          addResult(`❌ Test goal creation failed: ${goalError.message}`);
          return;
        }
        
        testGoalId = newGoal.id;
        addResult('✅ Test goal created');
      }
      
      // Now test task insertion
      const testTask = {
        user_id: user.id,
        goal_id: testGoalId,
        title: 'Test Task for RLS',
        description: 'This is a test task to verify RLS permissions',
        type: 'today' as const,
        due_at: new Date().toISOString(),
        scheduled_for_date: new Date().toISOString().split('T')[0],
        load_score: 1,
        proof_mode: 'flex' as const,
        completed: false,
        xp_value: 30,
        is_habit: false,
        priority: 'medium' as const
      };
      
      const { data: insertedTask, error: insertError } = await supabase
        .from('tasks')
        .insert(testTask)
        .select()
        .single();
        
      if (insertError) {
        addResult(`❌ Task insertion failed: ${insertError.message}`);
        return;
      }
      
      addResult(`✅ Task insertion successful: ${insertedTask.title}`);
      
      // 7. Clean up test data
      addResult('7️⃣ Cleaning up test data...');
      
      // Delete test task
      await supabase.from('tasks').delete().eq('id', insertedTask.id);
      
      // Delete test goal if we created it
      if (goalsData.length === 0) {
        await supabase.from('goals').delete().eq('id', testGoalId);
      }
      
      addResult('✅ Test data cleaned up');
      addResult('🎉 ALL TESTS PASSED! RLS permissions are working correctly.');
      
    } catch (error) {
      addResult(`💥 Unexpected error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RLS Permission Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={runPermissionTest}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Running Tests...' : 'Run Permission Test'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
  },
  resultText: {
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
});

export default RLSPermissionTest;