import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { trpcClient } from '@/lib/trpc';

export const TRPCTestComponent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const testTRPCConnection = async () => {
    setIsLoading(true);
    try {
      console.log('Testing tRPC connection...');
      
      // Test the simple hi endpoint first
      const hiResult = await trpcClient.example.hi.query({ name: 'Test User' });
      console.log('Hi result:', hiResult);
      
      setLastResult(`✅ tRPC Connection Working!\nMessage: ${hiResult.message}\nHello: ${hiResult.hello}`);
      
    } catch (error) {
      console.error('tRPC test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ tRPC Connection Failed!\nError: ${errorMessage}`);
      Alert.alert('tRPC Test Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const testGoalCreation = async () => {
    setIsLoading(true);
    try {
      console.log('Testing goal creation...');
      
      const testGoalData = {
        title: 'Test Goal from tRPC',
        description: 'This is a test goal to verify tRPC is working',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        category: 'test',
        targetValue: 100,
        unit: 'points',
        priority: 'medium' as const,
        color: '#FF6B6B',
        coverImage: undefined
      };
      
      const result = await trpcClient.goals.create.mutate(testGoalData);
      console.log('Goal creation result:', result);
      
      setLastResult(`✅ Goal Creation Working!\nGoal ID: ${result.goal.id}\nTitle: ${result.goal.title}`);
      
    } catch (error) {
      console.error('Goal creation test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Goal Creation Failed!\nError: ${errorMessage}`);
      Alert.alert('Goal Creation Test Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const testUltimateGoalCreation = async () => {
    setIsLoading(true);
    try {
      console.log('Testing ultimate goal creation...');
      
      const testGoalData = {
        title: 'Test Ultimate Goal from tRPC',
        description: 'This is a test ultimate goal to verify tRPC is working',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
        category: 'test',
        targetValue: 100,
        unit: 'points',
        priority: 'high' as const,
        color: '#4ECDC4',
        coverImage: undefined
      };
      
      const result = await trpcClient.goals.createUltimate.mutate(testGoalData);
      console.log('Ultimate goal creation result:', result);
      
      setLastResult(`✅ Ultimate Goal Creation Working!\nGoal ID: ${result.goal.id}\nStreak Tasks: ${result.streakTasksCreated}\nDays: ${result.daysToDeadline}`);
      
    } catch (error) {
      console.error('Ultimate goal creation test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Ultimate Goal Creation Failed!\nError: ${errorMessage}`);
      Alert.alert('Ultimate Goal Creation Test Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>tRPC Connection Test</Text>
      
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
        style={[styles.button, styles.buttonSecondary, isLoading && styles.buttonDisabled]} 
        onPress={testGoalCreation}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Goal Creation'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.buttonPrimary, isLoading && styles.buttonDisabled]} 
        onPress={testUltimateGoalCreation}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Ultimate Goal Creation'}
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
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#34C759',
  },
  buttonPrimary: {
    backgroundColor: '#FF3B30',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
    lineHeight: 20,
  },
});