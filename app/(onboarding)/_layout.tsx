import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{
      animation: 'slide_from_bottom',
      headerShown: false,
      presentation: 'transparentModal',
      contentStyle: { backgroundColor: 'transparent' }
    }}>
      <Stack.Screen name="welcome" />
    </Stack>
  );
}