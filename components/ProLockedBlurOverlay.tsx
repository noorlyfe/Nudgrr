import { ReactNode, useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";

type Props = {
  locked: boolean;
  unlockMessage: string;
  children: ReactNode;
  style?: object;
};

export function ProLockedBlurOverlay({ locked, unlockMessage, children, style }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { t } = useLocale();
  const { isDark } = useTheme();

  if (!locked) {
    return <>{children}</>;
  }

  const openPaywall = () => {
    router.push("/paywall");
  };

  return (
    <View style={[styles.wrap, style]}>
      <View pointerEvents="none">{children}</View>
      <View style={styles.overlay} pointerEvents="box-none">
        {Platform.OS !== "web" ? (
          <BlurView
            intensity={18}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={styles.dim} />
        <View style={styles.prompt} pointerEvents="auto">
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.unlockText}>{unlockMessage}</Text>
          <Pressable
            onPress={openPaywall}
            style={({ pressed }) => [styles.upgradeBtn, pressed && styles.upgradeBtnPressed]}
            accessibilityRole="button"
            accessibilityLabel={t("nudgrrUnlimited")}
          >
            <Text style={styles.upgradeBtnText}>{t("nudgrrUnlimited")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      overflow: "hidden",
      borderRadius: radii.lg,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
    },
    dim: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.42)",
    },
    prompt: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      maxWidth: 280,
    },
    lockIcon: {
      fontSize: 28,
      lineHeight: 32,
    },
    unlockText: {
      ...typography.badge,
      color: "#FFFFFF",
      textAlign: "center",
      lineHeight: 18,
    },
    upgradeBtn: {
      marginTop: spacing.xs,
      minHeight: touchTarget.min - 8,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    upgradeBtnPressed: {
      opacity: 0.9,
    },
    upgradeBtnText: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
  });
}
