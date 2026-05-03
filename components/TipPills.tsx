import { useCallback } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { colors, radii, spacing, touchTarget, typography } from "../constants/theme";
import { billDigitsToAmount, TIP_PRESETS, type TipEntryMode } from "../hooks/useTipCalculator";

const springConfig = { damping: 18, stiffness: 320, mass: 0.28 };

type TipPillsProps = {
  tipMode: TipEntryMode;
  onTipModeChange: (mode: TipEntryMode) => void;
  totalTipDigits: string;
  onTotalTipDigitsChange: (digits: string) => void;
  perPersonTipDigits: string;
  onPerPersonTipDigitsChange: (digits: string) => void;
  selectedPreset: number | null;
  isCustom: boolean;
  customTipDraft: string;
  onSelectPreset: (value: number) => void;
  onSelectCustom: () => void;
  onCustomDraftChange: (value: string) => void;
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

function TipPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
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
      delayHoverIn={0}
      delayLongPress={500}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Animated.View
        style={[
          styles.pill,
          active ? styles.pillActive : styles.pillInactive,
          animatedStyle,
        ]}
      >
        <Text style={[styles.pillText, active ? styles.pillTextActive : styles.pillTextInactive]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function ModePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.modePill, active ? styles.modePillActive : styles.modePillIdle, pressed && { opacity: 0.88 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.modePillText, active ? styles.modePillTextActive : styles.modePillTextIdle]}>{label}</Text>
    </Pressable>
  );
}

function CurrencyDigitsField({
  label,
  digits,
  onDigitsChange,
  accessibilityLabel,
}: {
  label: string;
  digits: string;
  onDigitsChange: (digits: string) => void;
  accessibilityLabel: string;
}) {
  const displayValue = formatCentsDigits(digits);
  const previewAmount = billDigitsToAmount(digits);

  const handleChangeText = (text: string) => {
    const next = text.replace(/\D/g, "");
    if (!next) {
      onDigitsChange("");
      return;
    }
    if (next.length < digits.length) {
      onDigitsChange(digits.slice(0, -1));
      return;
    }
    if (next.length > digits.length) {
      if (digits.length > 0 && next.startsWith(digits)) {
        const suffix = next.slice(digits.length);
        onDigitsChange(`${digits}${suffix}`.slice(0, 12));
      } else {
        onDigitsChange(next.slice(0, 12));
      }
      return;
    }
    if (next !== digits) {
      onDigitsChange(next.slice(0, 12));
    }
  };

  return (
    <View style={styles.moneyWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.customField}>
        <Text style={styles.customPrefix}>$</Text>
        <TextInput
          value={displayValue}
          onChangeText={handleChangeText}
          placeholder="0.00"
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          inputMode="decimal"
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          style={styles.moneyInput}
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={
            previewAmount === null ? { text: "Empty" } : { text: `$${previewAmount.toFixed(2)}` }
          }
        />
      </View>
    </View>
  );
}

export function TipPills({
  tipMode,
  onTipModeChange,
  totalTipDigits,
  onTotalTipDigitsChange,
  perPersonTipDigits,
  onPerPersonTipDigitsChange,
  selectedPreset,
  isCustom,
  customTipDraft,
  onSelectPreset,
  onSelectCustom,
  onCustomDraftChange,
}: TipPillsProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Tip</Text>
      <View style={styles.modeRow}>
        <ModePill label="Percent" active={tipMode === "percent"} onPress={() => onTipModeChange("percent")} />
        <ModePill label="Total" active={tipMode === "total"} onPress={() => onTipModeChange("total")} />
        <ModePill label="Per person" active={tipMode === "per_person"} onPress={() => onTipModeChange("per_person")} />
      </View>
      {tipMode === "percent" ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            keyboardShouldPersistTaps="handled"
            directionalLockEnabled
            nestedScrollEnabled
          >
            {TIP_PRESETS.map((value) => (
              <TipPill
                key={value}
                label={`${value}%`}
                active={!isCustom && selectedPreset === value}
                onPress={() => onSelectPreset(value)}
              />
            ))}
            <TipPill label="Custom" active={isCustom} onPress={onSelectCustom} />
          </ScrollView>
          {isCustom ? (
            <View style={styles.customField}>
              <Text style={styles.customPrefix}>%</Text>
              <TextInput
                value={customTipDraft}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^\d.]/g, "");
                  onCustomDraftChange(cleaned);
                }}
                placeholder="18"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                inputMode="decimal"
                selectionColor={colors.accent}
                cursorColor={colors.accent}
                style={styles.customInput}
                accessibilityLabel="Custom tip percent"
              />
            </View>
          ) : null}
        </>
      ) : null}
      {tipMode === "total" ? (
        <CurrencyDigitsField
          label="Total tip (whole group)"
          digits={totalTipDigits}
          onDigitsChange={onTotalTipDigitsChange}
          accessibilityLabel="Total tip in dollars for the group"
        />
      ) : null}
      {tipMode === "per_person" ? (
        <CurrencyDigitsField
          label="Tip per person"
          digits={perPersonTipDigits}
          onDigitsChange={onPerPersonTipDigitsChange}
          accessibilityLabel="Tip per person in dollars"
        />
      ) : null}
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
  row: {
    gap: spacing.sm,
    paddingVertical: 2,
    paddingRight: spacing.lg,
  },
  pill: {
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.md,
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
    ...typography.body,
  },
  pillTextActive: {
    color: colors.pillActiveText,
    fontFamily: "SpaceMono_700Bold",
  },
  pillTextInactive: {
    color: colors.pillInactiveText,
  },
  customField: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.inputHeight,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  customPrefix: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: 6,
  },
  customInput: {
    flex: 1,
    ...typography.input,
    fontSize: 22,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  modePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  modePillActive: {
    backgroundColor: colors.pillActiveBg,
    borderColor: colors.pillActiveBg,
  },
  modePillIdle: {
    backgroundColor: colors.pillInactiveBg,
    borderColor: colors.border,
  },
  modePillText: {
    ...typography.badge,
    fontSize: 12,
  },
  modePillTextActive: {
    color: colors.pillActiveText,
    fontFamily: "SpaceMono_700Bold",
  },
  modePillTextIdle: {
    color: colors.pillInactiveText,
  },
  moneyWrap: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  moneyInput: {
    flex: 1,
    ...typography.input,
    fontSize: 22,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
});
