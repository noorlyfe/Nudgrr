import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useAppPreferences } from "../hooks/useAppPreferences";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { getAllCurrencyCodes, getCurrencyPickerName } from "../lib/currency";
import { rtlRow } from "../lib/rtl";
import { safeRouterBack } from "../lib/safeRouterBack";

type Row = { code: string };

export default function CurrencyScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const { loaded, currency: activeCode, setCurrency } = useAppPreferences();
  const [query, setQuery] = useState("");

  const allRows = useMemo<Row[]>(() => getAllCurrencyCodes().map((code) => ({ code })), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return allRows;
    }
    return allRows.filter((r) => {
      const name = getCurrencyPickerName(r.code);
      return r.code.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });
  }, [allRows, query]);

  const handleBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const onPick = useCallback(
    async (code: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await setCurrency(code);
      safeRouterBack(router);
    },
    [router, setCurrency]
  );

  const renderItem = useCallback(
    ({ item }: { item: Row }) => {
      const selected = item.code === activeCode;
      const name = getCurrencyPickerName(item.code);
      return (
        <Pressable
          onPress={() => void onPick(item.code)}
          style={({ pressed }) => [
            styles.row,
            rtlRow(isRTL),
            pressed && styles.rowPressed,
            selected && styles.rowSelected,
          ]}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          accessibilityLabel={`${name}, ${item.code}`}
        >
          <View style={styles.rowMain}>
            <Text style={styles.currencyLine} numberOfLines={2}>
              {name}
            </Text>
          </View>
          <Text style={styles.code}>{item.code}</Text>
        </Pressable>
      );
    },
    [activeCode, isRTL, onPick]
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable onPress={handleBack} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("currency")}</Text>
        <View style={styles.back} />
      </View>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={t("selectCurrency")}
        placeholderTextColor={colors.textSecondary}
        style={styles.search}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        accessibilityLabel={t("searchCurrencies")}
      />

      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          style={styles.list}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
          initialNumToRender={24}
          maxToRenderPerBatch={32}
          windowSize={10}
          ListEmptyComponent={
            <Text style={styles.empty}>{t("noCurrenciesMatch")}</Text>
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  back: { minWidth: 56, minHeight: 44, justifyContent: "center" },
  backText: { ...typography.body, color: colors.accent, fontWeight: "700" },
  title: { ...typography.body, fontFamily: fonts.bodyBold, color: colors.textPrimary },
  search: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.min,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: { opacity: 0.85 },
  rowSelected: { backgroundColor: colors.surface },
  rowMain: { flex: 1, paddingRight: spacing.md },
  currencyLine: {
    ...typography.body,
    color: colors.textPrimary,
  },
  code: { ...typography.body, fontFamily: fonts.bodyBold, color: colors.accent },
  list: { flex: 1 },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: spacing.xl },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  pressed: { opacity: 0.86 },
  });
}
