import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Purchases from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../constants/theme";
import { useProStatus } from "../hooks/useProStatus";
import { trackEvent } from "../lib/analytics";
import { safeRouterBack } from "../lib/safeRouterBack";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refresh } = useProStatus();
  const [restoreBusy, setRestoreBusy] = useState(false);

  const onRestore = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Web preview", "Restore purchases is available in the iOS/Android app.");
      return;
    }
    setRestoreBusy(true);
    try {
      await Purchases.restorePurchases();
      await refresh();
      void trackEvent("paywall_restore");
      Alert.alert("Restored", "Purchases restored successfully.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Restore failed.";
      Alert.alert("Restore failed", message);
    } finally {
      setRestoreBusy(false);
    }
  }, [refresh]);

  const onSubscribe = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription</Text>
        <Text style={styles.cardBody}>Get Unlimited or restore a previous purchase.</Text>
        <Pressable onPress={onSubscribe} style={({ pressed }) => [styles.actionBtnPrimary, pressed && styles.pressed]}>
          <Text style={styles.actionTextPrimary}>Get Unlimited</Text>
        </Pressable>
        <Pressable onPress={() => void onRestore()} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
          {restoreBusy ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.actionText}>Restore purchases</Text>}
        </Pressable>
      </View>

      <View style={styles.legalFooter}>
        <Text style={styles.legalMicro}>
          By using Nudgrr you agree to the{" "}
          <Text onPress={() => router.push("/terms")} style={styles.legalLink}>
            Terms of Use
          </Text>{" "}
          and{" "}
          <Text onPress={() => router.push("/privacy")} style={styles.legalLink}>
            Privacy Policy
          </Text>
          .
        </Text>
        <Text style={styles.legalMicro}>
          Subscription purchases are subject to the terms of the app store you use (Apple or Google).
        </Text>
        <Pressable
          onPress={() => void Linking.openURL("mailto:nudgrr@noorlyfe.com?subject=Nudgrr%20support")}
          style={({ pressed }) => [styles.supportRow, pressed && styles.pressed]}
        >
          <Text style={styles.legalMicro}>
            Support: <Text style={styles.legalLink}>nudgrr@noorlyfe.com</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { minWidth: 56, minHeight: 44, justifyContent: "center" },
  backText: { ...typography.body, color: colors.accent, fontFamily: "SpaceMono_700Bold" },
  title: { ...typography.body, fontFamily: "SpaceMono_700Bold", fontSize: 18, color: colors.textPrimary },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.body, fontFamily: "SpaceMono_700Bold", color: colors.textPrimary },
  cardBody: { ...typography.badge, color: colors.textSecondary, lineHeight: 18 },
  actionBtnPrimary: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  actionBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  actionTextPrimary: { ...typography.body, fontSize: 15, fontFamily: "SpaceMono_700Bold", color: colors.pillActiveText },
  actionText: { ...typography.body, fontSize: 14, color: colors.textPrimary },
  legalFooter: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
    alignItems: "center",
  },
  legalMicro: {
    ...typography.badge,
    fontSize: 10,
    lineHeight: 15,
    color: colors.textSecondary,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  legalLink: {
    color: colors.textPrimary,
    textDecorationLine: "underline",
  },
  supportRow: { paddingVertical: 2 },
  pressed: { opacity: 0.86 },
});

