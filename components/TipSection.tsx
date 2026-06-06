import { useCallback, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { fonts, radii, spacing, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { getLocaleTipConfig } from "../lib/localeTipDefaults";
import { rtlRow } from "../lib/rtl";

const springConfig = { damping: 18, stiffness: 320, mass: 0.28 };
const PILL_HEIGHT = 32;
const PILL_PAD_H = 12;

type TipSectionProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedPercent: number;
  isCustom: boolean;
  customDraft: string;
  onSelectPreset: (value: number) => void;
  onSelectCustom: () => void;
  onCustomDraftChange: (value: string) => void;
};

function TipPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.88, springConfig);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig);
  }, [scale]);

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.View
        style={[styles.pill, active ? styles.pillActive : styles.pillInactive, animatedStyle]}
      >
        <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

export function TipSection({
  enabled,
  onEnabledChange,
  selectedPercent,
  isCustom,
  customDraft,
  onSelectPreset,
  onSelectCustom,
  onCustomDraftChange,
}: TipSectionProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, locale, isRTL } = useLocale();
  const presets = useMemo(() => getLocaleTipConfig(locale).presets, [locale]);

  const toggleTip = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEnabledChange(!enabled);
  }, [enabled, onEnabledChange]);

  if (!enabled) {
    return (
      <Pressable
        onPress={toggleTip}
        style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={t("addTip")}
      >
        <Text style={styles.addBtnText}>{t("addTip")}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.headerRow, rtlRow(isRTL)]}>
        <Text style={styles.headerLabel}>{t("tip")}</Text>
        <Pressable
          onPress={toggleTip}
          hitSlop={8}
          style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t("removeTip")}
        >
          <Text style={styles.removeBtnText}>{t("removeTip")}</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, rtlRow(isRTL)]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {presets.map((value) => (
          <TipPill
            key={value}
            label={`${value}%`}
            active={!isCustom && selectedPercent === value}
            onPress={() => onSelectPreset(value)}
          />
        ))}
        <TipPill label={t("custom")} active={isCustom} onPress={onSelectCustom} />
        {isCustom ? (
          <View style={[styles.inlineField, rtlRow(isRTL)]}>
            <Text style={styles.inlinePrefix}>%</Text>
            <TextInput
              value={customDraft}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^\d.]/g, "");
                const parts = cleaned.split(".");
                const normalized =
                  parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
                onCustomDraftChange(normalized);
              }}
              placeholder={String(getLocaleTipConfig(locale).defaultPercent || 10)}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              inputMode="decimal"
              selectionColor={colors.accent}
              cursorColor={colors.accent}
              style={styles.inlineInput}
              accessibilityLabel={t("customTipPercent")}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    addBtn: {
      alignSelf: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    addBtnPressed: {
      opacity: 0.88,
      backgroundColor: colors.accentSoft,
    },
    addBtnText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    headerLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    removeBtn: {
      paddingVertical: 4,
      paddingHorizontal: spacing.xs,
    },
    removeBtnPressed: {
      opacity: 0.7,
    },
    removeBtnText: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.accent,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingRight: spacing.sm,
      minHeight: PILL_HEIGHT,
    },
    pill: {
      height: PILL_HEIGHT,
      minHeight: PILL_HEIGHT,
      paddingHorizontal: PILL_PAD_H,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    pillActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
    },
    pillInactive: {
      backgroundColor: colors.pillInactiveBg,
    },
    pillText: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 14,
    },
    pillTextActive: {
      color: colors.pillActiveText,
      fontFamily: fonts.bodySemiBold,
    },
    pillTextInactive: {
      color: colors.textSecondary,
    },
    inlineField: {
      flexDirection: "row",
      alignItems: "center",
      height: PILL_HEIGHT,
      minWidth: 72,
      maxWidth: 96,
      paddingHorizontal: PILL_PAD_H,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    inlinePrefix: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 4,
    },
    inlineInput: {
      flex: 1,
      minWidth: 40,
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.textPrimary,
      paddingVertical: 0,
      height: PILL_HEIGHT,
    },
  });
}
