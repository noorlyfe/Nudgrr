import { useState, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { formatCurrency } from "../lib/currency";
import { rtlRow } from "../lib/rtl";

type BillInputProps = {
  billDigits: string;
  onBillDigitsChange: (digits: string) => void;
  currencyCode: string;
  fractionDigits: number;
  symbol: string;
  variant?: "default" | "hero";
};

export function BillInput({
  billDigits,
  onBillDigitsChange,
  currencyCode,
  fractionDigits,
  symbol,
  variant = "default",
}: BillInputProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors, variant), [colors, variant]);

  const { t, isRTL } = useLocale();
  const [focused, setFocused] = useState(false);
  const placeholder = fractionDigits === 0 ? "0" : "0.00";
  const isHero = variant === "hero";

  const handleChangeText = (text: string) => {
    const normalized = text.replace(",", ".");
    const cleaned = normalized.replace(/[^0-9.]/g, "");
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) return;
    const parts = cleaned.split(".");
    if (parts.length === 2 && parts[1].length > fractionDigits) return;
    onBillDigitsChange(cleaned);
  };

  return (
    <View style={styles.wrap}>
      {!isHero ? <Text style={styles.label}>{t("billAmount")}</Text> : null}
      <View style={[styles.field, rtlRow(isRTL), focused && styles.fieldFocused]}>
        <Text style={styles.prefix}>{symbol}</Text>
        <TextInput
          value={billDigits}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          autoCorrect={false}
          autoComplete="off"
          inputMode="decimal"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          style={[styles.input, isHero && styles.inputHero]}
          accessibilityLabel={t("billAmount")}
          accessibilityValue={
            (() => {
              const n = parseFloat(billDigits);
              return billDigits.trim() === "" || Number.isNaN(n)
                ? { text: t("empty") }
                : { text: formatCurrency(n, currencyCode) };
            })()
          }
        />
      </View>
    </View>
  );
}

function createStyles(colors: AppColors, variant: "default" | "hero") {
  const isHero = variant === "hero";

  return StyleSheet.create({
    wrap: {
      gap: isHero ? spacing.xs : spacing.sm,
      alignItems: isHero ? "center" : "stretch",
    },
    label: {
      ...typography.label,
      color: colors.textSecondary,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: isHero ? "center" : "flex-start",
      minHeight: isHero ? 72 : touchTarget.inputHeight,
      width: isHero ? "100%" : undefined,
      paddingHorizontal: isHero ? spacing.md : spacing.lg,
      borderRadius: radii.lg,
      borderWidth: isHero ? StyleSheet.hairlineWidth : 1,
      borderColor: colors.border,
      backgroundColor: isHero ? colors.accentSoft : colors.surface,
      shadowColor: isHero ? "transparent" : colors.shadow,
      shadowOpacity: isHero ? 0 : colors.cardShadowOpacity,
      shadowRadius: isHero ? 0 : 8,
      shadowOffset: isHero ? undefined : { width: 0, height: 2 },
      elevation: isHero ? 0 : 2,
    },
    fieldFocused: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      borderRadius: radii.lg,
    },
    prefix: {
      ...typography.input,
      fontSize: isHero ? 28 : typography.input.fontSize,
      color: isHero ? colors.accent : colors.textSecondary,
      marginRight: 6,
    },
    input: {
      flex: isHero ? 0 : 1,
      ...typography.input,
      color: colors.textPrimary,
      paddingVertical: spacing.sm,
    },
    inputHero: {
      fontSize: 36,
      lineHeight: 42,
      letterSpacing: -1.2,
      textAlign: "center",
      minWidth: 120,
    },
  });
}
