import React, { useCallback } from "react";
import { SafeAreaView, View, Text, Pressable, StatusBar, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

export default function WelcomeScreen() {
  const router = useRouter();

  const onGetStarted = useCallback(async () => {
    console.log("WelcomeScreen: Get Started pressed");
    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        console.log("Haptics not available on web");
      }
    } catch (e) {
      console.log("Haptics error", e);
    }
    router.push("/login");
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} testID="welcome-safe">
      <StatusBar barStyle="light-content" />
      <View style={styles.container} testID="welcome-container">
        <View style={styles.content} testID="welcome-content">
          <Image
            source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/486prhpy709lci47un0b2" }}
            style={styles.target}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={100}
            testID="welcome-target"
          />

          <Text style={styles.title} testID="welcome-title">
            <Text style={styles.titleRegular}>Welcome to the </Text>
            <Text style={styles.titleBold}>Grind</Text>
          </Text>
        </View>

        <View style={styles.bottomSection} testID="welcome-bottom">
          <Pressable
            onPress={onGetStarted}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            testID="welcome-cta"
            accessibilityRole="button"
            accessibilityLabel="Let's Get Started"
          >
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
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 64,
  },
  content: {
    alignItems: "center",
    gap: 0,
    marginTop: -64,
  },
  target: {
    width: 360,
    height: 360,
  },
  title: {
    color: "#fff",
    textAlign: "center",
    lineHeight: 52,
    marginTop: -36,
  },
  titleRegular: {
    fontSize: 46,
    fontWeight: "400",
  },
  titleBold: {
    fontSize: 52,
    fontWeight: "700",
  },
  bottomSection: {
    alignItems: "center",
    width: "100%",
    marginTop: 20,
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