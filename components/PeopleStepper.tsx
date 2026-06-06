import { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { rtlRow } from "../lib/rtl";
import { clampPeople } from "../hooks/useTipCalculator";

type PeopleStepperProps = {
  people: number;
  onChange: (next: number) => void;
  variant?: "default" | "inline";
};

export function PeopleStepper({ people, onChange, variant = "default" }: PeopleStepperProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors, variant), [colors, variant]);

  const { t, isRTL } = useLocale();
  const safePeople = clampPeople(people);
  const isInline = variant === "inline";

  const bump = useCallback(
    (delta: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(clampPeople(safePeople + delta));
    },
    [onChange, safePeople]
  );

  const controls = (
    <View style={[styles.row, rtlRow(isRTL), isInline && styles.rowInline]}>
      <Pressable
        onPress={() => bump(-1)}
        disabled={safePeople <= 1}
        style={({ pressed }) => [
          styles.button,
          safePeople <= 1 && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("decreasePeople")}
      >
        <Text style={styles.buttonText}>−</Text>
      </Pressable>
      <View style={styles.valueWrap}>
        {isInline ? (
          <Text style={styles.valueInline}>{safePeople}</Text>
        ) : (
          <>
            <Text style={styles.bracket}>[</Text>
            <Text style={styles.value}>{safePeople}</Text>
            <Text style={styles.bracket}>]</Text>
          </>
        )}
      </View>
      <Pressable
        onPress={() => bump(1)}
        disabled={safePeople >= 20}
        style={({ pressed }) => [
          styles.button,
          safePeople >= 20 && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("increasePeople")}
      >
        <Text style={styles.buttonText}>+</Text>
      </Pressable>
    </View>
  );

  if (isInline) {
    return (
      <View style={[styles.inlineWrap, rtlRow(isRTL)]}>
        <Text style={styles.inlineLabel}>{t("people")}</Text>
        {controls}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t("people")}</Text>
      {controls}
    </View>
  );
}

function createStyles(colors: AppColors, variant: "default" | "inline") {
  const isInline = variant === "inline";

  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    inlineWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    inlineLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    rowInline: {
      gap: spacing.sm,
    },
    button: {
      minWidth: isInline ? touchTarget.min : touchTarget.min + 8,
      minHeight: isInline ? touchTarget.min - 4 : touchTarget.min + 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: {
      opacity: 0.35,
    },
    buttonPressed: {
      transform: [{ scale: 0.96 }],
      backgroundColor: colors.accentSoft,
    },
    buttonText: {
      ...typography.stepper,
      fontSize: isInline ? 18 : typography.stepper.fontSize,
      color: colors.textPrimary,
      marginTop: -2,
    },
    valueWrap: {
      minWidth: isInline ? 40 : 112,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: isInline ? 0 : spacing.sm,
      gap: 2,
    },
    bracket: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: 2,
    },
    value: {
      ...typography.stepper,
      color: colors.accent,
    },
    valueInline: {
      fontFamily: fonts.bodyBold,
      fontSize: 20,
      letterSpacing: -0.4,
      color: colors.accent,
      minWidth: 28,
      textAlign: "center",
    },
  });
}
