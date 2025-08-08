import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { trpcClient } from '@/lib/trpc';

export const TRPCDebugComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testHiProcedure = async () => {
    try {
      addResult('Testing example.hi procedure...');
      const result = await trpcClient.example.hi.query();
      addResult(`✅ example.hi success: ${JSON.stringify(result)}`);
    } catch (error) {
      addResult(`❌ example.hi failed: ${error}`);
    }
  };

  const testCreateGoal = async () => {
    try {
      addResult('Testing goals.create procedure...');
      const result = await trpcClient.goals.create.mutate({
        title: 'Test Goal',
        description: 'This is a test goal',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        category: 'test',
        targetValue: 100,
        priority: 'medium'
      });
      addResult(`✅ goals.create success: Goal ID ${result.goal.id}`);
    } catch (error) {
      addResult(`❌ goals.create failed: ${error}`);
    }
  };

  const testCreateUltimateGoal = async () => {
    try {
      addResult('Testing goals.createUltimate procedure...');
      const result = await trpcClient.goals.createUltimate.mutate({
        title: 'Ultimate Test Goal',
        description: 'This is an ultimate test goal with full task generation',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        category: 'fitness',
        targetValue: 100,
        priority: 'high'
      });
      addResult(`✅ goals.createUltimate success: Goal ID ${result.goal.id}, ${result.totalTasksCreated || result.streakTasksCreated} tasks created`);
    } catch (error) {
      addResult(`❌ goals.createUltimate failed: ${error}`);
    }
  };

  const testGenerateTodayTasks = async () => {
    try {
      addResult('Testing tasks.generateToday procedure...');
      const result = await trpcClient.tasks.generateToday.mutate({
        date: new Date().toISOString().split('T')[0]
      });
      addResult(`✅ tasks.generateToday success: ${result.totalTasks || result.tasks?.length || 0} tasks found`);
    } catch (error) {
      addResult(`❌ tasks.generateToday failed: ${error}`);
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    addResult('🚀 Starting tRPC tests...');
    
    await testHiProcedure();
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    
    await testCreateGoal();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGenerateTodayTasks();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testCreateUltimateGoal();
    
    addResult('🏁 All tests completed!');
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>tRPC Debug Component</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={runAllTests}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonTextSecondary}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.individualTests}>
        <TouchableOpacity style={styles.smallButton} onPress={testHiProcedure}>
          <Text style={styles.smallButtonText}>Test Hi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.smallButton} onPress={testCreateGoal}>
          <Text style={styles.smallButtonText}>Test Create Goal</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.smallButton} onPress={testGenerateTodayTasks}>
          <Text style={styles.smallButtonText}>Test Generate Tasks</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.smallButton} onPress={testCreateUltimateGoal}>
          <Text style={styles.smallButtonText}>Test Ultimate Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
        {testResults.length === 0 && (
          <Text style={styles.noResults}>No test results yet. Run some tests!</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  individualTests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  smallButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  smallButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    maxHeight: 400,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resultText: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'monospace',
    color: '#333',
  },
  noResults: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
});