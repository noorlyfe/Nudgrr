import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, touchTarget, typography } from "../constants/theme";
import { billDigitsToAmount } from "../hooks/useTipCalculator";

type BillInputProps = {
  billDigits: string;
  onBillDigitsChange: (digits: string) => void;
};

function formatCentsDigits(digits: string): string {
  if (!digits) {
    return "";
  }
  const centsVal = parseInt(digits, 10);
  if (!Number.isFinite(centsVal)) {
    return "";
  }
  return (centsVal / 100).toFixed(2);
}

export function BillInput({ billDigits, onBillDigitsChange }: BillInputProps) {
  const [focused, setFocused] = useState(false);
  const displayValue = useMemo(() => formatCentsDigits(billDigits), [billDigits]);
  const previewAmount = useMemo(() => billDigitsToAmount(billDigits), [billDigits]);

  const handleChangeText = (text: string) => {
    const digits = text.replace(/\D/g, "");

    if (!digits) {
      onBillDigitsChange("");
      return;
    }

    if (digits.length < billDigits.length) {
      onBillDigitsChange(billDigits.slice(0, -1));
      return;
    }

    if (digits.length > billDigits.length) {
      if (billDigits.length > 0 && digits.startsWith(billDigits)) {
        const suffix = digits.slice(billDigits.length);
        onBillDigitsChange(`${billDigits}${suffix}`.slice(0, 12));
      } else {
        onBillDigitsChange(digits.slice(0, 12));
      }
      return;
    }

    if (digits !== billDigits) {
      onBillDigitsChange(digits.slice(0, 12));
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Bill amount</Text>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <Text style={styles.prefix}>$</Text>
        <TextInput
          value={displayValue}
          onChangeText={handleChangeText}
          placeholder="0.00"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          style={styles.input}
          accessibilityLabel="Bill amount"
          accessibilityValue={
            previewAmount === null ? { text: "Empty" } : { text: `$${previewAmount.toFixed(2)}` }
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.inputHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fieldFocused: {
    borderColor: colors.accent,
  },
  prefix: {
    ...typography.input,
    color: colors.textSecondary,
    marginRight: 4,
  },
  input: {
    flex: 1,
    ...typography.input,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
});
