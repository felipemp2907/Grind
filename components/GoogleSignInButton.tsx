import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';

interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  style?: any;
}

export default function GoogleSignInButton({ onPress, loading = false, style }: GoogleSignInButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={Colors.dark.text} />
        ) : (
          <>
            <View style={styles.iconContainer}>
              <Text style={styles.googleIcon}>G</Text>
            </View>
            <Text style={styles.text}>Continue with Google (Demo)</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginVertical: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  text: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
  },
});