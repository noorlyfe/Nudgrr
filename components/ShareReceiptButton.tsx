import { StyleSheet, Text } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useEffect, useMemo } from "react";

import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";

const pulseSpring = { damping: 12, stiffness: 140, mass: 0.4 };

type ShareReceiptButtonProps = {
  ready: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function ShareReceiptButton({ ready, onPress, disabled }: ShareReceiptButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { t } = useLocale();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (ready && !disabled) {
      pulse.value = withRepeat(
        withSequence(
          withSpring(1.03, pulseSpring),
          withSpring(1, pulseSpring)
        ),
        -1,
        false
      );
    } else {
      pulse.value = withSpring(1, pulseSpring);
    }
    return () => {
      pulse.value = 1;
    };
  }, [disabled, pulse, ready]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, styles.btnWrap]}>
      <Pressable
        onPress={onPress}
        disabled={disabled || !ready}
        style={({ pressed }) => [
          styles.btn,
          (!ready || disabled) && styles.btnDisabled,
          pressed && ready && !disabled && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("shareReceiptA11y")}
        accessibilityState={{ disabled: !ready || Boolean(disabled) }}
      >
        <Text style={styles.btnText}>{t("shareReceipt")}</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  btnWrap: {
    width: "100%",
  },
  btn: {
    minHeight: touchTarget.min + 4,
    width: "100%",
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    shadowColor: colors.shadow,
    shadowOpacity: colors.cardShadowOpacity + 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnPressed: {
    opacity: 0.92,
  },
  btnText: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.pillActiveText,
  },
  });
}
