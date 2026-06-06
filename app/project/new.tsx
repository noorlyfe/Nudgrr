import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProGate } from "../../components/ProGate";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { useProStatus } from "../../hooks/useProStatus";
import { useProjects } from "../../hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { isProjectFeatureLocked } from "../../lib/projectLimits";
import { rtlRow } from "../../lib/rtl";
import { safeRouterBack } from "../../lib/safeRouterBack";

const MIN_PARTICIPANTS = 2;

export default function NewProjectScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { isPro, loading: proLoading } = useProStatus();
  const { createProject } = useProjects();
  const locked = isProjectFeatureLocked(isPro);

  const [name, setName] = useState("");
  const [participants, setParticipants] = useState(["", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validNames = participants.map((p) => p.trim()).filter((p) => p.length > 0);
  const canCreate = name.trim().length > 0 && validNames.length >= MIN_PARTICIPANTS && !saving;

  const handleBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const addParticipant = useCallback(() => {
    setParticipants((prev) => [...prev, ""]);
  }, []);

  const updateParticipant = useCallback((index: number, value: string) => {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const removeParticipant = useCallback((index: number) => {
    setParticipants((prev) => {
      if (prev.length <= MIN_PARTICIPANTS) {
        return prev;
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (locked) {
      return;
    }
    if (!canCreate) {
      setError(t("projectCreateValidation"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const project = await createProject(
        { name: name.trim(), participantNames: validNames },
        { isPro }
      );
      if (!project) {
        return;
      }
      router.replace(`/project/${project.id}` as Href);
    } catch {
      setError(t("somethingWentWrongShort"));
    } finally {
      setSaving(false);
    }
  }, [canCreate, createProject, isPro, locked, name, router, t, validNames]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.header, rtlRow(isRTL)]}>
          <Pressable onPress={handleBack} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>{t("back")}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t("projectCreateNew")}</Text>
          <View style={styles.back} />
        </View>

        {proLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
        <ProGate locked={locked} messageKey="projectProGateBody">
        <ScrollView
          style={styles.gatedScroll}
          contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            <View style={styles.sectionPill}>
              <Text style={styles.sectionPillText}>{t("projectNameLabel")}</Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("projectNamePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              selectionColor={colors.accent}
              cursorColor={colors.accent}
              accessibilityLabel={t("projectNameLabel")}
            />
          </View>

          <View style={styles.sectionCard}>
            <View style={[styles.sectionHeader, rtlRow(isRTL)]}>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>{t("projectParticipantsLabel")}</Text>
              </View>
              <Text style={styles.participantCount}>
                {validNames.length}/{participants.length}
              </Text>
            </View>

            {participants.map((value, index) => (
              <View key={index} style={[styles.participantRow, rtlRow(isRTL)]}>
                <View style={styles.participantIndex}>
                  <Text style={styles.participantIndexText}>{index + 1}</Text>
                </View>
                <TextInput
                  value={value}
                  onChangeText={(text) => updateParticipant(index, text)}
                  placeholder={t("projectParticipantPlaceholder", { n: index + 1 })}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, styles.participantInput]}
                  selectionColor={colors.accent}
                  cursorColor={colors.accent}
                  accessibilityLabel={t("projectParticipantPlaceholder", { n: index + 1 })}
                />
                {participants.length > MIN_PARTICIPANTS ? (
                  <Pressable
                    onPress={() => removeParticipant(index)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={t("delete")}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            <Pressable
              onPress={addParticipant}
              style={({ pressed }) => [styles.addLink, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={t("projectAddParticipant")}
            >
              <Text style={styles.addLinkText}>+ {t("projectAddParticipant")}</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={() => void handleCreate()}
            disabled={!canCreate}
            style={({ pressed }) => [
              styles.createBtn,
              !canCreate && styles.createBtnDisabled,
              pressed && canCreate && styles.createBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("projectCreateButton")}
          >
            {saving ? (
              <ActivityIndicator color={colors.pillActiveText} />
            ) : (
              <Text style={styles.createBtnText}>{t("projectCreateButton")}</Text>
            )}
          </Pressable>
        </ScrollView>
        </ProGate>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.22 : colors.cardShadowOpacity,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    default: {},
  });

  return StyleSheet.create({
    flex: { flex: 1 },
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.lg,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    gatedScroll: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
    },
    back: {
      minWidth: 64,
      minHeight: touchTarget.min,
      justifyContent: "center",
    },
    backText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
    },
    headerTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textPrimary,
      textAlign: "center",
      flex: 1,
    },
    scroll: {
      gap: spacing.md,
      flexGrow: 1,
    },
    sectionCard: {
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.95)",
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    sectionPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.accentSoft,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.25)",
      paddingVertical: 5,
      paddingHorizontal: spacing.sm,
    },
    sectionPillText: {
      ...typography.label,
      fontSize: 11,
      color: colors.textPrimary,
    },
    participantCount: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
    },
    input: {
      ...typography.body,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.background : "#FFFDF8",
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      minHeight: touchTarget.inputHeight - 8,
    },
    participantRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    participantIndex: {
      width: 28,
      height: 28,
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.3)",
      alignItems: "center",
      justifyContent: "center",
    },
    participantIndexText: {
      ...typography.badge,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
    },
    participantInput: {
      flex: 1,
    },
    removeBtn: {
      width: touchTarget.min - 4,
      height: touchTarget.min - 4,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.background : colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    removeBtnText: {
      fontSize: 22,
      lineHeight: 24,
      color: colors.textSecondary,
    },
    addLink: {
      alignSelf: "flex-start",
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
    },
    addLinkText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
    },
    error: {
      ...typography.body,
      color: colors.destructive,
      textAlign: "center",
    },
    createBtn: {
      marginTop: spacing.sm,
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      ...cardShadow,
    },
    createBtnDisabled: {
      opacity: 0.45,
    },
    createBtnPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
    createBtnText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
    pressed: {
      opacity: 0.75,
    },
  });
}
