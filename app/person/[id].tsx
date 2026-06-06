import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { usePeople, type Person } from "../../hooks/usePeople";
import { useSplitHistory } from "../../hooks/useSplitHistory";
import { useProjects } from "../../hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { formatCurrency } from "../../lib/currency";
import {
  daysOutstanding,
  getPersonOutstandingAmount,
  getPersonWaitingRows,
  type PersonWaitingRow,
} from "../../lib/personWaitingEntries";
import { rtlRow } from "../../lib/rtl";
import { safeRouterBack } from "../../lib/safeRouterBack";

export default function PersonDetailScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { currency } = useAppPreferences();
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const personId = Array.isArray(rawId) ? rawId[0] : rawId;

  const { getById } = usePeople();
  const { items, reload: reloadSplits } = useSplitHistory();
  const { projects, reload: reloadProjects } = useProjects();

  const [person, setPerson] = useState<Person | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(true);

  const loadPerson = useCallback(async () => {
    if (!personId) {
      setPerson(null);
      setLoadingPerson(false);
      return;
    }
    setLoadingPerson(true);
    try {
      setPerson(await getById(personId));
    } finally {
      setLoadingPerson(false);
    }
  }, [getById, personId]);

  useFocusEffect(
    useCallback(() => {
      void loadPerson();
      void reloadSplits();
      void reloadProjects();
    }, [loadPerson, reloadProjects, reloadSplits])
  );

  const outstanding = useMemo(() => {
    if (!person) {
      return 0;
    }
    return getPersonOutstandingAmount(person.name, items, projects, currency);
  }, [currency, items, person, projects]);

  const entries = useMemo(() => {
    if (!person) {
      return [];
    }
    return getPersonWaitingRows(person.name, items, projects, currency);
  }, [currency, items, person, projects]);

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

  const openSplitForPerson = useCallback(
    (intent: "nudge" | "waiting") => {
      if (!person) {
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({
        pathname: "/(tabs)/",
        params: {
          personName: person.name,
          linkedPerson: person.name,
          personIntent: intent,
        },
      } as unknown as Href);
    },
    [person, router]
  );

  const renderEntry = useCallback(
    ({ item }: { item: PersonWaitingRow }) => {
      const days = daysOutstanding(item.sentAt);
      return (
        <View style={styles.entryCard}>
          <View style={[styles.entryTop, rtlRow(isRTL)]}>
            <Text style={styles.entryDescription} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.entryAmount}>{formatCurrency(item.amount, item.currency)}</Text>
          </View>
          <View style={[styles.entryFooter, rtlRow(isRTL)]}>
            <Text style={styles.entryDays}>{formatDaysLabel(days)}</Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {item.settled ? t("entryStatusSettled") : t("entryStatusActive")}
              </Text>
            </View>
          </View>
        </View>
      );
    },
    [formatDaysLabel, isRTL, styles, t]
  );

  if (loadingPerson) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.missingText}>{t("personNotFound")}</Text>
        <Pressable onPress={() => safeRouterBack(router)} style={styles.backLink}>
          <Text style={styles.backLinkText}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  const bottomPad = Math.max(insets.bottom, spacing.sm) + spacing.lg;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable
          onPress={() => {
            void Haptics.selectionAsync();
            safeRouterBack(router);
          }}
          style={styles.backButton}
          hitSlop={8}
        >
          <Text style={styles.backButtonText}>{t("back")}</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.personName}>{person.name}</Text>
        <Text style={styles.outstandingLabel}>{t("totalOutstanding")}</Text>
        <Text style={styles.outstandingAmount}>{formatCurrency(outstanding, currency)}</Text>

        <View style={[styles.actions, rtlRow(isRTL)]}>
          <Pressable
            onPress={() => openSplitForPerson("nudge")}
            style={({ pressed }) => [styles.actionButton, styles.actionPrimary, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionPrimaryText}>{t("sendNudge")}</Text>
          </Pressable>
          <Pressable
            onPress={() => openSplitForPerson("waiting")}
            style={({ pressed }) => [styles.actionButton, styles.actionSecondary, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionSecondaryText}>{t("addToWaitingGame")}</Text>
          </Pressable>
        </View>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyEntries}>
          <Text style={styles.emptyEntriesText}>{t("noActiveEntries")}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
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
    centered: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    missingText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
    backLink: {
      minHeight: touchTarget.min,
      justifyContent: "center",
    },
    backLinkText: {
      ...typography.body,
      color: colors.accent,
      fontFamily: fonts.bodySemiBold,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    backButton: {
      minHeight: touchTarget.min,
      justifyContent: "center",
    },
    backButtonText: {
      ...typography.body,
      color: colors.accent,
      fontFamily: fonts.bodySemiBold,
    },
    hero: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      gap: spacing.xs,
      alignItems: "center",
    },
    personName: {
      ...typography.wordmark,
      fontSize: 30,
      color: colors.textPrimary,
      textAlign: "center",
    },
    outstandingLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    outstandingAmount: {
      ...typography.resultPrimary,
      fontSize: 34,
      lineHeight: 40,
      color: colors.accent,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.lg,
      width: "100%",
    },
    actionButton: {
      flex: 1,
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.sm,
    },
    actionPrimary: {
      backgroundColor: colors.accent,
    },
    actionSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    actionPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    actionPrimaryText: {
      ...typography.label,
      color: colors.pillActiveText,
      fontFamily: fonts.bodyBold,
      textAlign: "center",
    },
    actionSecondaryText: {
      ...typography.label,
      color: colors.textPrimary,
      fontFamily: fonts.bodySemiBold,
      textAlign: "center",
    },
    listContent: {
      paddingHorizontal: spacing.lg,
    },
    entryCard: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.95)",
      padding: spacing.md,
      gap: spacing.sm,
      ...cardShadow,
    },
    entryTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    entryDescription: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
      flex: 1,
    },
    entryAmount: {
      ...typography.resultSecondary,
      fontSize: 18,
      color: colors.accent,
      fontFamily: fonts.bodyBold,
    },
    entryFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    entryDays: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    statusPill: {
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
      paddingVertical: 4,
      paddingHorizontal: spacing.sm,
    },
    statusPillText: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
    },
    separator: {
      height: spacing.sm,
    },
    emptyEntries: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
    },
    emptyEntriesText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });
}
