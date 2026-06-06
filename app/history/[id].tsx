import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { shareReceiptImage } from "../../lib/shareReceiptImage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";

import { AppAlert } from "../../components/AppAlert";
import { ProGate } from "../../components/ProGate";
import { ReceiptCard } from "../../components/ReceiptCard";
import { ShareReceiptButton } from "../../components/ShareReceiptButton";
import type { NudgeTone } from "../../constants/messages";
import { fonts, spacing, typography, type AppColors } from "../../constants/theme";
import { useProStatus } from "../../hooks/useProStatus";
import type { SplitRecord } from "../../hooks/useSplitHistory";
import { useSplitHistory } from "../../hooks/useSplitHistory";
import { useLocale } from "../../hooks/useLocale";
import { useColors } from "../../hooks/useColors";
import { useTheme } from "../../hooks/useTheme";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useReceiptFooter } from "../../hooks/useReceiptFooter";
import { formatDateMedium } from "../../lib/i18n";
import { rtlRow } from "../../lib/rtl";
import { safeRouterBack } from "../../lib/safeRouterBack";

function parseTone(raw: unknown): NudgeTone {
  const tones: NudgeTone[] = ["funny", "casual", "passiveAggressive", "serious"];
  if (typeof raw === "string" && tones.includes(raw as NudgeTone)) {
    return raw as NudgeTone;
  }
  return "funny";
}

function footerForRecord(record: SplitRecord): string {
  const raw = typeof record.receiptFooterResolved === "string" ? record.receiptFooterResolved.trim() : "";
  if (!raw) {
    return "";
  }
  // Legacy: older saves stored the default “Made with Nudgrr …” line; omit it everywhere now.
  if (raw.startsWith("Made with Nudgrr")) {
    return "";
  }
  return raw;
}

export default function HistoryReceiptScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const { width: windowWidth } = useWindowDimensions();
  const { isPro, loading: proLoading } = useProStatus();
  const { t, locale, isRTL } = useLocale();
  const { isDark } = useTheme();
  const { getById, unmarkPaid } = useSplitHistory();
  const { hideReceiptBranding } = useAppPreferences();
  const { footerForReceipt } = useReceiptFooter();
  const [record, setRecord] = useState<SplitRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [showWebPreviewSharingAlert, setShowWebPreviewSharingAlert] = useState(false);
  const [showSharingUnavailableAlert, setShowSharingUnavailableAlert] = useState(false);
  const [shareFailedMessage, setShareFailedMessage] = useState<string | null>(null);
  const shotRef = useRef<ViewShot | null>(null);

  const receiptWidth = Math.min(340, windowWidth - 32);

  useEffect(() => {
    if (!id) {
      setRecord(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setRecord(null);
    let cancelled = false;
    void (async () => {
      const row = await getById(id);
      if (cancelled) {
        return;
      }
      setRecord(row);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [getById, id]);

  const dateLabel = useMemo(() => {
    if (!record) {
      return "";
    }
    try {
      return formatDateMedium(record.createdAt, locale);
    } catch {
      return "";
    }
  }, [record]);

  const tone = useMemo(() => parseTone(record?.nudgeTone), [record]);

  const handleBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const hasPaidAt =
    typeof record?.paidAt === "string" && record.paidAt.trim().length > 0;

  const handleUndoReceived = useCallback(async () => {
    if (!id) {
      return;
    }
    void Haptics.selectionAsync();
    await unmarkPaid(id);
    const row = await getById(id);
    setRecord(row);
  }, [getById, id, unmarkPaid]);

  const handleShare = useCallback(async () => {
    if (!record) {
      return;
    }
    setSharing(true);
    try {
      if (Platform.OS === "web") {
        setShowWebPreviewSharingAlert(true);
        return;
      }
      const uri = await shotRef.current?.capture?.();
      if (!uri) {
        throw new Error(t("couldNotCaptureReceipt"));
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setShowSharingUnavailableAlert(true);
        return;
      }
      await shareReceiptImage(uri, {
        dialogTitle: t("shareReceiptDialog"),
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = e instanceof Error ? e.message : t("somethingWentWrongShort");
      setShareFailedMessage(message);
    } finally {
      setSharing(false);
    }
  }, [record, t]);

  const locked = !isPro;

  const receiptCustomFooter = useMemo(() => {
    const live = footerForReceipt(isPro);
    if (live) {
      return live;
    }
    if (!record) {
      return "";
    }
    return footerForRecord(record);
  }, [footerForReceipt, isPro, record]);

  if (!id) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={[styles.header, rtlRow(isRTL)]}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
            accessibilityRole="button"
            accessibilityLabel={t("goBack")}
          >
            <Text style={styles.backText}>{t("back")}</Text>
          </Pressable>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>{t("missingReceipt")}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
          accessibilityRole="button"
          accessibilityLabel={t("goBack")}
        >
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("receipt")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {proLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ProGate locked={locked}>
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : !record ? (
            <View style={styles.centered}>
              <Text style={styles.muted}>{t("receiptNoLongerAvailable")}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces
            >
              <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }} style={[styles.shotWrap, { width: receiptWidth }]}>
                <ReceiptCard
                  width={receiptWidth}
                  restaurantLabel={record.restaurant}
                  dateLabel={dateLabel}
                  billAmount={record.billAmount}
                  tipPercent={record.tipPercent}
                  tipAmount={record.tipAmount}
                  totalAmount={record.totalAmount}
                  totalPerPerson={record.totalPerPerson}
                  people={record.people}
                  isPro
                  hideReceiptBranding={hideReceiptBranding}
                  customFooter={receiptCustomFooter}
                  tone={tone}
                  currencyCode={record.currency ?? "USD"}
                  previewText={record.nudgePreviewText}
                />
              </ViewShot>

              <View style={styles.shareWrap}>
                <ShareReceiptButton ready={!sharing} onPress={handleShare} disabled={sharing} />
              </View>

              {isPro && hasPaidAt ? (
                <Pressable
                  onPress={() => {
                    void handleUndoReceived();
                  }}
                  hitSlop={12}
                  style={({ pressed }) => [styles.undoReceived, pressed && styles.undoReceivedPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t("undoMarkReceived")}
                >
                  <Text style={styles.undoReceivedText}>{t("undoReceived")}</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          )}
        </ProGate>
      )}
      <AppAlert
        visible={showWebPreviewSharingAlert}
        title={t("webPreviewLimitation")}
        message={t("webPreviewSharing")}
        onRequestClose={() => setShowWebPreviewSharingAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowWebPreviewSharingAlert(false) }]}
      />
      <AppAlert
        visible={showSharingUnavailableAlert}
        title={t("sharingUnavailable")}
        message={t("saveScreenshotManuallyShort")}
        onRequestClose={() => setShowSharingUnavailableAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowSharingUnavailableAlert(false) }]}
      />
      <AppAlert
        visible={shareFailedMessage !== null}
        title={t("shareFailed")}
        message={shareFailedMessage ?? undefined}
        onRequestClose={() => setShareFailedMessage(null)}
        buttons={[{ text: t("ok"), onPress: () => setShareFailedMessage(null) }]}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
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
    fontFamily: fonts.bodyBold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 72,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  muted: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  shotWrap: {
    alignSelf: "center",
    backgroundColor: "transparent",
  },
  shareWrap: {
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
  },
  undoReceived: {
    alignSelf: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  undoReceivedPressed: {
    opacity: 0.65,
  },
  undoReceivedText: {
    ...typography.badge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  });
}
