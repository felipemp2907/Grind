import React from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import ApiHealthCheck from '@/components/ApiHealthCheck';

export default function DebugScreen() {
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
        <ApiHealthCheck />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
});