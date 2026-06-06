import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { rtlRow } from "../lib/rtl";

const TAB_META: Record<string, { labelKey: "split" | "waiting" | "peopleTab" | "theProject"; icon: string }> = {
  index: { labelKey: "split", icon: "÷" },
  waiting: { labelKey: "waiting", icon: "⏳" },
  people: { labelKey: "peopleTab", icon: "👥" },
  projects: { labelKey: "theProject", icon: "📋" },
};

export function NudgrrTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLocale();

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, rtlRow(isRTL)]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? { labelKey: "split" as const, icon: "•" };
          const label = t(meta.labelKey);

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                focused && styles.tabFocused,
                pressed && styles.tabPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
                <Text style={[styles.icon, focused && styles.iconFocused]}>{meta.icon}</Text>
              </View>
              <Text
                style={[styles.label, focused && styles.labelFocused]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {label}
              </Text>
              {focused ? <View style={styles.activeDot} /> : <View style={styles.activeDotSpacer} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const barShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.35 : colors.cardShadowOpacity + 0.06,
      shadowRadius: 18,
    },
    android: {
      elevation: 10,
    },
    default: {},
  });

  return StyleSheet.create({
    wrap: {
      backgroundColor: "transparent",
      paddingTop: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    bar: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: spacing.xs,
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.9)",
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      ...barShadow,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: touchTarget.min,
      borderRadius: radii.lg,
      gap: 3,
      paddingVertical: spacing.xs,
      paddingHorizontal: 2,
    },
    tabFocused: {
      backgroundColor: colors.accentSoft,
    },
    tabPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.97 }],
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: radii.pill,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    iconWrapFocused: {
      backgroundColor: isDark ? "rgba(255, 201, 64, 0.28)" : colors.pillActiveBg,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "rgba(255, 201, 64, 0.45)" : "transparent",
    },
    icon: {
      fontSize: 17,
      lineHeight: 20,
      color: colors.textSecondary,
      opacity: 0.72,
    },
    iconFocused: {
      opacity: 1,
      color: isDark ? colors.textPrimary : colors.pillActiveText,
      fontSize: 18,
    },
    label: {
      ...typography.label,
      fontSize: 10,
      letterSpacing: 0.15,
      color: colors.textSecondary,
      textAlign: "center",
      opacity: 0.85,
    },
    labelFocused: {
      color: colors.textPrimary,
      fontFamily: fonts.bodySemiBold,
      opacity: 1,
      fontSize: 10.5,
    },
    activeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.accent,
      marginTop: 1,
    },
    activeDotSpacer: {
      width: 4,
      height: 4,
      marginTop: 1,
      opacity: 0,
    },
  });
}
