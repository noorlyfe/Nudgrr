import { StyleSheet, Text } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useEffect } from "react";

import { colors, radii, spacing, touchTarget } from "../constants/theme";

const pulseSpring = { damping: 12, stiffness: 140, mass: 0.4 };

type ShareReceiptButtonProps = {
  ready: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function ShareReceiptButton({ ready, onPress, disabled }: ShareReceiptButtonProps) {
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
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled || !ready}
        style={({ pressed }) => [
          styles.btn,
          (!ready || disabled) && styles.btnDisabled,
          pressed && ready && !disabled && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Share receipt"
        accessibilityState={{ disabled: !ready || Boolean(disabled) }}
      >
        <Text style={styles.btnText}>📤 Share Receipt</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: touchTarget.min + 6,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnPressed: {
    opacity: 0.92,
  },
  btnText: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 17,
    color: colors.pillActiveText,
  },
});
