import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { trpcClient } from '@/lib/trpc';

export const TRPCHealthCheck: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const testTRPCConnection = async () => {
    setIsLoading(true);
    try {
      console.log('Testing tRPC connection...');
      
      // Test the simple hi procedure
      const result = await trpcClient.example.hi.query({ name: 'Health Check' });
      
      console.log('tRPC test result:', result);
      setLastResult(`✅ tRPC Working: ${result.message}`);
      Alert.alert('Success', 'tRPC connection is working!');
      
    } catch (error) {
      console.error('tRPC test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ tRPC Failed: ${errorMessage}`);
      Alert.alert('Error', `tRPC test failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testGoalCreation = async () => {
    setIsLoading(true);
    try {
      console.log('Testing goal creation...');
      
      const testGoal = {
        title: 'Test Goal',
        description: 'This is a test goal',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        category: 'test',
        targetValue: 100,
        unit: 'points',
        priority: 'medium' as const,
        color: '#FF0000',
        coverImage: undefined
      };
      
      const result = await trpcClient.goals.create.mutate(testGoal);
      
      console.log('Goal creation test result:', result);
      setLastResult(`✅ Goal Creation Working: ${result.goal.title}`);
      Alert.alert('Success', 'Goal creation is working!');
      
    } catch (error) {
      console.error('Goal creation test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Goal Creation Failed: ${errorMessage}`);
      Alert.alert('Error', `Goal creation test failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testUltimateGoalCreation = async () => {
    setIsLoading(true);
    try {
      console.log('Testing ultimate goal creation...');
      
      const testGoal = {
        title: 'Test Ultimate Goal',
        description: 'This is a test ultimate goal with streak tasks',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        category: 'test',
        targetValue: 100,
        unit: 'points',
        priority: 'medium' as const,
        color: '#FF0000',
        coverImage: undefined
      };
      
      const result = await trpcClient.goals.createUltimate.mutate(testGoal);
      
      console.log('Ultimate goal creation test result:', result);
      setLastResult(`✅ Ultimate Goal Creation Working: ${result.goal.title} (${result.streakTasksCreated} streak tasks created)`);
      Alert.alert('Success', `Ultimate goal creation is working! Created ${result.streakTasksCreated} streak tasks.`);
      
    } catch (error) {
      console.error('Ultimate goal creation test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Ultimate Goal Creation Failed: ${errorMessage}`);
      Alert.alert('Error', `Ultimate goal creation test failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testTaskGeneration = async () => {
    setIsLoading(true);
    try {
      console.log('Testing task generation...');
      
      const today = new Date().toISOString().split('T')[0];
      const result = await trpcClient.tasks.generateToday.mutate({
        date: today
      });
      
      console.log('Task generation test result:', result);
      setLastResult(`✅ Task Generation Working: ${result.tasks.length} tasks generated - ${result.notice}`);
      Alert.alert('Success', `Task generation is working! Generated ${result.tasks.length} tasks.`);
      
    } catch (error) {
      console.error('Task generation test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Task Generation Failed: ${errorMessage}`);
      Alert.alert('Error', `Task generation test failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>tRPC Health Check</Text>
      
      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testTRPCConnection}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test tRPC Connection'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testGoalCreation}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Goal Creation'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testUltimateGoalCreation}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Ultimate Goal Creation'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testTaskGeneration}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Task Generation'}
        </Text>
      </TouchableOpacity>

      {lastResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
  },
  resultText: {
    fontSize: 14,
    textAlign: 'center',
  },
});