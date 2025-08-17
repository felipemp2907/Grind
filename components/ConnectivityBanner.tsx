import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { AlertTriangle, X, CheckCircle } from 'lucide-react-native';
import colors from '@/constants/colors';
import { checkApiConnectivity, trpcClient } from '@/lib/trpc';

interface ConnectivityBannerProps {
  onDismiss?: () => void;
  showWhenConnected?: boolean;
}

export function ConnectivityBanner({ onDismiss, showWhenConnected = false }: ConnectivityBannerProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [apiUrl, setApiUrl] = useState<string>('');
  const [procedures, setProcedures] = useState<string[]>([]);
  const [testingTrpc, setTestingTrpc] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await checkApiConnectivity();
        setIsConnected(result.connected);
        setApiUrl(result.url || '');
        setProcedures(result.procedures || []);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const testTrpcHealth = async () => {
    setTestingTrpc(true);
    try {
      console.log('Testing tRPC health.ping...');
      const result = await trpcClient.health.ping.query();
      console.log('tRPC health.ping result:', result);
      Alert.alert('tRPC Test', `Success: ${result}`);
    } catch (error) {
      console.error('tRPC health.ping error:', error);
      Alert.alert('tRPC Test Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setTestingTrpc(false);
    }
  };

  // Don't show if dismissed, or if not connected and not showing when connected
  if (isDismissed || (isConnected === null)) {
    return null;
  }
  
  if (!showWhenConnected && isConnected) {
    return null;
  }

  if (isConnected) {
    return (
      <TouchableOpacity 
        style={[styles.banner, styles.successBanner]} 
        onPress={() => {
          Alert.alert(
            'API Connected',
            `URL: ${apiUrl}\nProcedures: ${procedures.join(', ')}`,
            [
              { text: 'Test tRPC', onPress: testTrpcHealth },
              { text: 'OK' }
            ]
          );
        }}
      >
        <CheckCircle size={20} color={colors.dark.success} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>API Connected</Text>
          <Text style={styles.subtitle}>Backend server is reachable</Text>
          <Text style={styles.url}>{apiUrl}</Text>
          <Text style={styles.hint}>Tap for details</Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
          <X size={20} color={colors.dark.subtext} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      style={[styles.banner, styles.errorBanner]}
      onPress={() => {
        Alert.alert(
          'API Connection Failed',
          `Cannot connect to backend server.\n\nURL: ${apiUrl}\n\nSet EXPO_PUBLIC_API_URL to your server URL if needed.`,
          [
            { 
              text: 'Retry', 
              onPress: () => {
                if (Platform.OS === 'web') {
                  window.location.reload();
                } else {
                  // For mobile, just re-check connectivity
                  setIsConnected(null);
                }
              }
            },
            { text: 'OK' }
          ]
        );
      }}
    >
      <AlertTriangle size={20} color={colors.dark.warning} />
      <View style={styles.textContainer}>
        <Text style={styles.title}>API Not Reachable</Text>
        <Text style={styles.subtitle}>
          Cannot connect to the backend server. Some features may not work.
        </Text>
        {apiUrl && (
          <Text style={styles.url}>Trying: {apiUrl}</Text>
        )}
        <Text style={styles.hint}>
          Tap for options. Set EXPO_PUBLIC_API_URL if using a custom server.
        </Text>
      </View>
      <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
        <X size={20} color={colors.dark.subtext} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  successBanner: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.dark.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.dark.subtext,
    marginBottom: 4,
  },
  url: {
    fontSize: 11,
    color: colors.dark.subtext,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  hint: {
    fontSize: 11,
    color: colors.dark.subtext,
    fontStyle: 'italic',
  },
  dismissButton: {
    padding: 4,
  },
});