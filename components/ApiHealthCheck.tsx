import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { checkApiConnectivity, trpc } from '@/lib/trpc';

interface ApiStatus {
  connected: boolean;
  url?: string;
  procedures?: string[];
  error?: string;
}

export default function ApiHealthCheck() {
  const [status, setStatus] = useState<ApiStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [directTest, setDirectTest] = useState<{ url: string; result: string } | null>(null);
  
  // Test tRPC health ping
  const healthQuery = trpc.health.ping.useQuery(undefined, {
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const checkHealth = async () => {
    setLoading(true);
    try {
      const result = await checkApiConnectivity();
      setStatus(result);
    } catch (error) {
      setStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const testDirectUrl = async () => {
    const testUrl = 'https://expo-app-rork.vercel.app/api/health';
    try {
      console.log('Testing direct URL:', testUrl);
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const text = await response.text();
      console.log('Direct URL response:', response.status, text);
      
      setDirectTest({
        url: testUrl,
        result: `Status: ${response.status}\nResponse: ${text.slice(0, 500)}`
      });
    } catch (error) {
      console.error('Direct URL test failed:', error);
      setDirectTest({
        url: testUrl,
        result: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = () => {
    if (loading) return <RefreshCw size={24} color={Colors.dark.primary} />;
    if (status?.connected) return <CheckCircle size={24} color={Colors.dark.success} />;
    return <XCircle size={24} color={Colors.dark.danger} />;
  };

  const getStatusColor = () => {
    if (loading) return Colors.dark.primary;
    if (status?.connected) return Colors.dark.success;
    return Colors.dark.danger;
  };

  const getStatusText = () => {
    if (loading) return 'Checking API connection...';
    if (status?.connected) return 'API Connected ✅';
    return 'API Connection Failed ❌';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>API Health Check</Text>
          <Text style={styles.subtitle}>Verifying backend connectivity</Text>
        </View>

        <View style={[styles.statusCard, { borderLeftColor: getStatusColor() }]}>
          <View style={styles.statusHeader}>
            {getStatusIcon()}
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          
          {status?.url && (
            <Text style={styles.detailText}>URL: {status.url}</Text>
          )}
          
          {status?.error && (
            <Text style={styles.errorText}>Error: {status.error}</Text>
          )}
        </View>

        <View style={styles.trpcCard}>
          <Text style={styles.cardTitle}>tRPC Health Ping</Text>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { 
              color: healthQuery.isSuccess ? Colors.dark.success : 
                     healthQuery.isError ? Colors.dark.danger : 
                     Colors.dark.warning 
            }]}>
              {healthQuery.isLoading ? 'Loading...' :
               healthQuery.isSuccess ? 'Success' :
               healthQuery.isError ? 'Failed' : 'Idle'}
            </Text>
          </View>
          
          {healthQuery.data && (
            <View style={styles.statusRow}>
              <Text style={styles.label}>Response:</Text>
              <Text style={styles.value}>{JSON.stringify(healthQuery.data)}</Text>
            </View>
          )}
          
          {healthQuery.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorLabel}>Error:</Text>
              <Text style={styles.errorText}>{healthQuery.error.message}</Text>
            </View>
          )}
        </View>

        {status?.procedures && status.procedures.length > 0 && (
          <View style={styles.proceduresCard}>
            <Text style={styles.cardTitle}>Available Procedures</Text>
            {status.procedures.map((proc, index) => (
              <View key={index} style={styles.procedureRow}>
                <CheckCircle size={16} color={Colors.dark.success} />
                <Text style={styles.procedureText}>{proc}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.refreshButton, { flex: 1, marginRight: 8 }]} 
            onPress={checkHealth}
            disabled={loading}
          >
            <RefreshCw size={20} color={Colors.dark.text} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.refreshButton, { flex: 1, marginLeft: 8 }]} 
            onPress={testDirectUrl}
          >
            <AlertCircle size={20} color={Colors.dark.text} />
            <Text style={styles.refreshText}>Test Direct</Text>
          </TouchableOpacity>
        </View>
        
        {directTest && (
          <View style={styles.trpcCard}>
            <Text style={styles.cardTitle}>Direct URL Test</Text>
            <Text style={styles.detailText}>URL: {directTest.url}</Text>
            <Text style={styles.value}>{directTest.result}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <AlertCircle size={20} color={Colors.dark.warning} />
          <Text style={styles.infoText}>
            If the API is not connected, make sure your backend server is running on the correct port and set EXPO_PUBLIC_API_URL if needed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.subtext,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  detailText: {
    fontSize: 14,
    color: Colors.dark.subtext,
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: Colors.dark.danger,
    marginTop: 4,
  },
  trpcCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark.text,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: Colors.dark.subtext,
    width: 80,
  },
  value: {
    fontSize: 14,
    color: Colors.dark.text,
    flex: 1,
  },
  errorContainer: {
    marginTop: 8,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark.danger,
    marginBottom: 4,
  },
  proceduresCard: {
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  procedureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  procedureText: {
    fontSize: 14,
    color: Colors.dark.text,
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card,
    borderRadius: 12,
    padding: 16,
  },
  refreshText: {
    fontSize: 16,
    color: Colors.dark.text,
    marginLeft: 8,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 14,
    color: Colors.dark.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});