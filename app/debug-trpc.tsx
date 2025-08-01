import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { TRPCTestComponent } from '@/components/TRPCTestComponent';

export default function DebugTRPCScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Debug tRPC',
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTitleStyle: { fontWeight: 'bold' }
        }} 
      />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <TRPCTestComponent />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
});