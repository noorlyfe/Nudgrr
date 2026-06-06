import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlert } from "../../components/AppAlert";
import { ProGate } from "../../components/ProGate";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { useProStatus } from "../../hooks/useProStatus";
import type { Project } from "../../hooks/useProjects";
import { projectTotalSpent, useProjects } from "../../hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { formatCurrency } from "../../lib/currency";
import { isProjectFeatureLocked } from "../../lib/projectLimits";
import { rtlRow } from "../../lib/rtl";

export default function ProjectsTab() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { isPro, loading: proLoading } = useProStatus();
  const { currency } = useAppPreferences();
  const { projects, loading, reload, deleteProject } = useProjects();

  const locked = isProjectFeatureLocked(isPro);

  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const openCount = useMemo(() => projects.filter((p) => p.status === "open").length, [projects]);
  const closedCount = useMemo(() => projects.filter((p) => p.status === "closed").length, [projects]);

  const sections = useMemo(() => {
    const open = projects.filter((p) => p.status === "open");
    const closed = projects.filter((p) => p.status === "closed");
    const out: { title: string; data: Project[] }[] = [];
    if (open.length > 0) {
      out.push({ title: t("projectSectionOpen"), data: open });
    }
    if (closed.length > 0) {
      out.push({ title: t("projectSectionClosed"), data: closed });
    }
    return out;
  }, [projects, t]);

  const onCreate = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/project/new" as Href);
  }, [router]);

  const requestDelete = useCallback((project: Project) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeRefs.current.get(project.id)?.close();
    setDeleteTarget(project);
  }, []);

  const dismissDeleteAlert = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) {
      return;
    }
    const id = deleteTarget.id;
    setDeleteTarget(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void deleteProject(id);
  }, [deleteProject, deleteTarget]);

  const renderProject = useCallback(
    ({ item }: { item: Project }) => {
      const total = projectTotalSpent(item);
      const isOpen = item.status === "open";
      const statusLabel = isOpen ? t("projectStatusOpen") : t("projectStatusClosed");
      const accentBar = isOpen ? colors.accent : colors.border;
      const cardBg = isOpen
        ? isDark
          ? "rgba(255, 201, 64, 0.08)"
          : colors.accentSoft
        : colors.surface;
      const cardBorder = isOpen
        ? isDark
          ? "rgba(255, 201, 64, 0.35)"
          : "rgba(255, 184, 0, 0.35)"
        : colors.border;

      const renderRightActions = () => (
        <Pressable
          onPress={() => requestDelete(item)}
          style={styles.deleteAction}
          accessibilityRole="button"
          accessibilityLabel={t("delete")}
        >
          <Ionicons name="trash" size={22} color="#FFFFFF" accessibilityElementsHidden importantForAccessibility="no" />
        </Pressable>
      );

      return (
        <Swipeable
          ref={(ref) => {
            if (ref) {
              swipeRefs.current.set(item.id, ref);
            } else {
              swipeRefs.current.delete(item.id);
            }
          }}
          renderRightActions={renderRightActions}
          overshootRight={false}
          friction={2}
          rightThreshold={40}
          enabled={!locked}
        >
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/project/${item.id}` as Href);
            }}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: cardBg, borderColor: cardBorder },
              pressed && styles.cardPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={item.name}
          >
            <View style={[styles.cardAccent, { backgroundColor: accentBar }]} />
            <View style={styles.cardBody}>
              <View style={[styles.cardTop, rtlRow(isRTL)]}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={[styles.statusPill, !isOpen && styles.statusPillClosed]}>
                  <Text style={[styles.statusPillText, !isOpen && styles.statusPillTextClosed]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <View style={[styles.statsRow, rtlRow(isRTL)]}>
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>
                    👥 {t("projectParticipantsCount", { count: item.participants.length })}
                  </Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>
                    🧾 {item.expenses.length}
                  </Text>
                </View>
                <Text style={styles.cardTotal}>{formatCurrency(total, currency)}</Text>
              </View>
            </View>
          </Pressable>
        </Swipeable>
      );
    },
    [colors.accent, colors.border, colors.surface, currency, isDark, locked, requestDelete, router, styles, t]
  );

  const bottomPad = Math.max(insets.bottom, spacing.sm) + 88;

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.headerBadge}>
        <Text style={styles.headerBadgeEmoji}>📋</Text>
      </View>
      <Text style={styles.title}>{t("theProject")}</Text>
      <View style={styles.titleAccent} />
      <Text style={styles.subtitle}>{t("theProjectSubtitle")}</Text>

      {projects.length > 0 ? (
        <View style={styles.summaryCard}>
          <View style={[styles.summaryRow, rtlRow(isRTL)]}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{openCount}</Text>
              <Text style={styles.summaryLabel}>{t("projectSectionOpen")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{closedCount}</Text>
              <Text style={styles.summaryLabel}>{t("projectSectionClosed")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, styles.summaryTotal]}>{projects.length}</Text>
              <Text style={styles.summaryLabel}>{t("theProject")}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  const createFooter = (
    <View style={[styles.footer, { paddingBottom: bottomPad }]}>
      <Pressable
        onPress={onCreate}
        style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={t("projectCreateNew")}
      >
        <Text style={styles.createBtnText}>+ {t("projectCreateNew")}</Text>
      </Pressable>
    </View>
  );

  const listBody =
    loading && projects.length === 0 ? (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    ) : projects.length === 0 ? (
      <View style={styles.emptyWrap}>
        {listHeader}
        <View style={styles.emptyCenter}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyEmoji}>📋</Text>
          </View>
          <Text style={styles.emptyTitle}>{t("projectEmpty")}</Text>
        </View>
        {createFooter}
      </View>
    ) : (
      <View style={styles.listWrap}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderProject}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionPill}>
              <Text style={styles.sectionLabel}>{title}</Text>
            </View>
          )}
          ListHeaderComponent={listHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.itemGap} />}
        />
        {createFooter}
      </View>
    );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {proLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ProGate locked={locked} messageKey="projectProGateBody">
          {listBody}
        </ProGate>
      )}

      <AppAlert
        visible={deleteTarget !== null}
        title={t("projectDeleteConfirmTitle")}
        message={
          deleteTarget
            ? t("projectDeleteConfirmBody", { name: deleteTarget.name.trim() || t("projectDefaultName") })
            : undefined
        }
        onRequestClose={dismissDeleteAlert}
        buttons={[
          { text: t("cancel"), style: "cancel", onPress: dismissDeleteAlert },
          { text: t("delete"), style: "destructive", onPress: confirmDelete },
        ]}
      />
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.28 : colors.cardShadowOpacity + 0.04,
      shadowRadius: 14,
    },
    android: { elevation: 4 },
    default: {},
  });

  const heroShadow = Platform.select({
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
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    listWrap: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    emptyWrap: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: "transparent",
    },
    headerBlock: {
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
      gap: spacing.xs,
      alignItems: "center",
    },
    headerBadge: {
      width: 52,
      height: 52,
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.xs,
    },
    headerBadgeEmoji: {
      fontSize: 26,
      lineHeight: 30,
    },
    titleAccent: {
      width: 40,
      height: 4,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      marginTop: spacing.xs,
      marginBottom: spacing.xs,
    },
    title: {
      ...typography.wordmark,
      color: colors.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: spacing.md,
      lineHeight: 22,
    },
    summaryCard: {
      width: "100%",
      marginTop: spacing.md,
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.3)",
      backgroundColor: colors.surface,
      padding: spacing.md,
      ...heroShadow,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    summaryStat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    summaryValue: {
      ...typography.resultSecondary,
      fontSize: 22,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
    },
    summaryTotal: {
      color: colors.accent,
    },
    summaryLabel: {
      ...typography.badge,
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: "center",
    },
    summaryDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
    },
    createBtn: {
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      ...heroShadow,
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
    sectionPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.accentSoft,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.25)",
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textPrimary,
      letterSpacing: 0.1,
    },
    card: {
      borderRadius: radii.xl,
      borderWidth: 1.5,
      overflow: "hidden",
      position: "relative",
      ...cardShadow,
    },
    cardAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
    },
    cardBody: {
      padding: spacing.md,
      paddingLeft: spacing.md + 4,
      gap: spacing.sm,
    },
    cardPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.99 }],
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    cardTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textPrimary,
      flex: 1,
    },
    statusPill: {
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: colors.accent,
    },
    statusPillClosed: {
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusPillText: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
    statusPillTextClosed: {
      color: colors.textSecondary,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexWrap: "wrap",
    },
    statChip: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.95)",
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)",
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    statChipText: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    cardTotal: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.accent,
      marginLeft: "auto",
    },
    itemGap: {
      height: spacing.sm,
    },
    deleteAction: {
      width: 72,
      marginBottom: 0,
      backgroundColor: colors.destructive,
      justifyContent: "center",
      alignItems: "center",
      borderTopRightRadius: radii.xl,
      borderBottomRightRadius: radii.xl,
    },
    emptyCenter: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.sm,
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
      marginBottom: spacing.sm,
    },
    emptyEmoji: {
      fontSize: 34,
      lineHeight: 38,
    },
    emptyTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: spacing.md,
    },
  });
}
