import React from "react";
import { SafeAreaView, View, Text, Pressable, StatusBar, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";

export default function WelcomeScreen() {
  const router = useRouter();

  const onGetStarted = () => {
    router.push("/login");
  };

  const onSignIn = () => {
    router.push("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Target icon */}
        <Svg width={132} height={132} viewBox="0 0 132 132" style={styles.target}>
          <Circle cx="66" cy="66" r="64" stroke="#fff" strokeWidth="8" fill="none" />
          <Circle cx="66" cy="66" r="44" stroke="#fff" strokeWidth="8" fill="none" />
          <Circle cx="66" cy="66" r="24" stroke="#fff" strokeWidth="8" fill="none" />
          <Circle cx="66" cy="66" r="6"  fill="#fff" />
        </Svg>

        {/* Title */}
        <Text style={styles.title}>
          <Text style={styles.titleLine}>Welcome to{"\n"}</Text>
          <Text style={styles.titleStrong}>Grind</Text>
        </Text>

        {/* Primary CTA */}
        <Pressable onPress={onGetStarted} style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaText}>Let&apos;s Get Started</Text>
        </Pressable>

        {/* Secondary link */}
        <Pressable onPress={onSignIn} style={styles.secondary}>
          <Text style={styles.secondaryText}>
            I have an account <Text style={styles.secondaryEm}>→ Sign In</Text>
          </Text>
        </Pressable>
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
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 28,
  },
  target: { marginBottom: 4 },
  title: { color: "#fff", textAlign: "center", lineHeight: 44 },
  titleLine: { fontSize: 36, fontWeight: "700" },
  titleStrong: { fontSize: 48, fontWeight: "800" },
  cta: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 28,
    minWidth: 280,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  ctaText: { color: "#000", fontSize: 18, fontWeight: "700" },
  secondary: { marginTop: 8 },
  secondaryText: { color: "#BFBFBF", fontSize: 16 },
  secondaryEm: { color: "#ffffff", fontWeight: "700" },
});