import { useMemo } from "react";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";

type ProGateProps = {
  locked: boolean;
  children: ReactNode;
  /** i18n key for explanatory copy under the subtitle (default: history detail). */
  messageKey?: string;
};

export function ProGate({ locked, children, messageKey = "historySavedReady" }: ProGateProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const router = useRouter();
  const { t } = useLocale();

  return (
    <View style={styles.wrap}>
      {children}
      {locked ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BlurView intensity={28} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.overlayTint]} pointerEvents="box-none" />
          <View style={styles.overlayInner} pointerEvents="box-none">
            <View style={styles.card}>
              <Text style={styles.title}>{t("nudgrrUnlimited")}</Text>
              <Text style={styles.subtitle}>{t("getTheFullExperience")}</Text>
              <Text style={styles.body}>{t(messageKey)}</Text>
              <Pressable
                onPress={() => router.push("/paywall")}
                style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
                accessibilityRole="button"
                accessibilityLabel={t("unlockSubscriptionA11y")}
              >
                <Text style={styles.ctaText}>{t("unlockNudgrr")}</Text>
              </Pressable>
              <Text style={styles.legal}>
                {Platform.OS === "ios" ? t("subscriptionBilledApple") : t("subscriptionBilledStore")}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
  wrap: {
    flex: 1,
  },
  overlayTint: {
    backgroundColor: isDark ? "rgba(26, 23, 16, 0.65)" : "rgba(235, 221, 200, 0.55)",
  },
  overlayInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  title: {
    ...typography.wordmark,
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...typography.label,
    color: colors.accent,
    textAlign: "center",
    marginTop: 2,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  cta: {
    width: "100%",
    minHeight: touchTarget.min,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  ctaPressed: {
    opacity: 0.92,
  },
  ctaText: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    color: colors.pillActiveText,
  },
  legal: {
    ...typography.badge,
    color: colors.textSecondary,
    textAlign: "center",
    opacity: 0.85,
    marginTop: spacing.md,
  },
  });
}
