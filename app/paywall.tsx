import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Purchases, {
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radii, spacing, typography } from "../constants/theme";
import { isRevenueCatApiKeySet } from "../constants/purchases";
import { useProStatus } from "../hooks/useProStatus";
import { trackEvent } from "../lib/analytics";
import { presentRevenueCatPaywall } from "../lib/presentRevenueCatPaywall";
import { safeRouterBack } from "../lib/safeRouterBack";

function pickSubscriptionPackage(offerings: PurchasesOfferings): PurchasesPackage | null {
  const current = offerings.current;
  if (!current) {
    return null;
  }
  if (current.monthly) {
    return current.monthly;
  }
  const monthly = current.availablePackages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  if (monthly) {
    return monthly;
  }
  if (current.availablePackages.length > 0) {
    return current.availablePackages[0];
  }
  return null;
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { refresh } = useProStatus();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"purchase" | "restore" | "rc_ui" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [packageToBuy, setPackageToBuy] = useState<PurchasesPackage | null>(null);
  const [priceLabel, setPriceLabel] = useState<string>("$4.99 / month");

  const close = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const loadOffering = useCallback(async () => {
    if (Platform.OS === "web") {
      setLoading(false);
      return;
    }
    if (!isRevenueCatApiKeySet()) {
      setError("Subscription is not configured in this build. Add your RevenueCat API key to the environment variables.");
      setLoading(false);
      void trackEvent("paywall_fallback");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = pickSubscriptionPackage(offerings);
      if (!pkg) {
        setError(
          "No subscription offering found. In RevenueCat, set a Current Offering with at least one package, and link it to the App Store / Google Play."
        );
        setPackageToBuy(null);
        void trackEvent("paywall_fallback");
        return;
      }
      setPackageToBuy(pkg);
      const product = pkg.product;
      if (product?.priceString) {
        setPriceLabel(`${product.priceString} / month`);
      }
    } catch {
      setError("Could not load offerings. Check your network and RevenueCat setup.");
      void trackEvent("paywall_fallback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void trackEvent("paywall_opened");
    void loadOffering();
  }, [loadOffering]);

  const onSubscribe = useCallback(async () => {
    if (Platform.OS === "web" || !packageToBuy) {
      return;
    }
    setBusy("purchase");
    try {
      await Purchases.purchasePackage(packageToBuy);
      await refresh();
      void trackEvent("paywall_purchase");
      Alert.alert("Thanks!", "You now have Unlimited.", [{ text: "OK", onPress: () => safeRouterBack(router) }]);
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : undefined;
      if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        // User cancelled — stay on screen
      } else {
        const message = e instanceof Error ? e.message : "The purchase could not be completed.";
        Alert.alert("Purchase failed", message);
      }
    } finally {
      setBusy(null);
    }
  }, [packageToBuy, refresh, router]);

  const onRestore = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    setBusy("restore");
    try {
      await Purchases.restorePurchases();
      await refresh();
      void trackEvent("paywall_restore");
      Alert.alert("Restored", "Your purchases were restored.", [{ text: "OK", onPress: () => safeRouterBack(router) }]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Restore failed.";
      Alert.alert("Restore failed", message);
    } finally {
      setBusy(null);
    }
  }, [refresh, router]);

  const onOpenRevenueCatPaywall = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    setBusy("rc_ui");
    try {
      const result = await presentRevenueCatPaywall();
      await refresh();
      if (result.kind === "purchased") {
        void trackEvent("paywall_purchase");
        safeRouterBack(router);
      }
      if (result.kind === "restored") {
        void trackEvent("paywall_restore");
        safeRouterBack(router);
      }
      if (result.kind === "error" || result.kind === "not_presented") {
        void trackEvent("paywall_fallback");
        Alert.alert(
          "Paywall",
          "The store paywall could not be opened. Use the Subscribe button above, or check that a paywall is attached to your Current Offering in RevenueCat."
        );
      }
    } finally {
      setBusy(null);
    }
  }, [refresh, router]);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <Pressable onPress={close} hitSlop={12} style={styles.closeRow}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
        <View style={styles.center}>
          <Text style={styles.lead}>Subscribe on the iOS or Android app.</Text>
          <Text style={styles.hint}>
            Here you can still use the bill split, nudges, and receipt preview. Unlimited and purchases are only in the mobile app.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={close} hitSlop={12} style={styles.closeRow}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>

        <Text style={styles.title}>Nudgrr Unlimited</Text>
        <Text style={styles.price}>{priceLabel}</Text>
        <Text style={styles.lead}>
          Unlimited nudges, split history, and a custom line on the receipt — one monthly price.
        </Text>

        <View style={styles.bullets}>
          <Text style={styles.bullet}>• Unlimited nudges (text reminders to your group)</Text>
          <Text style={styles.bullet}>• Look back at past splits in History</Text>
          <Text style={styles.bullet}>• Add your own line on the shared receipt image</Text>
        </View>

        {loading ? (
          <View style={styles.block}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.hint}>Loading offer…</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.block}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void loadOffering()} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}>
              <Text style={styles.secondaryBtnText}>Try again</Text>
            </Pressable>
          </View>
        ) : null}

        {!loading && !error && packageToBuy ? (
          <View style={styles.block}>
            <Pressable
              onPress={() => void onSubscribe()}
              disabled={busy !== null}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed, busy !== null && styles.disabled]}
            >
              {busy === "purchase" ? (
                <ActivityIndicator color={colors.pillActiveText} />
              ) : (
                <Text style={styles.primaryBtnText}>Subscribe</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => void onRestore()}
              disabled={busy !== null}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              {busy === "restore" ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.secondaryBtnText}>Restore purchases</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => void onOpenRevenueCatPaywall()}
              disabled={busy !== null}
              style={({ pressed }) => [styles.tertiaryBtn, pressed && styles.pressed]}
            >
              {busy === "rc_ui" ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <Text style={styles.tertiaryText}>View full offer (RevenueCat)</Text>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  closeRow: {
    alignSelf: "flex-end",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  closeText: {
    ...typography.body,
    color: colors.accent,
    fontFamily: "SpaceMono_700Bold",
  },
  title: {
    ...typography.body,
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 28,
    color: colors.textPrimary,
  },
  price: {
    ...typography.body,
    fontFamily: "SpaceMono_700Bold",
    fontSize: 20,
    color: colors.accent,
  },
  lead: {
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  bullets: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  bullet: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  block: {
    marginTop: spacing.lg,
    gap: spacing.md,
    alignItems: "stretch",
  },
  center: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "center",
    gap: spacing.md,
  },
  hint: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  primaryBtnText: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 17,
    color: colors.pillActiveText,
  },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  secondaryBtnText: {
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
  },
  tertiaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tertiaryText: {
    ...typography.badge,
    fontSize: 13,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.65,
  },
});
