import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProLockedBlurOverlay } from "../../components/ProLockedBlurOverlay";
import { fonts, radii, spacing, typography, type AppColors } from "../../constants/theme";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useProStatus } from "../../hooks/useProStatus";
import { useTheme } from "../../hooks/useTheme";
import type { SplitRecord } from "../../hooks/useSplitHistory";
import { useSplitHistory } from "../../hooks/useSplitHistory";
import { getProjectLackDebts, useProjects } from "../../hooks/useProjects";
import { formatCurrency } from "../../lib/currency";
import { rtlRow } from "../../lib/rtl";

const MS_PER_DAY = 86_400_000;
const FREE_LACK_LIMIT = 2;

function sentAtMillis(record: SplitRecord): number {
  const iso = typeof record.nudgeSentAt === "string" ? record.nudgeSentAt.trim() : "";
  if (iso) {
    const t = Date.parse(iso);
    if (Number.isFinite(t)) {
      return t;
    }
  }
  return Date.parse(record.createdAt) || Date.now();
}

function daysWaiting(record: SplitRecord): number {
  const diff = Date.now() - sentAtMillis(record);
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

function isUnpaid(record: SplitRecord): boolean {
  return !(typeof record.paidAt === "string" && record.paidAt.trim().length > 0);
}

function urgencyAccent(days: number): { bar: string; bg: string; border: string } {
  if (days <= 3) {
    return {
      bar: "rgba(34, 139, 34, 0.75)",
      bg: "rgba(34, 139, 34, 0.08)",
      border: "rgba(34, 139, 34, 0.35)",
    };
  }
  if (days <= 7) {
    return {
      bar: "rgba(184, 134, 11, 0.85)",
      bg: "rgba(255, 184, 0, 0.1)",
      border: "rgba(184, 134, 11, 0.45)",
    };
  }
  if (days <= 14) {
    return {
      bar: "rgba(234, 88, 12, 0.8)",
      bg: "rgba(234, 88, 12, 0.1)",
      border: "rgba(234, 88, 12, 0.4)",
    };
  }
  return {
    bar: "rgba(220, 38, 38, 0.85)",
    bg: "rgba(220, 38, 38, 0.1)",
    border: "rgba(185, 28, 28, 0.45)",
  };
}

export default function TheLackScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLocale();
  const { isPro } = useProStatus();
  const { items, loading, reload } = useSplitHistory();
  const { projects, loading: projectsLoading, reload: reloadProjects } = useProjects();
  const { currency: appCurrency } = useAppPreferences();

  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadProjects();
    }, [reload, reloadProjects])
  );

  type LackRow =
    | { kind: "split"; record: SplitRecord }
    | {
        kind: "project";
        participantName: string;
        toParticipantName: string;
        projectName: string;
        amount: number;
        closedAt: string;
      };

  const unpaid = useMemo(() => {
    const splitRows: LackRow[] = items.filter(isUnpaid).map((record) => ({ kind: "split", record }));
    const projectRows: LackRow[] = getProjectLackDebts(projects).map((entry) => ({
      kind: "project" as const,
      participantName: entry.participantName,
      toParticipantName: entry.toParticipantName,
      projectName: entry.projectName,
      amount: entry.amount,
      closedAt: entry.closedAt,
    }));
    return [...splitRows, ...projectRows].sort((a, b) => {
      const ta = a.kind === "split" ? sentAtMillis(a.record) : Date.parse(a.closedAt) || 0;
      const tb = b.kind === "split" ? sentAtMillis(b.record) : Date.parse(b.closedAt) || 0;
      return tb - ta;
    });
  }, [items, projects]);

  const totalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of unpaid) {
      if (row.kind === "split") {
        const currency = row.record.currency ?? "USD";
        const amount = Number.isFinite(row.record.totalPerPerson) ? row.record.totalPerPerson : 0;
        totals[currency] = (totals[currency] ?? 0) + amount;
      } else {
        totals[appCurrency] = (totals[appCurrency] ?? 0) + row.amount;
      }
    }
    return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  }, [appCurrency, unpaid]);

  const primaryTotal = totalsByCurrency[0];

  const formatDaysLabel = useCallback(
    (days: number) => {
      if (days === 0) {
        return t("sentToday");
      }
      if (days === 1) {
        return t("oneDaySinceSent");
      }
      return t("daysSinceSent", { days });
    },
    [t]
  );

  const renderRow = useCallback(
    ({ item, index }: { item: LackRow; index: number }) => {
      const isLocked = !isPro && index >= FREE_LACK_LIMIT;

      if (item.kind === "project") {
        const accent = urgencyAccent(7);
        return (
          <ProLockedBlurOverlay locked={isLocked} unlockMessage={t("unlockAllLack")}>
            <View
              style={[
                styles.rowCard,
                { backgroundColor: accent.bg, borderColor: accent.border },
              ]}
            >
              <View style={[styles.rowAccent, { backgroundColor: accent.bar }]} />
              <View style={styles.rowBody}>
                <View style={[styles.rowMain, rtlRow(isRTL)]}>
                  <View style={styles.rowTitleBlock}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.participantName}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {item.projectName}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>{formatCurrency(item.amount, appCurrency)}</Text>
                </View>
                <View style={[styles.rowFooter, rtlRow(isRTL)]}>
                  <View style={styles.sourcePill}>
                    <Text style={styles.sourcePillText}>📋 {t("theProject")}</Text>
                  </View>
                  <Text style={styles.rowMetaSecondary} numberOfLines={1}>
                    {t("projectWaitingPaysTo", { name: item.toParticipantName ?? "" })}
                  </Text>
                </View>
              </View>
            </View>
          </ProLockedBlurOverlay>
        );
      }

      const code = item.record.currency ?? "USD";
      const days = daysWaiting(item.record);
      const accent = urgencyAccent(days);

      return (
        <ProLockedBlurOverlay locked={isLocked} unlockMessage={t("unlockAllLack")}>
          <View
            style={[
              styles.rowCard,
              { backgroundColor: accent.bg, borderColor: accent.border },
            ]}
          >
            <View style={[styles.rowAccent, { backgroundColor: accent.bar }]} />
            <View style={styles.rowBody}>
              <View style={[styles.rowMain, rtlRow(isRTL)]}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.record.restaurant.trim() || t("restaurantName")}
                </Text>
                <Text style={styles.rowAmount}>
                  {formatCurrency(item.record.totalPerPerson, code)}
                </Text>
              </View>
              <View style={[styles.rowFooter, rtlRow(isRTL)]}>
                <View style={styles.daysBadge}>
                  <Text style={styles.daysBadgeText}>{formatDaysLabel(days)}</Text>
                </View>
                <View style={styles.sourcePill}>
                  <Text style={styles.sourcePillText}>÷ {t("split")}</Text>
                </View>
              </View>
            </View>
          </View>
        </ProLockedBlurOverlay>
      );
    },
    [appCurrency, formatDaysLabel, isPro, isRTL, styles, t]
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.headerBadge}>
        <Text style={styles.headerBadgeEmoji}>💸</Text>
      </View>
      <Text style={styles.title}>{t("theLack")}</Text>
      <View style={styles.titleAccent} />
      <Text style={styles.subtitle}>{t("theLackSubtitle")}</Text>

      {unpaid.length > 0 && primaryTotal ? (
        <View style={styles.heroCard}>
          <View style={[styles.heroTop, rtlRow(isRTL)]}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>{t("theLackTotal")}</Text>
              <Text style={styles.heroAmount}>
                {formatCurrency(primaryTotal[1], primaryTotal[0])}
              </Text>
            </View>
            <View style={styles.heroCountPill}>
              <Text style={styles.heroCountValue}>{unpaid.length}</Text>
              <Text style={styles.heroCountLabel}>{t("stillUnpaid")}</Text>
            </View>
          </View>

          {totalsByCurrency.length > 1 ? (
            <View style={styles.secondaryTotals}>
              {totalsByCurrency.slice(1).map(([currencyCode, amount], index) => {
                const isLocked = !isPro && index + 1 >= FREE_LACK_LIMIT;
                return (
                  <ProLockedBlurOverlay
                    key={currencyCode}
                    locked={isLocked}
                    unlockMessage={t("unlockAllLack")}
                  >
                    <View style={[styles.secondaryTotalRow, rtlRow(isRTL)]}>
                      <Text style={styles.secondaryCode}>{currencyCode}</Text>
                      <Text style={styles.secondaryAmount}>
                        {formatCurrency(amount, currencyCode)}
                      </Text>
                    </View>
                  </ProLockedBlurOverlay>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : null}

      {unpaid.length > 0 ? (
        <View style={styles.sectionPill}>
          <Text style={styles.sectionLabel}>{t("theLackContributors")}</Text>
        </View>
      ) : null}
    </View>
  );

  const bottomPad = Math.max(insets.bottom, spacing.sm) + 88;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {(loading || projectsLoading) && unpaid.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : unpaid.length === 0 ? (
        <View style={[styles.emptyScreen, { paddingBottom: bottomPad }]}>
          <View style={styles.headerBlock}>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeEmoji}>💸</Text>
            </View>
            <Text style={styles.title}>{t("theLack")}</Text>
            <View style={styles.titleAccent} />
            <Text style={styles.subtitle}>{t("theLackSubtitle")}</Text>
          </View>
          <View style={styles.emptyCenter}>
            <View style={styles.emptyBadge}>
              <Text style={styles.emptyEmoji}>✨</Text>
            </View>
            <Text style={styles.emptyTitle}>{t("theLackEmpty")}</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={unpaid}
          keyExtractor={(item, index) =>
            item.kind === "split"
              ? item.record.id
              : `project-${item.participantName}-${item.projectName}-${index}`
          }
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
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
    android: {
      elevation: 4,
    },
    default: {},
  });

  const heroShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDark ? 0.32 : colors.cardShadowOpacity + 0.08,
      shadowRadius: 18,
    },
    android: {
      elevation: 6,
    },
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
      flexGrow: 1,
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
    heroCard: {
      width: "100%",
      marginTop: spacing.md,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.35)",
      padding: spacing.lg,
      gap: spacing.md,
      ...heroShadow,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
    },
    heroCopy: {
      flex: 1,
      gap: 4,
    },
    heroLabel: {
      ...typography.label,
      color: colors.textSecondary,
    },
    heroAmount: {
      ...typography.resultPrimary,
      fontSize: 34,
      lineHeight: 40,
      color: colors.accent,
      letterSpacing: -1.2,
    },
    heroCountPill: {
      minWidth: 72,
      borderRadius: radii.lg,
      backgroundColor: colors.accentSoft,
      borderWidth: 1.5,
      borderColor: isDark ? colors.accent : "rgba(255, 184, 0, 0.4)",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      gap: 2,
    },
    heroCountValue: {
      ...typography.resultSecondary,
      fontSize: 22,
      color: colors.textPrimary,
      fontFamily: fonts.bodyBold,
    },
    heroCountLabel: {
      ...typography.badge,
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: "center",
    },
    secondaryTotals: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      gap: spacing.xs,
    },
    secondaryTotalRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.xs,
    },
    secondaryCode: {
      ...typography.label,
      color: colors.textSecondary,
    },
    secondaryAmount: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
    },
    sectionPill: {
      alignSelf: "flex-start",
      marginTop: spacing.sm,
      backgroundColor: colors.accentSoft,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.25)",
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textPrimary,
      letterSpacing: 0.1,
    },
    rowCard: {
      borderRadius: radii.xl,
      borderWidth: 1.5,
      overflow: "hidden",
      position: "relative",
      ...cardShadow,
    },
    rowAccent: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 5,
    },
    rowBody: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      paddingLeft: spacing.md + 4,
      gap: spacing.sm,
    },
    rowMain: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    rowTitleBlock: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
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
      letterSpacing: -0.3,
    },
    rowFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      flexWrap: "wrap",
    },
    rowMeta: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    rowMetaSecondary: {
      ...typography.badge,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    daysBadge: {
      backgroundColor: isDark ? "rgba(0,0,0,0.22)" : "rgba(28, 25, 23, 0.07)",
      borderRadius: radii.pill,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
    },
    daysBadgeText: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
    },
    sourcePill: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.95)",
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.7)",
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    sourcePillText: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
    },
    separator: {
      height: spacing.sm,
    },
    emptyScreen: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    emptyCenter: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
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
    },
  });
}
