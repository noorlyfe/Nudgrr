import { useCallback, useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors, radii, spacing, typography } from "../constants/theme";
import { formatUsd, round2 } from "../hooks/useTipCalculator";

const spring = { damping: 18, stiffness: 220, mass: 0.35 };

type ResultCardProps = {
  hasBill: boolean;
  tipPerPerson: number;
  totalPerPerson: number;
  totalTip: number;
  people: number;
  tipPercent: number;
  splitLabel?: string;
  splitControls?: ReactNode;
};

export function ResultCard({
  hasBill,
  tipPerPerson,
  totalPerPerson,
  totalTip,
  people,
  tipPercent,
  splitLabel = "Split evenly",
  splitControls,
}: ResultCardProps) {
  const hasBillSV = useSharedValue(0);
  const tipSV = useSharedValue(0);
  const totalPerPersonSV = useSharedValue(0);
  const totalTipSV = useSharedValue(0);

  const [tipText, setTipText] = useState("—");
  const [totalPerPersonText, setTotalPerPersonText] = useState("—");
  const [totalTipText, setTotalTipText] = useState("—");

  const updateTipText = useCallback((value: number) => {
    setTipText(formatUsd(round2(value)));
  }, []);

  const updateTotalPerPersonText = useCallback((value: number) => {
    setTotalPerPersonText(formatUsd(round2(value)));
  }, []);

  const updateTotalTipText = useCallback((value: number) => {
    setTotalTipText(formatUsd(round2(value)));
  }, []);

  useEffect(() => {
    hasBillSV.value = hasBill ? 1 : 0;
    if (!hasBill) {
      tipSV.value = 0;
      totalPerPersonSV.value = 0;
      totalTipSV.value = 0;
      setTipText("—");
      setTotalPerPersonText("—");
      setTotalTipText("—");
      return;
    }

    tipSV.value = withSpring(tipPerPerson, spring);
    totalPerPersonSV.value = withSpring(totalPerPerson, spring);
    totalTipSV.value = withSpring(totalTip, spring);
    // Shared values are stable refs; we only want to resync when bill/totals change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBill, tipPerPerson, totalPerPerson, totalTip]);

  useAnimatedReaction(() => tipSV.value, (value) => {
    if (hasBillSV.value === 0) {
      return;
    }
    runOnJS(updateTipText)(value);
  });

  useAnimatedReaction(() => totalPerPersonSV.value, (value) => {
    if (hasBillSV.value === 0) {
      return;
    }
    runOnJS(updateTotalPerPersonText)(value);
  });

  useAnimatedReaction(() => totalTipSV.value, (value) => {
    if (hasBillSV.value === 0) {
      return;
    }
    runOnJS(updateTotalTipText)(value);
  });

  const tipPercentLabel =
    Math.abs(tipPercent - Math.round(tipPercent)) < 0.001
      ? `${Math.round(tipPercent)}`
      : `${round2(tipPercent)}`;

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeStrong}>{splitLabel}</Text>
        <Text style={styles.badgeText}>
          {people} people · {tipPercentLabel}% tip
        </Text>
      </View>
      {splitControls ? <View style={styles.controlsWrap}>{splitControls}</View> : null}

      <View style={styles.block}>
        <Text style={styles.caption}>Tip per person</Text>
        <Text style={styles.primary}>{tipText}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.block}>
        <Text style={styles.caption}>Total per person</Text>
        <Text style={styles.secondary}>{totalPerPersonText}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.block}>
        <Text style={styles.caption}>Total tip</Text>
        <Text style={styles.tertiary}>{totalTipText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
    gap: spacing.md,
  },
  badge: {
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  badgeStrong: {
    ...typography.label,
    color: colors.textPrimary,
    letterSpacing: 1.6,
  },
  badgeText: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  block: {
    gap: spacing.xs,
  },
  controlsWrap: {
    marginTop: -2,
  },
  caption: {
    ...typography.label,
    color: colors.textSecondary,
  },
  primary: {
    ...typography.resultPrimary,
    color: colors.accent,
  },
  secondary: {
    ...typography.resultSecondary,
    color: colors.textPrimary,
  },
  tertiary: {
    ...typography.resultTertiary,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
