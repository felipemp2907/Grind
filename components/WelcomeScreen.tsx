import React from "react";
import { SafeAreaView, View, Text, Pressable, StatusBar, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";

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
          {/* Target icon */}
          <Svg width={120} height={120} viewBox="0 0 120 120" style={styles.target}>
            <Circle cx="60" cy="60" r="58" fill="#fff" />
            <Circle cx="60" cy="60" r="44" fill="#000" />
            <Circle cx="60" cy="60" r="30" fill="#fff" />
            <Circle cx="60" cy="60" r="16" fill="#000" />
            <Circle cx="60" cy="60" r="8" fill="#fff" />
          </Svg>

          {/* Title */}
          <Text style={styles.title}>Welcome to{"\n"}Grind</Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>Your AI discipline & goal{"\n"}execution system</Text>
        </View>

        <View style={styles.bottomSection}>
          {/* Dots */}
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

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
    gap: 32,
  },
  target: {
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    textAlign: "center",
    fontSize: 48,
    fontWeight: "700",
    lineHeight: 56,
  },
  subtitle: {
    color: "#fff",
    textAlign: "center",
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 24,
    opacity: 0.8,
  },
  bottomSection: {
    alignItems: "center",
    gap: 32,
    width: "100%",
  },
  dots: {
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#333",
  },
  dotActive: {
    backgroundColor: "#fff",
  },
  cta: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
  },
  ctaPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  ctaText: { color: "#000", fontSize: 18, fontWeight: "700" },
});