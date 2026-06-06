import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Purchases from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlert } from "../components/AppAlert";
import { getLocalizedToneOptions } from "../constants/messages";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useAppPreferences } from "../hooks/useAppPreferences";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { useProStatus } from "../hooks/useProStatus";
import { useReceiptFooter } from "../hooks/useReceiptFooter";
import { useProjects } from "../hooks/useProjects";
import { useSplitHistory } from "../hooks/useSplitHistory";
import { SUPPORTED_LOCALES, type SupportedLocale } from "../lib/i18n";
import { rtlRow } from "../lib/rtl";
import { trackEvent } from "../lib/analytics";
import { safeRouterBack } from "../lib/safeRouterBack";

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro, refresh } = useProStatus();
  const { locale, changeLocale, t, isRTL } = useLocale();
  const { preference, changeTheme, isDark } = useTheme();
  const { defaultTone, setDefaultTone } = useAppPreferences();
  const { footer, saveFooter } = useReceiptFooter();
  const { hideReceiptBranding, setHideReceiptBranding } = useAppPreferences();
  const { clearAll } = useSplitHistory();
  const { clearAllProjects } = useProjects();
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [footerDraft, setFooterDraft] = useState(footer);
  const [footerEditing, setFooterEditing] = useState(false);
  const [showWebPreviewRestoreAlert, setShowWebPreviewRestoreAlert] = useState(false);
  const [showRestoredAlert, setShowRestoredAlert] = useState(false);
  const [showNothingToRestoreAlert, setShowNothingToRestoreAlert] = useState(false);
  const [showRestoreFailedAlert, setShowRestoreFailedAlert] = useState(false);
  const [clearAllStep, setClearAllStep] = useState<1 | 2 | null>(null);

  useEffect(() => {
    if (!footerEditing) {
      setFooterDraft(footer);
    }
  }, [footer, footerEditing]);

  const toneOptions = useMemo(() => getLocalizedToneOptions(t), [t]);

  const onRestore = useCallback(async () => {
    if (Platform.OS === "web") {
      setShowWebPreviewRestoreAlert(true);
      return;
    }
    setRestoreBusy(true);
    try {
      const info = await Purchases.restorePurchases();
      await refresh();
      void trackEvent("paywall_restore");
      const isNowPro =
        typeof info.entitlements?.active?.["Nudgrr Unlimited"] !== "undefined";
      if (isNowPro) {
        setShowRestoredAlert(true);
      } else {
        setShowNothingToRestoreAlert(true);
      }
    } catch {
      setShowRestoreFailedAlert(true);
    } finally {
      setRestoreBusy(false);
    }
  }, [refresh, t]);

  const onSubscribe = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const handleClearAll = useCallback(() => {
    setClearAllStep(1);
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable onPress={handleBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("settingsTitle")}</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("currency")}</Text>
        <Pressable
          onPress={() => router.push("/currency")}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <Text style={styles.actionText}>{t("selectCurrency")}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("language")}</Text>
        {(Object.entries(SUPPORTED_LOCALES) as [SupportedLocale, { label: string; rtl: boolean }][]).map(
          ([code, { label }]) => (
            <Pressable
              key={code}
              onPress={() => void changeLocale(code)}
              style={({ pressed }) => [styles.languageRow, rtlRow(isRTL), pressed && styles.pressed]}
            >
              <Text style={styles.languageLabel}>{label}</Text>
              {locale === code ? <Text style={styles.languageCheck}>✓</Text> : null}
            </Pressable>
          )
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("appearance")}</Text>
        {(["system", "light", "dark"] as const).map((pref) => (
          <Pressable
            key={pref}
            onPress={() => void changeTheme(pref)}
            style={({ pressed }) => [styles.languageRow, rtlRow(isRTL), pressed && styles.pressed]}
          >
            <Text style={styles.languageLabel}>
              {pref === "system" ? t("systemDefault") : pref === "light" ? t("lightMode") : t("darkMode")}
            </Text>
            {preference === pref ? <Text style={styles.languageCheck}>✓</Text> : null}
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("defaultTone")}</Text>
        {toneOptions.map((opt) => {
          const active = defaultTone === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => void setDefaultTone(opt.id)}
              style={({ pressed }) => [styles.languageRow, rtlRow(isRTL), pressed && styles.pressed]}
            >
              <Text style={styles.languageLabel}>
                {opt.emoji} {opt.label}
              </Text>
              {active ? <Text style={styles.languageCheck}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      {isPro ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t("receiptFooter")}</Text>
          <TextInput
            value={footerDraft}
            onChangeText={setFooterDraft}
            onFocus={() => setFooterEditing(true)}
            onBlur={() => {
              void saveFooter(footerDraft);
              setFooterEditing(false);
            }}
            onEndEditing={() => {
              void saveFooter(footerDraft);
              setFooterEditing(false);
            }}
            placeholder={t("receiptFooter")}
            placeholderTextColor={colors.textSecondary}
            style={styles.footerInput}
            selectionColor={colors.accent}
            multiline
          />
          {footerEditing ? (
            <Pressable
              onPress={() => {
                setFooterDraft(footer);
                setFooterEditing(false);
              }}
              style={({ pressed }) => [styles.footerCancelBtn, pressed && styles.pressed]}
            >
              <Text style={styles.footerCancelText}>{t("cancel")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

{isPro ? (
        <View style={styles.card}>
          <View style={[styles.row, rtlRow(isRTL)]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Hide "Made with Nudgrr"</Text>
              <Text style={styles.cardBody}>Remove branding from your receipts</Text>
            </View>
            <Switch
              value={hideReceiptBranding}
              onValueChange={(val) => void setHideReceiptBranding(val)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.background}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("subscription")}</Text>
        {isPro ? (
          <View style={[styles.proBadge, rtlRow(isRTL)]}>
            <Text style={styles.proBadgeMark}>✦</Text>
            <View style={styles.proBadgeText}>
              <Text style={styles.proBadgeName}>{t("nudgrrUnlimited")}</Text>
              <Text style={styles.proBadgeSub}>{t("subscriptionActive")}</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.cardBody}>{t("getUnlimitedOrRestore")}</Text>
            <Pressable onPress={onSubscribe} style={({ pressed }) => [styles.actionBtnPrimary, pressed && styles.pressed]}>
              <Text style={styles.actionTextPrimary}>{t("getUnlimited")}</Text>
            </Pressable>
            <Pressable onPress={() => void onRestore()} style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}>
              {restoreBusy ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={styles.actionText}>{t("restorePurchases")}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.legalFooter}>
        <Text style={styles.legalMicro}>
          By using Nudgrr you agree to the{" "}
          <Text onPress={() => router.push("/terms")} style={styles.legalLink}>
            Terms of Use
          </Text>{" "}
          and{" "}
          <Text onPress={() => router.push("/privacy")} style={styles.legalLink}>
            Privacy Policy
          </Text>
          .
        </Text>
        <Text style={styles.legalMicro}>
          Subscription purchases are subject to the terms of the app store you use (Apple or Google).
        </Text>
        <Pressable
          onPress={() => void Linking.openURL("mailto:nudgrr@noorlyfe.com?subject=Nudgrr%20support")}
          style={({ pressed }) => [styles.supportRow, pressed && styles.pressed]}
        >
          <Text style={styles.legalMicro}>
            {t("support")} <Text style={styles.legalLink}>nudgrr@noorlyfe.com</Text>
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleClearAll}
        style={({ pressed }) => [styles.clearAllBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t("clearAllData")}
      >
        <Text style={styles.clearAllText}>{t("clearAllData")}</Text>
      </Pressable>

      <AppAlert
        visible={showWebPreviewRestoreAlert}
        title={t("webPreview")}
        message={t("webPreviewRestore")}
        onRequestClose={() => setShowWebPreviewRestoreAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowWebPreviewRestoreAlert(false) }]}
      />
      <AppAlert
        visible={showRestoredAlert}
        title={t("restored")}
        message={t("unlimitedActiveAgain")}
        onRequestClose={() => setShowRestoredAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowRestoredAlert(false) }]}
      />
      <AppAlert
        visible={showNothingToRestoreAlert}
        title={t("nothingToRestore")}
        message={t("noActiveSubscription")}
        onRequestClose={() => setShowNothingToRestoreAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowNothingToRestoreAlert(false) }]}
      />
      <AppAlert
        visible={showRestoreFailedAlert}
        title={t("restoreFailed")}
        message={t("restoreFailedBody")}
        onRequestClose={() => setShowRestoreFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowRestoreFailedAlert(false) }]}
      />
      <AppAlert
        visible={clearAllStep === 1}
        title={t("clearAllConfirm1Title")}
        message={t("clearAllConfirm1Body")}
        onRequestClose={() => setClearAllStep(null)}
        buttons={[
          { text: t("clearAllCancel"), style: "cancel", onPress: () => setClearAllStep(null) },
          {
            text: t("clearAllConfirm1Continue"),
            onPress: () => setClearAllStep(2),
          },
        ]}
      />
      <AppAlert
        visible={clearAllStep === 2}
        title={t("clearAllConfirm2Title")}
        message={t("clearAllConfirm2Body")}
        onRequestClose={() => setClearAllStep(null)}
        buttons={[
          { text: t("clearAllCancel"), style: "cancel", onPress: () => setClearAllStep(null) },
          {
            text: t("clearAllConfirm2Delete"),
            style: "destructive",
            onPress: () => {
              setClearAllStep(null);
              void Promise.all([clearAll(), clearAllProjects()]);
            },
          },
        ]}
      />
    </ScrollView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { minWidth: 56, minHeight: 44, justifyContent: "center" },
  backText: { ...typography.body, color: colors.accent, fontWeight: "700" },
  title: { ...typography.body, fontFamily: fonts.bodyBold, color: colors.textPrimary },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  section: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  sectionLabel: {
    ...typography.body,
    fontWeight: "700",
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  languageLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  languageCheck: {
    ...typography.body,
    color: colors.accent,
    fontFamily: fonts.bodyBold,
  },
  cardBody: { ...typography.badge, color: colors.textSecondary, lineHeight: 18 },
  actionBtnPrimary: {
    minHeight: touchTarget.min,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  actionBtn: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: "rgba(184,134,11,0.07)",
  },
  proBadgeMark: {
    ...typography.stepper,
    color: colors.accent,
  },
  proBadgeText: {
    gap: 2,
  },
  proBadgeName: {
    ...typography.body,
    fontFamily: fonts.bodyBold,
    color: colors.accent,
  },
  proBadgeSub: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  actionTextPrimary: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    color: colors.pillActiveText,
  },
  actionText: { ...typography.body, color: colors.textPrimary },
  legalFooter: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
    alignItems: "center",
  },
  legalMicro: {
    ...typography.badge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  legalLink: {
    color: colors.textPrimary,
    textDecorationLine: "underline",
  },
  supportRow: { paddingVertical: 2 },
  footerInput: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 72,
    textAlignVertical: "top",
  },
  footerCancelBtn: {
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
    minHeight: touchTarget.min,
    justifyContent: "center",
  },
  footerCancelText: {
    ...typography.body,
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
  },
  clearAllBtn: {
    marginTop: spacing.lg,
    minHeight: touchTarget.min,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: "rgba(192, 57, 43, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  clearAllText: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    color: colors.destructive,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  pressed: { opacity: 0.86 },
  });
}
