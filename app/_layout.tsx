import "react-native-gesture-handler";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useMemo } from "react";
import { I18nManager, Platform, StyleSheet, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";

import {
  isRevenueCatApiKeySet,
  REVENUECAT_API_KEY_ANDROID,
  REVENUECAT_API_KEY_IOS,
} from "../constants/purchases";
import { useColors } from "../hooks/useColors";
import { ThemeProvider } from "../hooks/useTheme";
import { UpdateGate } from "../components/UpdateGate";
import { LocaleProvider, useLocale } from "../contexts/LocaleContext";
import { AppPreferencesProvider } from "../hooks/useAppPreferences";
import { ReceiptFooterProvider } from "../hooks/useReceiptFooter";
import { initOneSignal } from "../lib/oneSignal";

SplashScreen.preventAutoHideAsync();

if (Platform.OS !== "web") {
  void initOneSignal();
}

/** Matches splash screen — frame-perfect handoff from native splash */
const SPLASH_BACKGROUND = "#FFF9F0";

function AppShell({ fontsLoaded }: { fontsLoaded: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(), []);

  const { isRTL } = useLocale();

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }
  }, [isRTL]);

  if (!fontsLoaded) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="person" />
        <Stack.Screen name="history" />
        <Stack.Screen name="project" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="currency" />
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
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono_400Regular: require("../assets/fonts/SpaceMono_400Regular.ttf"),
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
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
        const { default: Purchases, LOG_LEVEL } = await import("react-native-purchases");
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
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  return (
    <ThemeProvider>
      <AppPreferencesProvider>
        <ReceiptFooterProvider>
          <LocaleProvider>
            <UpdateGate>
              <AppShell fontsLoaded={fontsLoaded} />
            </UpdateGate>
          </LocaleProvider>
        </ReceiptFooterProvider>
      </AppPreferencesProvider>
    </ThemeProvider>
  );
}

function createStyles() {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: SPLASH_BACKGROUND,
    },
  });
}
