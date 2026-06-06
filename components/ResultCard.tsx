import { useCallback, useEffect, useState, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { fonts, radii, spacing, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { round2 } from "../hooks/useTipCalculator";
import { formatNumber } from "../lib/i18n";
import { formatCurrency } from "../lib/currency";
import { rtlRow } from "../lib/rtl";

const spring = { damping: 18, stiffness: 220, mass: 0.35 };

type ResultCardProps = {
  hasBill: boolean;
  tipPerPerson: number;
  totalPerPerson: number;
  totalTip: number;
  people: number;
  tipPercent: number;
  currencyCode: string;
};

export function ResultCard({
  hasBill,
  tipPerPerson,
  totalPerPerson,
  totalTip,
  people,
  tipPercent,
  currencyCode,
}: ResultCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { t, locale, isRTL } = useLocale();
  const hasBillSV = useSharedValue(0);
  const tipSV = useSharedValue(0);
  const totalPerPersonSV = useSharedValue(0);
  const totalTipSV = useSharedValue(0);

  const [tipText, setTipText] = useState("…");
  const [totalPerPersonText, setTotalPerPersonText] = useState("…");
  const [totalTipText, setTotalTipText] = useState("…");

  const updateTipText = useCallback(
    (value: number) => {
      setTipText(formatCurrency(round2(value), currencyCode));
    },
    [currencyCode]
  );

  const updateTotalPerPersonText = useCallback(
    (value: number) => {
      setTotalPerPersonText(formatCurrency(round2(value), currencyCode));
    },
    [currencyCode]
  );

  const updateTotalTipText = useCallback(
    (value: number) => {
      setTotalTipText(formatCurrency(round2(value), currencyCode));
    },
    [currencyCode]
  );

  useEffect(() => {
    hasBillSV.value = hasBill ? 1 : 0;
    if (!hasBill) {
      tipSV.value = 0;
      totalPerPersonSV.value = 0;
      totalTipSV.value = 0;
      setTipText("…");
      setTotalPerPersonText("…");
      setTotalTipText("…");
      return;
    }

    tipSV.value = withSpring(tipPerPerson, spring);
    totalPerPersonSV.value = withSpring(totalPerPerson, spring);
    totalTipSV.value = withSpring(totalTip, spring);
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

  const metaLine =
    hasBill && tipPercent > 0.001 && totalTip > 0.001
      ? t("peopleAndTip", {
          people: formatNumber(people, locale),
          tip: formatNumber(Number(tipPercentLabel), locale),
        })
      : t("peopleOnly", {
          people: formatNumber(people, locale),
        });

  const showTipBreakdown = hasBill && (tipPercent > 0.001 || totalTip > 0.001);

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.heroBlock}>
        <Text style={styles.eyebrow}>{t("totalPerPersonLabel")}</Text>
        <Text style={styles.heroAmount}>{totalPerPersonText}</Text>
        <View style={styles.metaChip}>
          <Text style={styles.metaText}>{metaLine}</Text>
        </View>
      </View>

      {showTipBreakdown ? (
        <>
          <View style={styles.divider} />

          <View style={[styles.lineRow, rtlRow(isRTL)]}>
            <Text style={styles.lineLabel}>{t("tipPerPersonLabel")}</Text>
            <Text style={styles.lineValue}>{tipText}</Text>
          </View>

          <View style={[styles.lineRow, rtlRow(isRTL)]}>
            <Text style={styles.lineLabel}>{t("totalTipLabel")}</Text>
            <Text style={styles.lineValueMuted}>{totalTipText}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg + 4,
      paddingBottom: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOpacity: colors.cardShadowOpacity + 0.04,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
      overflow: "hidden",
      alignItems: "center",
    },
    accentBar: {
      position: "absolute",
      top: 0,
      left: spacing.xl,
      right: spacing.xl,
      height: 3,
      borderBottomLeftRadius: radii.pill,
      borderBottomRightRadius: radii.pill,
      backgroundColor: colors.accent,
    },
    glow: {
      position: "absolute",
      top: -40,
      right: -30,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.accentSoft,
    },
    heroBlock: {
      alignItems: "center",
      gap: spacing.xs,
      width: "100%",
      paddingTop: spacing.sm,
    },
    eyebrow: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      letterSpacing: 0.6,
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    heroAmount: {
      ...typography.resultPrimary,
      fontSize: 44,
      lineHeight: 48,
      letterSpacing: -1.6,
      color: colors.accent,
      textAlign: "center",
    },
    metaChip: {
      marginTop: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
    },
    metaText: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    divider: {
      width: "100%",
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
    lineRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      width: "100%",
      minHeight: 22,
    },
    lineLabel: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },
    lineValue: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 14,
      color: colors.textPrimary,
    },
    lineValueMuted: {
      fontFamily: fonts.body,
      fontSize: 13,
      color: colors.textSecondary,
    },
  });
}
