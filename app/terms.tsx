import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing, typography } from "../constants/theme";
import { safeRouterBack } from "../lib/safeRouterBack";

const BODY = `Last updated: April 23, 2026

These Terms of Use ("Terms") govern your use of the Nudgrr mobile app ("App") provided by Noorlyfe. By using the App, you agree to these Terms.

ELIGIBILITY
You must be able to form a binding contract in your jurisdiction to use the App. If you use the App, you represent that you meet that requirement. The App is not intended for users under the age required to form a binding contract in their jurisdiction.

THE APP
Nudgrr helps estimate bill splits, tips, and prepare casual text you may copy or share. The App is provided for convenience and general information. It is not tax, legal, or financial advice. You are solely responsible for verifying all calculations and shared content before relying on them.

SUBSCRIPTIONS & PURCHASES
If you purchase a subscription, charges and renewal terms are set by the platform (Apple or Google) and are subject to their terms. Subscriptions, refunds, and billing questions are managed through the platform you used to purchase. Features included with a purchase are as described in the App at the time of purchase and may change.

ACCEPTABLE USE
Do not misuse the App, attempt to break its security, or use it in a way that violates law or the rights of others. We may suspend or terminate your access to the App at any time, where permitted by law.

THIRD-PARTY SERVICES
Nudgrr does not require an account for core features. Information you enter and app settings (including split history, preferences, and on-device product counters) may be stored locally on your device. Subscription and purchase data are processed by Apple, Google, and our subscription provider RevenueCat, as further described in the Privacy Policy. Those services operate under their own terms and privacy policies. We do not sell or share personal data for advertising or marketing purposes.

DISCLAIMER
THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, TO THE FULLEST EXTENT PERMITTED BY LAW.

LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, NOORLYFE AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE APP.

PLATFORM DISCLAIMER
Apple Inc. and Google LLC are not responsible for the App and have no obligation to provide maintenance or support.

GOVERNING LAW
These Terms are governed by the laws of Denmark, without regard to conflict of law principles. Where you are a consumer in the EU or another jurisdiction with mandatory consumer protections, nothing in these Terms limits your statutory rights.

CHANGES
We may update these Terms. Continued use after changes become effective constitutes acceptance, where permitted by law.

CONTACT
nudgrr@noorlyfe.com`;

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => safeRouterBack(router)} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Terms of Use</Text>
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
        <Text style={styles.body}>{BODY}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  back: { minWidth: 56, minHeight: 44, justifyContent: "center" },
  backText: { ...typography.body, color: colors.accent, fontFamily: "SpaceMono_700Bold" },
  title: { ...typography.body, fontFamily: "SpaceMono_700Bold", fontSize: 16, color: colors.textPrimary, flex: 1, textAlign: "center" },
  headerSpacer: { minWidth: 56 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  body: {
    ...typography.badge,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  pressed: { opacity: 0.86 },
});
