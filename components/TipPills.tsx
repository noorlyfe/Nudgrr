import { useCallback, useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { fonts, radii, spacing, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { billDigitsToAmount, TIP_PRESETS, type TipEntryMode } from "../hooks/useTipCalculator";
import { formatCurrency, formatMinorDigitsForInput } from "../lib/currency";
import { rtlRow } from "../lib/rtl";

const springConfig = { damping: 18, stiffness: 320, mass: 0.28 };
const PILL_HEIGHT = 32;
const PILL_PAD_H = 10;

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
  currencyCode: string;
  fractionDigits: number;
  currencySymbol: string;
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
      delayHoverIn={0}
      delayLongPress={500}
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

function ModePill({
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

  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.modePill,
        active ? styles.modePillActive : styles.modePillIdle,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.modePillText, active ? styles.modePillTextActive : styles.modePillTextIdle]}>
        {label}
      </Text>
    </Pressable>
  );
}

function InlineMoneyField({
  digits,
  onDigitsChange,
  accessibilityLabel,
  currencyCode,
  fractionDigits,
  currencySymbol,
  isRTL,
}: {
  digits: string;
  onDigitsChange: (digits: string) => void;
  accessibilityLabel: string;
  currencyCode: string;
  fractionDigits: number;
  currencySymbol: string;
  isRTL: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLocale();
  const displayValue = formatMinorDigitsForInput(digits, fractionDigits);
  const previewAmount = billDigitsToAmount(digits, fractionDigits);
  const placeholder = fractionDigits === 0 ? "0" : `0.${"0".repeat(fractionDigits)}`;

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
    <View style={[styles.inlineField, rtlRow(isRTL)]}>
      <Text style={styles.inlinePrefix}>{currencySymbol}</Text>
      <TextInput
        value={displayValue}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType="decimal-pad"
        inputMode="decimal"
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        style={styles.inlineInput}
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={
          previewAmount === null
            ? { text: t("empty") }
            : { text: formatCurrency(previewAmount, currencyCode) }
        }
      />
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
  currencyCode,
  fractionDigits,
  currencySymbol,
}: TipPillsProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { t, isRTL } = useLocale();

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={[styles.row, rtlRow(isRTL)]}
        keyboardShouldPersistTaps="handled"
        directionalLockEnabled
        nestedScrollEnabled
      >
        <Text style={styles.tipTag}>{t("tip")}</Text>

        <ModePill label={t("percent")} active={tipMode === "percent"} onPress={() => onTipModeChange("percent")} />
        <ModePill label={t("total")} active={tipMode === "total"} onPress={() => onTipModeChange("total")} />
        <ModePill
          label={t("perPerson")}
          active={tipMode === "per_person"}
          onPress={() => onTipModeChange("per_person")}
        />

        <View style={styles.divider} />

        {tipMode === "percent" ? (
          <>
            {TIP_PRESETS.map((value) => (
              <TipPill
                key={value}
                label={`${value}%`}
                active={!isCustom && selectedPreset === value}
                onPress={() => onSelectPreset(value)}
              />
            ))}
            <TipPill label={t("custom")} active={isCustom} onPress={onSelectCustom} />
            {isCustom ? (
              <View style={[styles.inlineField, rtlRow(isRTL)]}>
                <Text style={styles.inlinePrefix}>%</Text>
                <TextInput
                  value={customTipDraft}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^\d.]/g, "");
                    const parts = cleaned.split(".");
                    const normalized =
                      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;
                    onCustomDraftChange(normalized);
                  }}
                  placeholder="18"
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
          </>
        ) : null}

        {tipMode === "total" ? (
          <InlineMoneyField
            digits={totalTipDigits}
            onDigitsChange={onTotalTipDigitsChange}
            accessibilityLabel={t("totalTipGroupA11y")}
            currencyCode={currencyCode}
            fractionDigits={fractionDigits}
            currencySymbol={currencySymbol}
            isRTL={isRTL}
          />
        ) : null}

        {tipMode === "per_person" ? (
          <InlineMoneyField
            digits={perPersonTipDigits}
            onDigitsChange={onPerPersonTipDigitsChange}
            accessibilityLabel={t("tipPerPersonA11y")}
            currencyCode={currencyCode}
            fractionDigits={fractionDigits}
            currencySymbol={currencySymbol}
            isRTL={isRTL}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      minHeight: 48,
      maxHeight: 56,
      justifyContent: "center",
      paddingVertical: 8,
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
    tipTag: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 11,
      letterSpacing: 0.2,
      color: colors.textSecondary,
      marginRight: 2,
      paddingHorizontal: 2,
      alignSelf: "center",
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      height: 20,
      backgroundColor: colors.border,
      marginHorizontal: 2,
      alignSelf: "center",
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
    modePill: {
      height: PILL_HEIGHT,
      minHeight: PILL_HEIGHT,
      paddingHorizontal: PILL_PAD_H,
      borderRadius: radii.pill,
      borderWidth: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    modePillActive: {
      backgroundColor: colors.pillActiveBg,
      borderColor: colors.pillActiveBg,
    },
    modePillIdle: {
      backgroundColor: "transparent",
      borderColor: colors.border,
    },
    modePillText: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 14,
    },
    modePillTextActive: {
      color: colors.pillActiveText,
      fontFamily: fonts.bodySemiBold,
    },
    modePillTextIdle: {
      color: colors.textSecondary,
    },
    pressed: {
      opacity: 0.88,
    },
    inlineField: {
      flexDirection: "row",
      alignItems: "center",
      height: PILL_HEIGHT,
      minWidth: 88,
      maxWidth: 120,
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
      minWidth: 48,
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.textPrimary,
      paddingVertical: 0,
      paddingHorizontal: 0,
      height: PILL_HEIGHT,
    },
  });
}
