import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";

import { fonts, radii, spacing, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { rtlRow } from "../lib/rtl";

const PILL_HEIGHT = 32;
const PILL_PAD_H = 10;

export type SplitMode = "even" | "less" | "more" | "custom";

type SplitModeSelectorProps = {
  mode: SplitMode;
  customPercent: string;
  onModeChange: (mode: SplitMode) => void;
  onCustomPercentChange: (value: string) => void;
};

export function SplitModeSelector({
  mode,
  customPercent,
  onModeChange,
  onCustomPercentChange,
}: SplitModeSelectorProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { t, isRTL } = useLocale();

  const options = useMemo(
    () => [
      { id: "even" as SplitMode, label: t("splitEvenly") },
      { id: "less" as SplitMode, label: t("iAteLess") },
      { id: "more" as SplitMode, label: t("iAteMore") },
      { id: "custom" as SplitMode, label: t("custom") },
    ],
    [t]
  );

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[styles.row, rtlRow(isRTL)]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Text style={styles.label}>{t("howToSplit")}</Text>
        {options.map((option) => {
          const active = option.id === mode;
          return (
            <Pressable
              key={option.id}
              onPress={() => onModeChange(option.id)}
              style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
            >
              <Text
                style={[styles.pillText, active && styles.pillTextActive]}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
        {mode === "custom" ? (
          <View style={[styles.inlineField, rtlRow(isRTL)]}>
            <Text style={styles.prefix}>%</Text>
            <TextInput
              value={customPercent}
              onChangeText={(text) => onCustomPercentChange(text.replace(/[^\d.]/g, ""))}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="100"
              placeholderTextColor={colors.textSecondary}
              selectionColor={colors.accent}
              cursorColor={colors.accent}
              style={styles.input}
              accessibilityLabel={t("customSplitPercent")}
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
      minHeight: PILL_HEIGHT,
      maxHeight: PILL_HEIGHT + 4,
    },
    scroll: {
      maxHeight: PILL_HEIGHT,
      flexGrow: 0,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingRight: spacing.md,
      minHeight: PILL_HEIGHT,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      letterSpacing: 0.2,
      color: colors.textSecondary,
      marginRight: 2,
      paddingHorizontal: 2,
    },
    pill: {
      height: PILL_HEIGHT,
      minHeight: PILL_HEIGHT,
      maxWidth: 120,
      paddingHorizontal: PILL_PAD_H,
      borderWidth: 1,
      borderRadius: radii.pill,
      justifyContent: "center",
      overflow: "hidden",
    },
    pillIdle: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    pillActive: {
      borderColor: colors.accent,
      backgroundColor: colors.pillActiveBg,
    },
    pillText: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 14,
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: colors.pillActiveText,
      fontFamily: fonts.bodySemiBold,
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
    prefix: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 4,
    },
    input: {
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
