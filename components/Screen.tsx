import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

export default function Screen({ children }: { children: React.ReactNode }) {
  const { bottom } = useSafeAreaInsets();
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.inner, { paddingBottom: bottom }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: Colors.dark.background 
  },
  inner: { 
    flex: 1 
  },
});