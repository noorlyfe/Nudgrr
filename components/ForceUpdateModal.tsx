import { useMemo } from "react";
import { Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { fonts, radii, spacing, typography, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";

type Props = {
  visible: boolean;
  updateUrl: string;
};

export function ForceUpdateModal({ visible, updateUrl }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLocale();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.emoji}>🔄</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t("updateRequired")}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{t("updateRequiredBody")}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.accent },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => void Linking.openURL(updateUrl)}
            accessibilityRole="link"
            accessibilityLabel={t("updateNow")}
          >
            <Text style={[styles.buttonText, { color: colors.pillActiveText }]}>{t("updateNow")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(_colors: AppColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      backgroundColor: "rgba(0,0,0,0.85)",
    },
    card: {
      width: "100%",
      maxWidth: 340,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: spacing.xl,
      alignItems: "center",
      gap: spacing.md,
    },
    emoji: {
      fontSize: 48,
    },
    title: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 22,
      textAlign: "center",
    },
    message: {
      ...typography.body,
      fontSize: 15,
      textAlign: "center",
      lineHeight: 22,
    },
    button: {
      width: "100%",
      paddingVertical: spacing.md,
      borderRadius: radii.pill,
      alignItems: "center",
      marginTop: spacing.sm,
    },
    buttonPressed: {
      opacity: 0.9,
    },
    buttonText: {
      fontFamily: fonts.bodyBold,
      fontSize: 17,
    },
  });
}
