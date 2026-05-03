import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProGate } from "../components/ProGate";
import { colors, radii, spacing, typography } from "../constants/theme";
import { useProStatus } from "../hooks/useProStatus";
import type { SplitRecord } from "../hooks/useSplitHistory";
import { useSplitHistory } from "../hooks/useSplitHistory";
import { formatUsd } from "../hooks/useTipCalculator";
import { safeRouterBack } from "../lib/safeRouterBack";

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro, loading: proLoading } = useProStatus();
  const { items, loading: listLoading, reload } = useSplitHistory();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const locked = !isPro;

  const openRow = useCallback(
    (row: SplitRecord) => {
      router.push({ pathname: "/", params: { id: row.id } });
    },
    [router]
  );

  const handleBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const renderItem = useCallback(
    ({ item }: { item: SplitRecord }) => (
      <Pressable
        onPress={() => openRow(item)}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open split from ${item.restaurant || "Dinner"}`}
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.restaurant.trim() || "Dinner"}
          </Text>
          <Text style={styles.rowMeta}>
            {formatWhen(item.createdAt)} · {item.people} people
          </Text>
        </View>
        <Text style={styles.rowAmount}>{formatUsd(item.totalPerPerson)}</Text>
      </Pressable>
    ),
    [openRow]
  );

  const listBusy = listLoading;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {proLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ProGate locked={locked}>
          {listBusy ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No splits yet</Text>
              <Text style={styles.emptyBody}>
                Share a receipt from the home screen — it will land here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(r) => r.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </ProGate>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  back: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: "center",
  },
  backPressed: {
    opacity: 0.7,
  },
  backText: {
    ...typography.body,
    color: colors.accent,
  },
  title: {
    ...typography.body,
    fontFamily: "SpaceMono_700Bold",
    fontSize: 18,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 72,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.body,
    fontFamily: "SpaceMono_700Bold",
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
  },
  emptyBody: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    minHeight: 72,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowMain: {
    flex: 1,
    marginRight: spacing.md,
    gap: 4,
  },
  rowTitle: {
    ...typography.body,
    fontFamily: "SpaceMono_700Bold",
    color: colors.textPrimary,
  },
  rowMeta: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  rowAmount: {
    ...typography.body,
    fontFamily: "SpaceMono_700Bold",
    color: colors.accent,
  },
});
