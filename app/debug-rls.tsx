import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { RLSPermissionTest } from '@/components/RLSPermissionTest';

export default function DebugRLSPage() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Debug RLS Permissions',
          headerStyle: { backgroundColor: '#f5f5f5' },
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      <ScrollView style={styles.container}>
        <RLSPermissionTest />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});