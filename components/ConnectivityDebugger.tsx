import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { checkApiConnectivity } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';

export function ConnectivityDebugger() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [apiUrl, setApiUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  const checkConnectivity = async () => {
    setApiStatus('checking');
    setDbStatus('checking');
    setError('');

    // Check API connectivity
    try {
      const apiCheck = await checkApiConnectivity();
      setApiUrl(apiCheck.url || 'Unknown');
      setApiStatus(apiCheck.connected ? 'connected' : 'disconnected');
      if (!apiCheck.connected && apiCheck.error) {
        setError(apiCheck.error);
      }
    } catch (err) {
      setApiStatus('disconnected');
      setError(err instanceof Error ? err.message : 'API check failed');
    }

    // Check database connectivity
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      setDbStatus(dbError ? 'error' : 'connected');
    } catch {
      setDbStatus('error');
    }
  };

  useEffect(() => {
    checkConnectivity();
  }, []);

  const testGoalCreation = async () => {
    try {
      Alert.alert('Test', 'This will create a test goal using the client-side planner. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Test Goal', 
          onPress: async () => {
            try {
              // Import the goal store dynamically to avoid circular imports
              const { useGoalStore } = await import('@/store/goalStore');
              const { createUltimateGoal } = useGoalStore.getState();
              
              await createUltimateGoal({
                title: 'Test Goal',
                description: 'This is a test goal to verify the client-side planner works',
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
                category: 'general',
                priority: 'medium'
              });
              
              Alert.alert('Success', 'Test goal created successfully!');
            } catch (error) {
              Alert.alert('Error', `Failed to create test goal: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Error', `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connectivity Status</Text>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>API Status:</Text>
        <Text style={[styles.status, { color: apiStatus === 'connected' ? '#4CAF50' : apiStatus === 'disconnected' ? '#F44336' : '#FF9800' }]}>
          {apiStatus.toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>Database:</Text>
        <Text style={[styles.status, { color: dbStatus === 'connected' ? '#4CAF50' : dbStatus === 'error' ? '#F44336' : '#FF9800' }]}>
          {dbStatus.toUpperCase()}
        </Text>
      </View>
      
      <Text style={styles.url}>API URL: {apiUrl}</Text>
      
      {error && (
        <Text style={styles.error}>Error: {error}</Text>
      )}
      
      <TouchableOpacity style={styles.button} onPress={checkConnectivity}>
        <Text style={styles.buttonText}>Recheck Connectivity</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.testButton} onPress={testGoalCreation}>
        <Text style={styles.buttonText}>Test Goal Creation</Text>
      </TouchableOpacity>
      
      <Text style={styles.info}>
        {apiStatus === 'disconnected' 
          ? '📱 Using client-side planner (offline mode)' 
          : '🌐 Using server planner (online mode)'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  url: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  error: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});