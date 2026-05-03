import { StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";
import { colors, radii, spacing, typography } from "../constants/theme";

export type SplitMode = "even" | "less" | "more" | "custom";

const OPTIONS: Array<{ id: SplitMode; label: string }> = [
  { id: "even", label: "Split evenly" },
  { id: "less", label: "I ate less" },
  { id: "more", label: "I ate more" },
  { id: "custom", label: "Custom" },
];

type SplitModeSelectorProps = {
  mode: SplitMode;
  customPercent: string;
  onModeChange: (mode: SplitMode) => void;
  onCustomPercentChange: (value: string) => void;
};

export function SplitModeSelector({
  mode,
  customPercent,
  onModeChange,
  onCustomPercentChange,
}: SplitModeSelectorProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>How to split</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {OPTIONS.map((option) => {
          const active = option.id === mode;
          return (
            <Pressable
              key={option.id}
              onPress={() => onModeChange(option.id)}
              style={[styles.pill, active ? styles.pillActive : styles.pillIdle]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={option.label}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {mode === "custom" ? (
        <View style={styles.customRow}>
          <Text style={styles.customHint}>My share of the even split:</Text>
          <View style={styles.customField}>
            <Text style={styles.prefix}>%</Text>
            <TextInput
              value={customPercent}
              onChangeText={(text) => onCustomPercentChange(text.replace(/[^\d.]/g, ""))}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="100"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              accessibilityLabel="Custom split percent"
            />
          </View>
        </View>
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
    paddingRight: spacing.lg,
  },
  pill: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    minHeight: 42,
    justifyContent: "center",
  },
  pillIdle: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.pillActiveBg,
  },
  pillText: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.pillActiveText,
    fontFamily: "SpaceMono_700Bold",
  },
  customRow: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  customHint: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  customField: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  prefix: {
    ...typography.body,
    color: colors.textSecondary,
    marginRight: 6,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    fontSize: 18,
    flex: 1,
    paddingVertical: spacing.xs,
  },
});
