import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import colors from '@/constants/colors';
import { checkApiConnectivity } from '@/lib/trpc';

interface ConnectivityBannerProps {
  onDismiss?: () => void;
}

export function ConnectivityBanner({ onDismiss }: ConnectivityBannerProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [apiUrl, setApiUrl] = useState<string>('');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await checkApiConnectivity();
        setIsConnected(result.connected);
        setApiUrl(result.url || '');
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

  // Don't show if connected, dismissed, or still checking
  if (isConnected !== false || isDismissed) {
    return null;
  }

  return (
    <View style={styles.banner}>
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
          Set EXPO_PUBLIC_API_URL if using a custom server.
        </Text>
      </View>
      <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
        <X size={20} color={colors.dark.subtext} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
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