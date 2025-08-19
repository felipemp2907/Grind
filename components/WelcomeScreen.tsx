import React from "react";
import { SafeAreaView, View, Text, Pressable, StatusBar, StyleSheet, Image } from "react-native";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const router = useRouter();

  const onGetStarted = () => {
    router.push("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Target icon - using the adaptive icon */}
          <Image 
            source={require('@/assets/images/adaptive-icon.png')} 
            style={styles.target}
            resizeMode="contain"
          />

          {/* Title */}
          <Text style={styles.title}>Welcome to the Grind</Text>
        </View>

        <View style={styles.bottomSection}>
          {/* Primary CTA */}
          <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
            <Text style={styles.ctaText}>Let&apos;s Get Started</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#000" },
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 50,
  },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: 48,
  },
  target: {
    width: 120,
    height: 120,
  },
  title: {
    color: "#fff",
    textAlign: "center",
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 56,
  },
  bottomSection: {
    alignItems: "center",
    width: "100%",
    paddingBottom: 20,
  },
  cta: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  ctaText: { color: "#000", fontSize: 18, fontWeight: "700" },
});