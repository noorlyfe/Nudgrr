import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView as RNScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Pressable, Swipeable } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { shareReceiptImage } from "../lib/shareReceiptImage";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";

import { AppAlert } from "./AppAlert";
import { ProLockedBlurOverlay } from "./ProLockedBlurOverlay";
import { getLocalizedToneOptions } from "../constants/messages";
import { OverdueReceiptCard } from "./OverdueReceiptCard";
import { ProjectOverdueReceiptCard } from "./ProjectOverdueReceiptCard";
import type { NudgeTone } from "../constants/messages";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useAppPreferences } from "../hooks/useAppPreferences";
import { useReceiptFooter } from "../hooks/useReceiptFooter";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { useProStatus } from "../hooks/useProStatus";
import type { SplitRecord } from "../hooks/useSplitHistory";
import { useSplitHistory } from "../hooks/useSplitHistory";
import type { ProjectWaitingEntry } from "../hooks/useProjects";
import { useNudgeQuota } from "../hooks/useNudgeQuota";
import { getUnpaidProjectDebts, useProjects } from "../hooks/useProjects";
import { buildProjectReminderMessage } from "../lib/projectReminders";
import { formatCurrency } from "../lib/currency";
import { formatDateMedium } from "../lib/i18n";
import {
  computeReceiptPreviewLayout,
  getReceiptCaptureExportWidth,
  getReceiptCaptureWidth,
} from "../lib/receiptPreviewLayout";
import { rtlRow } from "../lib/rtl";
import { trackDaysWaiting } from "../lib/oneSignal";
import { safeRouterBack } from "../lib/safeRouterBack";

const MS_PER_DAY = 86_400_000;
const FREE_UNPAID_LIMIT = 2;

type WaitingListItem =
  | { kind: "split"; record: SplitRecord }
  | { kind: "project"; entry: ProjectWaitingEntry };

type ReminderCaptureTarget =
  | { kind: "split"; record: SplitRecord }
  | { kind: "project"; entry: ProjectWaitingEntry };

function projectSentAtMillis(entry: ProjectWaitingEntry): number {
  return Date.parse(entry.closedAt) || Date.now();
}

