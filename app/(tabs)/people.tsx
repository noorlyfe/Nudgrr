import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { AppAlert } from "../../components/AppAlert";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { usePeople, type Person } from "../../hooks/usePeople";
import { useSplitHistory } from "../../hooks/useSplitHistory";
import { useProjects } from "../../hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { formatCurrency } from "../../lib/currency";
import { getPersonOutstandingAmount } from "../../lib/personWaitingEntries";
import { rtlRow } from "../../lib/rtl";

type PersonRow = Person & { outstanding: number };

export default function PeopleScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { currency } = useAppPreferences();
  const { people, loading, reload, addPerson } = usePeople();
  const { items, reload: reloadSplits } = useSplitHistory();
  const { projects, reload: reloadProjects } = useProjects();

  const [showAddModal, setShowAddModal] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadSplits();
      void reloadProjects();
    }, [reload, reloadProjects, reloadSplits])
  );

  const rows = useMemo<PersonRow[]>(() => {
    return people
      .map((person) => ({
        ...person,
        outstanding: getPersonOutstandingAmount(person.name, items, projects, currency),
      }))
      .sort((a, b) => {
        if (b.outstanding !== a.outstanding) {
          return b.outstanding - a.outstanding;
        }
        return a.name.localeCompare(b.name);
      });
  }, [currency, items, people, projects]);

  const openAddModal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNameDraft("");
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setNameDraft("");
  }, []);

  const submitPerson = useCallback(async () => {
    const created = await addPerson(nameDraft);
    if (!created) {
      setShowDuplicateAlert(true);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeAddModal();
  }, [addPerson, closeAddModal, nameDraft]);

  const renderRow = useCallback(
    ({ item }: { item: PersonRow }) => (
      <Pressable
        onPress={() => {
          void Haptics.selectionAsync();
          router.push(`/person/${item.id}` as Href);
        }}
        style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}
      >
        <View style={[styles.rowMain, rtlRow(isRTL)]}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.rowAmount}>{formatCurrency(item.outstanding, currency)}</Text>
        </View>
      </Pressable>
    ),
    [currency, isRTL, router, styles]
  );

  const bottomPad = Math.max(insets.bottom, spacing.sm) + 88;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.topBar, rtlRow(isRTL)]}>
        <View style={styles.topBarCopy}>
          <Text style={styles.title}>{t("peopleTab")}</Text>
        </View>
        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={t("addPerson")}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : rows.length === 0 ? (
        <View style={[styles.emptyWrap, { paddingBottom: bottomPad }]}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyEmoji}>👥</Text>
          </View>
          <Text style={styles.emptyText}>{t("peopleEmpty")}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={closeAddModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeAddModal} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("addPerson")}</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder={t("personNamePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.modalInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void submitPerson()}
            />
            <View style={[styles.modalActions, rtlRow(isRTL)]}>
              <Pressable onPress={closeAddModal} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitPerson()}
                style={[styles.modalSave, !nameDraft.trim() && styles.modalSaveDisabled]}
                disabled={!nameDraft.trim()}
              >
                <Text style={styles.modalSaveText}>{t("addPerson")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AppAlert
        visible={showDuplicateAlert}
        title={t("personAlreadyExists")}
        message={t("personAlreadyExistsBody")}
        buttons={[{ text: t("ok"), onPress: () => setShowDuplicateAlert(false) }]}
        onRequestClose={() => setShowDuplicateAlert(false)}
      />
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.24 : colors.cardShadowOpacity + 0.04,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  });

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.md,
    },
    topBarCopy: {
      flex: 1,
    },
    title: {
      ...typography.wordmark,
      color: colors.textPrimary,
    },
    addButton: {
      width: touchTarget.min,
      height: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.96 }],
    },
    addButtonText: {
      fontSize: 28,
      lineHeight: 30,
      color: colors.pillActiveText,
      fontFamily: fonts.bodyBold,
      marginTop: -2,
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
    },
    rowCard: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.95)",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      ...cardShadow,
    },
    rowPressed: {
      opacity: 0.92,
    },
    rowMain: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    rowName: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textPrimary,
      flex: 1,
    },
    rowAmount: {
      ...typography.resultSecondary,
      fontSize: 20,
      color: colors.accent,
      fontFamily: fonts.bodyBold,
    },
    separator: {
      height: spacing.sm,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    emptyBadge: {
      width: 72,
      height: 72,
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyEmoji: {
      fontSize: 34,
      lineHeight: 38,
    },
    emptyText: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    modalCard: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
    },
    modalTitle: {
      ...typography.resultSecondary,
      color: colors.textPrimary,
    },
    modalInput: {
      ...typography.input,
      fontSize: 18,
      color: colors.textPrimary,
      backgroundColor: isDark ? colors.background : "#FFFDF8",
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: touchTarget.inputHeight,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
    },
    modalCancel: {
      minHeight: touchTarget.min,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    modalCancelText: {
      ...typography.body,
      color: colors.textSecondary,
      fontFamily: fonts.bodySemiBold,
    },
    modalSave: {
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    modalSaveDisabled: {
      opacity: 0.45,
    },
    modalSaveText: {
      ...typography.label,
      color: colors.pillActiveText,
      fontFamily: fonts.bodyBold,
    },
  });
}
