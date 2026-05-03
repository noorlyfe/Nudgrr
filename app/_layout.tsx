import "react-native-gesture-handler";
import { useEffect } from "react";
import { Platform } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

import {
  isRevenueCatApiKeySet,
  REVENUECAT_API_KEY_ANDROID,
  REVENUECAT_API_KEY_IOS,
} from "../constants/purchases";
import { colors } from "../constants/theme";

const MIN_SPLASH_MS = 1200;
const appBootTs = Date.now();

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    if (!isRevenueCatApiKeySet()) {
      return;
    }
    void (async () => {
      try {
        await Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
        if (Platform.OS === "ios") {
          await Purchases.configure({ apiKey: REVENUECAT_API_KEY_IOS });
        } else if (Platform.OS === "android") {
          await Purchases.configure({ apiKey: REVENUECAT_API_KEY_ANDROID });
        }
      } catch {
        // Invalid key / native module; useProStatus will still resolve as non‑subscriber.
      }
    })();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      const elapsed = Date.now() - appBootTs;
      const waitMs = Math.max(0, MIN_SPLASH_MS - elapsed);
      const timer = setTimeout(() => {
        void SplashScreen.hideAsync();
      }, waitMs);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen
        name="paywall"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
