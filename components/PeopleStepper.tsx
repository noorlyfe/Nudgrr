import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { colors, radii, spacing, touchTarget, typography } from "../constants/theme";
import { clampPeople } from "../hooks/useTipCalculator";

type PeopleStepperProps = {
  people: number;
  onChange: (next: number) => void;
};

export function PeopleStepper({ people, onChange }: PeopleStepperProps) {
  const safePeople = clampPeople(people);

  const bump = useCallback(
    (delta: number) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(clampPeople(safePeople + delta));
    },
    [onChange, safePeople]
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>People</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => bump(-1)}
          disabled={safePeople <= 1}
          style={({ pressed }) => [
            styles.button,
            safePeople <= 1 && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Decrease people"
        >
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <View style={styles.valueWrap}>
          <Text style={styles.bracket}>[</Text>
          <Text style={styles.value}>{safePeople}</Text>
          <Text style={styles.bracket}>]</Text>
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
          accessibilityLabel="Increase people"
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  button: {
    minWidth: touchTarget.min + 8,
    minHeight: touchTarget.min + 8,
    borderRadius: radii.md,
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
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 26,
    color: colors.textPrimary,
    marginTop: -2,
  },
  valueWrap: {
    minWidth: 112,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    gap: 2,
  },
  bracket: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 20,
    color: colors.textSecondary,
    marginTop: 2,
  },
  value: {
    ...typography.stepper,
    color: colors.textPrimary,
  },
});
