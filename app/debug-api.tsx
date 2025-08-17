import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import ApiHealthCheck from '@/components/ApiHealthCheck';
import { trpcClient } from '@/lib/trpc';

export default function DebugScreen() {
  const [testResult, setTestResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testGoalCreation = async () => {
    setLoading(true);
    setTestResult('Testing goal creation...');
    
    try {
      const result = await trpcClient.goals.createUltimate.mutate({
        title: 'Test Goal',
        description: 'This is a test goal to verify the API is working',
        deadlineISO: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        category: 'test',
        targetValue: 100,
        unit: 'points',
        priority: 'medium' as const,
      });
      
      setTestResult(`✅ Goal created successfully! ID: ${result.goal.id}\nSeeded: ${result.seeded}\nSummary: ${JSON.stringify(result.summary, null, 2)}`);
    } catch (error) {
      setTestResult(`❌ Goal creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: "API Debug",
          headerStyle: {
            backgroundColor: Colors.dark.card,
          },
          headerTintColor: Colors.dark.text,
        }}
      />
      
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ApiHealthCheck />
          
          <View style={styles.testSection}>
            <Text style={styles.sectionTitle}>Goal Creation Test</Text>
            <TouchableOpacity 
              style={[styles.testButton, loading && styles.testButtonDisabled]}
              onPress={testGoalCreation}
              disabled={loading}
            >
              <Text style={styles.testButtonText}>
                {loading ? 'Testing...' : 'Test Goal Creation'}
              </Text>
            </TouchableOpacity>
            
            {testResult && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultText}>{testResult}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: 16,
  },
  testSection: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: Colors.dark.text,
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  testButtonDisabled: {
    backgroundColor: Colors.dark.subtext,
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600' as const,
    fontSize: 16,
  },
  resultContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontFamily: 'monospace',
  },
});