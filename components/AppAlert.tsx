import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { fonts, radii, spacing, typography } from "../constants/theme";
import { useColors } from "../hooks/useColors";

export type AppAlertButton = {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type AppAlertProps = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  onRequestClose?: () => void;
};

export function AppAlert({ visible, title, message, buttons, onRequestClose }: AppAlertProps) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {message ? <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text> : null}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.buttons}>
            {buttons.map((btn, i) => (
              <Pressable
                key={i}
                onPress={btn.onPress}
                style={({ pressed }) => [
                  styles.btn,
                  i < buttons.length - 1 && {
                    borderRightWidth: StyleSheet.hairlineWidth,
                    borderRightColor: colors.border,
                  },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.btnText,
                    {
                      color:
                        btn.style === "destructive"
                          ? colors.destructive
                          : btn.style === "cancel"
                            ? colors.textSecondary
                            : colors.accent,
                    },
                    btn.style === "cancel" && { fontFamily: fonts.body },
                  ]}
                >
                  {btn.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  title: {
    ...typography.body,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    textAlign: "center",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  message: {
    ...typography.body,
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  buttons: {
    flexDirection: "row",
  },
  btn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
  },
});