function daysWaitingProject(entry: ProjectWaitingEntry): number {
  const diff = Date.now() - projectSentAtMillis(entry);
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

type VibeTier = {
  emoji: string;
  tintBg: string;
  tintBorder: string;
};

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

/** Full days elapsed since message / receipt sent (floor). */
function daysWaiting(record: SplitRecord): number {
  const diff = Date.now() - sentAtMillis(record);
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

function vibeTierForDays(days: number): VibeTier {
  if (days <= 3) {
    return {
      emoji: "😎",
      tintBg: "rgba(34, 139, 34, 0.12)",
      tintBorder: "rgba(34, 139, 34, 0.55)",
    };
  }
  if (days <= 7) {
    return {
      emoji: "😏",
      tintBg: "rgba(217, 165, 43, 0.18)",
      tintBorder: "rgba(184, 134, 11, 0.65)",
    };
  }
  if (days <= 14) {
    return {
      emoji: "💼",
      tintBg: "rgba(217, 119, 6, 0.16)",
      tintBorder: "rgba(234, 88, 12, 0.55)",
    };
  }
  return {
    emoji: "🚨",
    tintBg: "rgba(220, 38, 38, 0.14)",
    tintBorder: "rgba(185, 28, 28, 0.6)",
  };
}

function vibeLabelForDays(
  days: number,
  toneOptions: ReturnType<typeof getLocalizedToneOptions>,
  t: (key: string) => string
): string {
  if (days <= 3) {
    return toneOptions.find((o) => o.id === "casual")?.label ?? t("casual");
  }
  if (days <= 7) {
    return toneOptions.find((o) => o.id === "passiveAggressive")?.label ?? t("passive");
  }
  if (days <= 14) {
    return toneOptions.find((o) => o.id === "serious")?.label ?? t("serious");
  }
  return t("vibeNuclear");
}

type Props = {
  variant: "tab" | "stack";
  /** Overrides default `theWaitingGame` header title. */
  headerTitle?: string;
  /** Overrides default `waitingSubtitle` on tab variant. */
  headerSubtitle?: string;
  /** Overrides default empty-queue copy when there are no items. */
  emptyTitle?: string;
  emptyBody?: string;
};

export function TheWaitingGame({
  variant,
  headerTitle,
  headerSubtitle,
  emptyTitle,
  emptyBody,
}: Props) {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const receiptWidth = getReceiptCaptureWidth(windowWidth);
  const offscreenTop = Dimensions.get("window").height + 120;

  const { t, isRTL, locale } = useLocale();
  const toneOptions = useMemo(() => getLocalizedToneOptions(t), [t]);
  const { isPro } = useProStatus();
  const { currency, hideReceiptBranding, defaultTone } = useAppPreferences();
  const { footer } = useReceiptFooter();
  const { canSendFree, recordSend } = useNudgeQuota(isPro);
  const { items, loading, reload, markAsPaid, markNudgeSent, deleteRecord } = useSplitHistory();
  const {
    projects,
    loading: projectsLoading,
    reload: reloadProjects,
    markSettlementPaid,
    markProjectNudgeSent,
  } = useProjects();
  const [query, setQuery] = useState("");

  const formatDaysSinceSent = useCallback(
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
  const paidDateLabel = useCallback((iso: string) => formatDateMedium(iso, locale), [locale]);
  const [captureTarget, setCaptureTarget] = useState<ReminderCaptureTarget | null>(null);
  const [reminderPreview, setReminderPreview] = useState<{
    uri: string;
    target: ReminderCaptureTarget;
  } | null>(null);
  const [showQuotaAlert, setShowQuotaAlert] = useState(false);
  const [reminderPreviewIntrinsic, setReminderPreviewIntrinsic] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [reminderShareBusy, setReminderShareBusy] = useState(false);
  const [showWebPreviewOverdueAlert, setShowWebPreviewOverdueAlert] = useState(false);
  const [showCaptureFailedAlert, setShowCaptureFailedAlert] = useState(false);
  const [showSharingUnavailableAlert, setShowSharingUnavailableAlert] = useState(false);
  const [showShareFailedAlert, setShowShareFailedAlert] = useState(false);
  const overdueShotRef = useRef<ViewShot | null>(null);

  const finishReminderSent = useCallback(
    async (target: ReminderCaptureTarget) => {
      if (target.kind === "split") {
        await markNudgeSent(target.record.id);
      } else {
        const tone = (target.entry.nudgeTone ?? defaultTone) as NudgeTone;
        const previewText = buildProjectReminderMessage(
          t,
          tone,
          daysWaitingProject(target.entry),
          {
            amount: formatCurrency(target.entry.amount, currency),
            project: target.entry.projectName.trim() || t("projectDefaultName"),
            payee: target.entry.toParticipantName,
          }
        );
        await markProjectNudgeSent(target.entry.projectId, target.entry.transferId, {
          nudgeTone: tone,
          nudgePreviewText: previewText,
        });
      }
      await recordSend();
    },
    [currency, defaultTone, markNudgeSent, markProjectNudgeSent, recordSend, t]
  );

  useEffect(() => {
    if (!captureTarget) {
      return;
    }
    if (Platform.OS === "web") {
      setShowWebPreviewOverdueAlert(true);
      setCaptureTarget(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        const uri = await captureRef(overdueShotRef, {
          format: "png",
          quality: 1,
          width: getReceiptCaptureExportWidth(receiptWidth),
        });
        if (cancelled) {
          return;
        }
        if (!uri) {
          setShowCaptureFailedAlert(true);
          setCaptureTarget(null);
          return;
        }
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          setShowSharingUnavailableAlert(true);
          setCaptureTarget(null);
          return;
        }
        if (isPro) {
          if (!cancelled) {
            setReminderPreview({ uri, target: captureTarget });
            setCaptureTarget(null);
          }
          return;
        }
        await shareReceiptImage(uri, { dialogTitle: t("secondNotice") });
        if (!cancelled) {
          await finishReminderSent(captureTarget);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        if (!cancelled) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setShowShareFailedAlert(true);
        }
      } finally {
        if (!cancelled) {
          setCaptureTarget(null);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [captureTarget, finishReminderSent, isPro, receiptWidth, t]);

  const dismissReminderPreview = useCallback(() => {
    setReminderPreview(null);
  }, []);

  const confirmReminderShare = useCallback(async () => {
    if (!reminderPreview) {
      return;
    }
    setReminderShareBusy(true);
    try {
      await shareReceiptImage(reminderPreview.uri, { dialogTitle: t("secondNotice") });
      await finishReminderSent(reminderPreview.target);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowShareFailedAlert(true);
    } finally {
      setReminderShareBusy(false);
      setReminderPreview(null);
    }
  }, [finishReminderSent, reminderPreview, t]);

  const requestReminderImageShare = useCallback(
    (target: ReminderCaptureTarget) => {
      if (!isPro && !canSendFree) {
        setShowQuotaAlert(true);
        return;
      }
      if (Platform.OS === "web") {
        setShowWebPreviewOverdueAlert(true);
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCaptureTarget(target);
    },
    [canSendFree, isPro]
  );

  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadProjects();
    }, [reload, reloadProjects])
  );

  const handleBack =
    variant === "stack"
      ? () => {
          void Haptics.selectionAsync();
          safeRouterBack(router);
        }
      : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((r) => r.restaurant.toLowerCase().includes(q));
  }, [items, query]);

  const filteredProjectDebts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const debts = getUnpaidProjectDebts(projects);
    if (!q) {
      return debts;
    }
    return debts.filter(
      (e) =>
        e.projectName.toLowerCase().includes(q) ||
        e.participantName.toLowerCase().includes(q) ||
        e.toParticipantName.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const { unpaid, paid } = useMemo(() => {
    const u: WaitingListItem[] = [];
    const p: WaitingListItem[] = [];
    for (const r of filtered) {
      const settled = typeof r.paidAt === "string" && r.paidAt.trim().length > 0;
      const row: WaitingListItem = { kind: "split", record: r };
      if (settled) {
        p.push(row);
      } else {
        u.push(row);
      }
    }
    for (const entry of filteredProjectDebts) {
      u.push({ kind: "project", entry });
    }
    u.sort((a, b) => {
      const ta =
        a.kind === "split" ? sentAtMillis(a.record) : projectSentAtMillis(a.entry);
      const tb =
        b.kind === "split" ? sentAtMillis(b.record) : projectSentAtMillis(b.entry);
      return tb - ta;
    });
    p.sort((a, b) => {
      if (a.kind !== "split" || b.kind !== "split") {
        return 0;
      }
      const ta = typeof a.record.paidAt === "string" ? Date.parse(a.record.paidAt) : 0;
      const tb = typeof b.record.paidAt === "string" ? Date.parse(b.record.paidAt) : 0;
      return tb - ta;
    });
    return { unpaid: u, paid: p };
  }, [filtered, filteredProjectDebts]);

  useEffect(() => {
    if (unpaid.length === 0) {
      return;
    }
    const maxDays = Math.max(
      ...unpaid.map((row) =>
        row.kind === "split" ? daysWaiting(row.record) : daysWaitingProject(row.entry)
      )
    );
    if (maxDays > 0) {
      void trackDaysWaiting(maxDays);
    }
  }, [unpaid]);

  const sections = useMemo(() => {
    const out: { title: string; data: WaitingListItem[] }[] = [];
    if (unpaid.length > 0) {
      out.push({ title: t("stillUnpaid"), data: unpaid });
    }
    if (paid.length > 0) {
      out.push({ title: t("paidDone"), data: paid });
    }
    return out;
  }, [paid, t, unpaid]);

  const waitingSummary = useMemo(() => {
    let count = 0;
    let total = 0;
    let maxDays = 0;
    let summaryCurrency = currency;
    for (const row of unpaid) {
      count += 1;
      const days = row.kind === "split" ? daysWaiting(row.record) : daysWaitingProject(row.entry);
      maxDays = Math.max(maxDays, days);
      if (row.kind === "split") {
        total += row.record.totalPerPerson;
        if (summaryCurrency === currency && row.record.currency) {
          summaryCurrency = row.record.currency;
        }
      } else {
        total += row.entry.amount;
      }
    }
    return { count, total, maxDays, summaryCurrency };
  }, [currency, unpaid]);

  const summaryVibe = useMemo(
    () => (waitingSummary.maxDays > 0 ? vibeTierForDays(waitingSummary.maxDays) : null),
    [waitingSummary.maxDays]
  );

  const bottomPad = variant === "tab" ? Math.max(insets.bottom, spacing.sm) + 88 : insets.bottom + spacing.xxl;

  const reminderPreviewChromeHeight = insets.top + insets.bottom + 200;

  const reminderPreviewImageLayout = useMemo(
    () =>
      computeReceiptPreviewLayout(
        reminderPreviewIntrinsic,
        receiptWidth,
        windowWidth,
        windowHeight,
        "scrollable",
        reminderPreviewChromeHeight
      ),
    [receiptWidth, reminderPreviewChromeHeight, reminderPreviewIntrinsic, windowHeight, windowWidth]
  );

  useEffect(() => {
    if (!reminderPreview?.uri) {
      setReminderPreviewIntrinsic(null);
      return;
    }
    Image.getSize(
      reminderPreview.uri,
      (width, height) => setReminderPreviewIntrinsic({ width, height }),
      () => setReminderPreviewIntrinsic(null)
    );
  }, [reminderPreview?.uri]);

  const renderItem = useCallback(
    ({ item }: { item: WaitingListItem }) => {
      if (item.kind === "project") {
        const entry = item.entry;
        const waitingDays = daysWaitingProject(entry);
        const vibe = vibeTierForDays(waitingDays);
        const unpaidIndex = unpaid.findIndex(
          (r) => r.kind === "project" && r.entry.transferId === entry.transferId
        );
        const isLocked = !isPro && unpaidIndex >= FREE_UNPAID_LIMIT;
        const reminderBusy = !!reminderPreview || !!captureTarget;

        const card = (
          <View
            style={[
              styles.card,
              isLocked && styles.cardLocked,
              { backgroundColor: vibe.tintBg, borderColor: vibe.tintBorder },
            ]}
          >
            <View style={[styles.cardAccent, { backgroundColor: vibe.tintBorder }]} />
            <Pressable
              onPress={() => {
                if (!isLocked) {
                  router.push(`/project/${entry.projectId}` as Href);
                }
              }}
              style={styles.cardBody}
              disabled={isLocked}
            >
              <View style={[styles.cardTop, rtlRow(isRTL)]}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.restaurant} numberOfLines={2}>
                    {entry.participantName}
                  </Text>
                  <Text style={styles.projectMeta} numberOfLines={1}>
                    {entry.projectName}
                  </Text>
                </View>
                <View style={[styles.vibePill, rtlRow(isRTL), { borderColor: vibe.tintBorder }]}>
                  <View style={[styles.vibeEmojiWrap, { backgroundColor: vibe.tintBg }]}>
                    <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                  </View>
                  <Text style={styles.vibeLabel} numberOfLines={2}>
                    {vibeLabelForDays(waitingDays, toneOptions, t)}
                  </Text>
                </View>
              </View>
              <Text style={styles.amountLine}>{formatCurrency(entry.amount, currency)}</Text>
              <View style={[styles.metaRow, rtlRow(isRTL)]}>
                <View style={styles.daysBadge}>
                  <Text style={styles.daysBadgeText}>{formatDaysSinceSent(waitingDays)}</Text>
                </View>
                <Text style={styles.daysLine} numberOfLines={1}>
                  {typeof entry.nudgeSentAt === "string" && entry.nudgeSentAt.trim()
                    ? t("reminderSent")
                    : t("projectWaitingPaysTo", { name: entry.toParticipantName })}
                </Text>
              </View>
            </Pressable>
            {!isLocked ? (
              <View style={[styles.cardActions, rtlRow(isRTL)]}>
                <Pressable
                  onPress={() =>
                    requestReminderImageShare({ kind: "project", entry })
                  }
                  disabled={reminderBusy}
                  style={({ pressed }) => [
                    styles.reminderPill,
                    reminderBusy && styles.reminderPillDisabled,
                    pressed && styles.reminderPillPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t("sendSecondNoticeImage")}
                >
                  <Text style={styles.reminderPillText}>🔔 {t("sendReminder")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    void markSettlementPaid(entry.projectId, entry.transferId);
                  }}
                  style={({ pressed }) => [styles.receiveBtn, pressed && styles.receiveBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t("markedReceivedPaid")}
                >
                  <Text style={styles.receiveBtnText}>✓ {t("received")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );

        return (
          <ProLockedBlurOverlay
            locked={isLocked}
            unlockMessage={t("unlockAllWaiting")}
            style={isLocked ? styles.lockedCardWrap : undefined}
          >
            {card}
          </ProLockedBlurOverlay>
        );
      }

      const record = item.record;
      const settled = typeof record.paidAt === "string" && record.paidAt.trim().length > 0;
      const waitingDays = daysWaiting(record);
      const vibe = settled ? null : vibeTierForDays(waitingDays);
      const code = record.currency ?? "USD";
      const name = record.restaurant.trim() || t("dinner");
      const unpaidIndex = unpaid.findIndex((r) => r.kind === "split" && r.record.id === record.id);
      const isLocked = !isPro && !settled && unpaidIndex >= FREE_UNPAID_LIMIT;

      const openDetail = () => {
        if (isLocked) {
          return;
        }
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/history/${record.id}`);
      };

      const renderRightActions = () => (
        <Pressable
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void deleteRecord(record.id);
          }}
          style={styles.deleteAction}
          accessibilityRole="button"
          accessibilityLabel={t("delete")}
        >
          <Text style={styles.deleteActionText}>{t("delete")}</Text>
        </Pressable>
      );

      const card = (
        <View
          style={[
            styles.card,
            isLocked && styles.cardLocked,
            settled && styles.cardSettled,
            !settled &&
              vibe && {
                backgroundColor: vibe.tintBg,
                borderColor: vibe.tintBorder,
              },
          ]}
        >
          {!settled && vibe ? (
            <View style={[styles.cardAccent, { backgroundColor: vibe.tintBorder }]} />
          ) : null}
          <Pressable onPress={openDetail} style={styles.cardBody} disabled={isLocked}>
            <View style={[styles.cardTop, rtlRow(isRTL)]}>
              <Text style={[styles.restaurant, settled && styles.mutedStrong]} numberOfLines={2}>
                {name}
              </Text>
              {settled ? (
                <View style={styles.donePill}>
                  <Text style={styles.doneMark} accessibilityLabel={t("paid")}>
                    ✅
                  </Text>
                </View>
              ) : (
                vibe && (
                  <View style={[styles.vibePill, rtlRow(isRTL), { borderColor: vibe.tintBorder }]}>
                    <View style={[styles.vibeEmojiWrap, { backgroundColor: vibe.tintBg }]}>
                      <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                    </View>
                    <Text style={styles.vibeLabel} numberOfLines={2}>
                      {vibeLabelForDays(waitingDays, toneOptions, t)}
                    </Text>
                  </View>
                )
              )}
            </View>
            <Text style={[styles.amountLine, settled && styles.mutedStrong]}>
              {formatCurrency(record.totalPerPerson, code)}
              {t("perPersonSuffix")}
            </Text>
            {settled ? (
              <Text style={[styles.daysLine, styles.muted]}>
                {record.paidAt ? `${t("paid")} · ${paidDateLabel(record.paidAt)}` : t("paid")}
              </Text>
            ) : (
              <View style={[styles.metaRow, rtlRow(isRTL)]}>
                <View style={styles.daysBadge}>
                  <Text style={styles.daysBadgeText}>{formatDaysSinceSent(waitingDays)}</Text>
                </View>
                {typeof record.nudgeSentAt === "string" && record.nudgeSentAt.trim() ? (
                  <Text style={styles.daysLine} numberOfLines={1}>
                    {t("reminderSent")}
                  </Text>
                ) : null}
              </View>
            )}
          </Pressable>

          {!settled && !isLocked ? (
            <View style={[styles.cardActions, rtlRow(isRTL)]}>
              <Pressable
                onPress={() => requestReminderImageShare({ kind: "split", record })}
                disabled={!!reminderPreview || !!captureTarget}
                style={({ pressed }) => [
                  styles.reminderPill,
                  (!!reminderPreview || !!captureTarget) && styles.reminderPillDisabled,
                  pressed && styles.reminderPillPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("sendSecondNoticeImage")}
              >
                <Text style={styles.reminderPillText}>🔔 {t("sendReminder")}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  void markAsPaid(record.id);
                }}
                style={({ pressed }) => [styles.receiveBtn, pressed && styles.receiveBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t("markedReceivedPaid")}
              >
                <Text style={styles.receiveBtnText}>✓ {t("received")}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );

      const cardWithLock = (
        <ProLockedBlurOverlay
          locked={isLocked}
          unlockMessage={t("unlockAllWaiting")}
          style={isLocked ? styles.lockedCardWrap : undefined}
        >
          {card}
        </ProLockedBlurOverlay>
      );

      if (isLocked) {
        return cardWithLock;
      }

      return (
        <Swipeable renderRightActions={renderRightActions} overshootRight={false} friction={2}>
          {card}
        </Swipeable>
      );
    },
    [
      captureTarget,
      defaultTone,
      deleteRecord,
      formatDaysSinceSent,
      isPro,
      isRTL,
      markAsPaid,
      markSettlementPaid,
      paidDateLabel,
      reminderPreview,
      requestReminderImageShare,
      router,
      t,
      toneOptions,
      unpaid,
      currency,
    ]
  );

  return (
    <View style={[styles.screen, isRTL && styles.rtlContainer, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      <StatusBar style={reminderPreview ? "light" : isDark ? "light" : "dark"} />
      {variant === "stack" ? (
        <View style={[styles.stackHeader, rtlRow(isRTL)]}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t("goBack")}
          >
            <Text style={styles.backText}>{t("back")}</Text>
          </Pressable>
          <Text style={styles.screenTitle}>{headerTitle ?? t("theWaitingGame")}</Text>
          <View style={styles.headerSpacer} />
        </View>
      ) : (
        <View style={styles.tabHeader}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeEmoji}>⏳</Text>
          </View>
          <Text style={styles.screenTitleCenter}>{headerTitle ?? t("theWaitingGame")}</Text>
          <View style={styles.titleAccent} />
          <Text style={styles.screenSub}>{headerSubtitle ?? t("waitingSubtitle")}</Text>
        </View>
      )}

      {!loading && !projectsLoading && waitingSummary.count > 0 ? (
        <View
          style={[
            styles.summaryCard,
            summaryVibe && {
              borderColor: summaryVibe.tintBorder,
              backgroundColor: summaryVibe.tintBg,
            },
          ]}
        >
          <View style={[styles.summaryTop, rtlRow(isRTL)]}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryStatValue}>{waitingSummary.count}</Text>
              <Text style={styles.summaryStatLabel}>{t("stillUnpaid")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryStatValue, styles.summaryAmount]}>
                {formatCurrency(waitingSummary.total, waitingSummary.summaryCurrency)}
              </Text>
              <Text style={styles.summaryStatLabel}>{t("theLackTotal")}</Text>
            </View>
            {summaryVibe ? (
              <View style={[styles.summaryVibe, { borderColor: summaryVibe.tintBorder }]}>
                <Text style={styles.summaryVibeEmoji}>{summaryVibe.emoji}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={[styles.searchWrap, variant === "stack" && styles.searchWrapStack]}>
        <View style={[styles.searchField, rtlRow(isRTL)]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("searchRestaurant")}
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            accessibilityLabel={t("filterByRestaurant")}
          />
        </View>
      </View>

      {loading || projectsLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : items.length === 0 && filteredProjectDebts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyEmoji}>⏳</Text>
          </View>
          <Text style={styles.emptyTitle}>{emptyTitle ?? t("nothingInQueue")}</Text>
          <Text style={styles.emptyBody}>{emptyBody ?? t("nothingInQueueBody")}</Text>
        </View>
      ) : filtered.length === 0 && filteredProjectDebts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyEmoji}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>{t("noMatches")}</Text>
          <Text style={styles.emptyBody}>{t("tryDifferentRestaurant")}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>{t("nothingToShow")}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) =>
            r.kind === "split" ? r.record.id : `project-${r.entry.transferId}`
          }
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeader}>{title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {captureTarget ? (
        <View
          pointerEvents="none"
          style={[styles.offscreenShot, { top: offscreenTop, width: receiptWidth }]}
          collapsable={false}
        >
          <ViewShot
            ref={overdueShotRef}
            options={{ format: "png", quality: 1 }}
            style={[styles.shotInner, { width: receiptWidth }]}
          >
            {captureTarget.kind === "split" ? (
              <OverdueReceiptCard
                width={receiptWidth}
                record={captureTarget.record}
                daysOverdue={daysWaiting(captureTarget.record)}
                dateLabel={paidDateLabel(captureTarget.record.createdAt)}
                isPro={isPro}
                hideReceiptBranding={hideReceiptBranding}
                customFooter={footer}
                compact
              />
            ) : (
              <ProjectOverdueReceiptCard
                width={receiptWidth}
                entry={captureTarget.entry}
                daysOverdue={daysWaitingProject(captureTarget.entry)}
                dateLabel={paidDateLabel(captureTarget.entry.closedAt)}
                currencyCode={currency}
                nudgeTone={(captureTarget.entry.nudgeTone ?? defaultTone) as NudgeTone}
                isPro={isPro}
                hideReceiptBranding={hideReceiptBranding}
                customFooter={footer}
                compact
              />
            )}
          </ViewShot>
        </View>
      ) : null}

      <Modal
        visible={!!reminderPreview}
        transparent
        animationType="slide"
        onRequestClose={dismissReminderPreview}
      >
        <View style={styles.sharePreviewRoot}>
          <View
            style={[
              styles.sharePreviewTopBar,
              rtlRow(isRTL),
              {
                paddingTop: insets.top + spacing.sm,
                paddingHorizontal: reminderPreviewImageLayout.marginH,
              },
            ]}
          >
            <View style={styles.sharePreviewTopSpacer} />
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                dismissReminderPreview();
              }}
              hitSlop={16}
              disabled={reminderShareBusy}
              style={({ pressed }) => [styles.sharePreviewCloseBtn, pressed && styles.sharePreviewCloseBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t("closePreview")}
            >
              <Text style={styles.sharePreviewCloseText}>✕</Text>
            </Pressable>
          </View>

          <RNScrollView
            style={styles.sharePreviewScroll}
            contentContainerStyle={[
              styles.sharePreviewScrollContent,
              styles.sharePreviewScrollContentTall,
              { paddingHorizontal: reminderPreviewImageLayout.marginH },
            ]}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {reminderPreview ? (
              <View
                style={[
                  styles.sharePreviewImageFrame,
                  {
                    width: reminderPreviewImageLayout.imgW,
                    height: reminderPreviewImageLayout.imgH,
                  },
                ]}
              >
                <Image
                  source={{ uri: reminderPreview.uri }}
                  style={styles.sharePreviewImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </RNScrollView>

          <View
            style={[
              styles.sharePreviewFooter,
              {
                paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm,
                paddingHorizontal: reminderPreviewImageLayout.marginH,
                paddingTop: spacing.lg,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                void confirmReminderShare();
              }}
              disabled={reminderShareBusy}
              style={({ pressed }) => [
                styles.sharePreviewCta,
                reminderShareBusy && styles.sharePreviewCtaDisabled,
                pressed && !reminderShareBusy && styles.sharePreviewCtaPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("shareReminderImage")}
            >
              {reminderShareBusy ? (
                <ActivityIndicator color={colors.pillActiveText} />
              ) : (
                <Text style={styles.sharePreviewCtaText}>{t("share")}</Text>
              )}
            </Pressable>
            <Pressable
              onPress={dismissReminderPreview}
              disabled={reminderShareBusy}
              style={({ pressed }) => [
                styles.sharePreviewDismiss,
                pressed && !reminderShareBusy && styles.sharePreviewDismissPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("cancelSharing")}
            >
              <Text style={styles.sharePreviewDismissText}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <AppAlert
        visible={showWebPreviewOverdueAlert}
        title={t("webPreview")}
        message={t("webPreviewSharingOverdue")}
        onRequestClose={() => setShowWebPreviewOverdueAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowWebPreviewOverdueAlert(false) }]}
      />
      <AppAlert
        visible={showCaptureFailedAlert}
        title={t("captureFailed")}
        message={t("couldNotCreateReminderImage")}
        onRequestClose={() => setShowCaptureFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowCaptureFailedAlert(false) }]}
      />
      <AppAlert
        visible={showSharingUnavailableAlert}
        title={t("sharingUnavailable")}
        message={t("sharingNotAvailableDevice")}
        onRequestClose={() => setShowSharingUnavailableAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowSharingUnavailableAlert(false) }]}
      />
      <AppAlert
        visible={showShareFailedAlert}
        title={t("shareFailed")}
        message={t("somethingWentWrongShort")}
        onRequestClose={() => setShowShareFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowShareFailedAlert(false) }]}
      />
      <AppAlert
        visible={showQuotaAlert}
        title={t("noFreeNudges")}
        message={t("noFreeNudges")}
        onRequestClose={() => setShowQuotaAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowQuotaAlert(false) }]}
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
    android: {
      elevation: 4,
    },
    default: {},
  });

  const summaryShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.22 : colors.cardShadowOpacity,
      shadowRadius: 10,
    },
    android: {
      elevation: 3,
    },
    default: {},
  });

  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  rtlContainer: {
    direction: "rtl",
  },
  stackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingTop: spacing.xl,
  },
  tabHeader: {
    marginBottom: spacing.md,
    gap: spacing.xs,
    paddingTop: spacing.lg,
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
  headerSpacer: {
    width: 64,
  },
  screenTitle: {
    ...typography.body,
    fontFamily: fonts.bodyBold,
    color: colors.textPrimary,
    textAlign: "center",
    flex: 1,
  },
  screenTitleCenter: {
    ...typography.wordmark,
    textAlign: "center",
    color: colors.textPrimary,
  },
  screenSub: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: spacing.md,
    lineHeight: 22,
  },
  summaryCard: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...summaryShadow,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryStat: {
    flex: 1,
    gap: 2,
  },
  summaryStatValue: {
    ...typography.resultSecondary,
    color: colors.textPrimary,
    fontSize: 22,
  },
  summaryAmount: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
  },
  summaryStatLabel: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
    opacity: 0.9,
  },
  summaryVibe: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryVibeEmoji: {
    fontSize: 22,
    lineHeight: 26,
  },
  searchWrap: {
    marginBottom: spacing.md,
  },
  searchWrapStack: {
    marginTop: 0,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: isDark ? colors.border : "rgba(237, 228, 216, 0.95)",
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.inputHeight - 4,
    ...summaryShadow,
  },
  searchIcon: {
    fontSize: 16,
    lineHeight: 20,
    opacity: 0.75,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: touchTarget.min - 8,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
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
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  sectionHeaderWrap: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: isDark ? colors.border : "rgba(255, 184, 0, 0.25)",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
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
    borderTopLeftRadius: radii.xl,
    borderBottomLeftRadius: radii.xl,
  },
  cardLocked: {
    marginBottom: 0,
  },
  lockedCardWrap: {
    marginBottom: spacing.md,
  },
  deleteAction: {
    width: 80,
    marginBottom: spacing.md,
    backgroundColor: colors.destructive,
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  deleteActionText: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
  },
  cardSettled: {
    opacity: 0.78,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardBody: {
    padding: spacing.md,
    paddingLeft: spacing.md + 4,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  restaurant: {
    ...typography.body,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    flex: 1,
    color: colors.textPrimary,
  },
  projectMeta: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  donePill: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: isDark ? "rgba(34, 139, 34, 0.2)" : "rgba(34, 139, 34, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  doneMark: {
    fontSize: 18,
    lineHeight: 22,
  },
  vibePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.65)",
    maxWidth: "52%",
  },
  vibeEmojiWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  vibeEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  vibeLabel: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  amountLine: {
    ...typography.resultSecondary,
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    marginTop: spacing.xs,
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: "wrap",
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
  daysLine: {
    ...typography.badge,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  muted: {
    color: colors.textSecondary,
  },
  mutedStrong: {
    color: colors.textSecondary,
    opacity: 0.92,
  },
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    paddingLeft: spacing.md + 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: isDark ? colors.border : "rgba(237, 228, 216, 0.85)",
  },
  reminderPill: {
    flex: 1,
    minHeight: touchTarget.min - 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  reminderPillPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  reminderPillDisabled: {
    opacity: 0.45,
  },
  reminderPillText: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.pillActiveText,
    textAlign: "center",
  },
  receiveBtn: {
    flex: 1,
    minHeight: touchTarget.min - 4,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  receiveBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  receiveBtnText: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  offscreenShot: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    opacity: 1,
    zIndex: -2,
  },
  shotInner: {
    flexShrink: 0,
    backgroundColor: "transparent",
  },
  sharePreviewRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  sharePreviewTopBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  sharePreviewTopSpacer: {
    flex: 1,
  },
  sharePreviewCloseBtn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  sharePreviewCloseBtnPressed: {
    opacity: 0.65,
  },
  sharePreviewCloseText: {
    ...typography.input,
    color: "rgba(243, 232, 212, 0.92)",
    fontFamily: fonts.body,
    fontWeight: "400",
  },
  sharePreviewScroll: {
    flex: 1,
  },
  sharePreviewScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  sharePreviewScrollContentTall: {
    justifyContent: "flex-start",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sharePreviewImageFrame: {
    overflow: "visible",
    backgroundColor: "transparent",
  },
  sharePreviewImage: {
    width: "100%",
    height: "100%",
  },
  sharePreviewFooter: {
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  sharePreviewCta: {
    minHeight: touchTarget.min,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  sharePreviewCtaPressed: {
    opacity: 0.92,
  },
  sharePreviewCtaDisabled: {
    opacity: 0.75,
  },
  sharePreviewCtaText: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    color: colors.pillActiveText,
  },
  sharePreviewDismiss: {
    alignItems: "center",
    paddingVertical: spacing.md,
    minHeight: touchTarget.min,
    justifyContent: "center",
  },
  sharePreviewDismissPressed: {
    opacity: 0.7,
  },
  sharePreviewDismissText: {
    ...typography.body,
    color: "rgba(243, 232, 212, 0.78)",
    fontFamily: fonts.body,
  },
  });
}
