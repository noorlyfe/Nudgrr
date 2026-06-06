import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { rtlRow } from "../lib/rtl";
import { safeRouterBack } from "../lib/safeRouterBack";

export const PRIVACY_POLICY_BODY = `Last updated: April 23, 2026

Nudgrr ("we", "us") is operated by Noorlyfe. This Privacy Policy explains how the Nudgrr mobile app handles information when you use the app.

We do not require an account to use the core features, and we do not directly identify users.

INFORMATION WE PROCESS
• Bill-splitting and receipt-style content you enter in the app is processed on your device to show results.
• Optional subscription features may be processed by the Apple App Store, Google Play, and RevenueCat, Inc. (our subscription provider), to verify purchases and entitlements. RevenueCat may process a pseudonymous app user identifier and purchase-related data as described in their policies.
• We use on-device or local storage (e.g. preferences, usage counters for product improvement) as implemented in the app.

We do not sell or share personal data for advertising or marketing purposes.

INTERNATIONAL USERS
The App is available globally. If you use the App, you understand that your information may be processed by third-party services in countries outside your own.

YOUR RIGHTS
Depending on your location, you may have rights to access, correct, or delete your personal data. We do not operate a remote database that stores a personal account or profile for you; some information may exist only on your device, which you can often control by deleting the app or clearing app data (where your device allows). We may not be able to act on all requests directly. For data processed by third parties, please refer to their respective privacy policies, or contact us at nudgrr@noorlyfe.com so we can help where we can.

SECURITY
We take reasonable measures to protect information handled within the App, but no method of transmission or storage is completely secure.

CHILDREN
Nudgrr is not intended for children under 13, and we do not knowingly collect personal information from children under 13.

CONTACT
Questions about this policy: nudgrr@noorlyfe.com

CHANGES
We may update this policy from time to time. The "Last updated" date will change when we do.`;

export default function PrivacyScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable onPress={() => safeRouterBack(router)} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator
      >
        <Text style={styles.body}>{PRIVACY_POLICY_BODY}</Text>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    minHeight: touchTarget.min,
  },
  back: { minWidth: 56, minHeight: 44, justifyContent: "center" },
  backText: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.accent },
  title: {
    ...typography.body,
    fontFamily: fonts.bodyBold,
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: { minWidth: 56 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  body: {
    ...typography.badge,
    color: colors.textPrimary,
  },
  pressed: { opacity: 0.86 },
  });
}
