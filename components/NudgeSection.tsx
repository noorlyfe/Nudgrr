import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform, Share, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { AppAlert } from "./AppAlert";
import {
  FREE_NUDGES_PER_MONTH,
  NUDGE_TEMPLATES_LOCALIZED,
  getLocalizedToneOptions,
  type NudgeTone,
  buildFullNudgeMessage,
} from "../constants/messages";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useNudgeCycle } from "../hooks/useNudgeCycle";
import { useNudgeQuota } from "../hooks/useNudgeQuota";
import { trackEvent } from "../lib/analytics";
import { formatCurrency } from "../lib/currency";
import { rtlRow } from "../lib/rtl";

type NudgeSectionProps = {
  hasBill: boolean;
  totalPerPerson: number;
  restaurant: string;
  isPro: boolean;
  tone: NudgeTone;
  onToneChange: (t: NudgeTone) => void;
  currencyCode: string;
  onPreviewTextChange?: (text: string) => void;
};

export function NudgeSection({
  hasBill,
  totalPerPerson,
  restaurant,
  isPro,
  tone,
  onToneChange,
  currencyCode,
  onPreviewTextChange,
}: NudgeSectionProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const { t, locale, isRTL } = useLocale();
  const { remainingFree, canSendFree, loading, recordSend } = useNudgeQuota(isPro);
  const localizedTemplates = useMemo(
    () => NUDGE_TEMPLATES_LOCALIZED[locale] ?? NUDGE_TEMPLATES_LOCALIZED.en,
    [locale]
  );
  const { advance, rawBody: formatRawBody } = useNudgeCycle(tone, localizedTemplates);
  const toneOptions = useMemo(() => getLocalizedToneOptions(t), [t]);
  const [showMonthlyLimitAlert, setShowMonthlyLimitAlert] = useState(false);
  const [showWebPreviewNudgeAlert, setShowWebPreviewNudgeAlert] = useState(false);
  const [shareFailedMessage, setShareFailedMessage] = useState<string | null>(null);

  const amountFormatted = useMemo(
    () => formatCurrency(totalPerPerson, currencyCode),
    [currencyCode, locale, totalPerPerson]
  );

  const rawBody = useMemo(
    () => formatRawBody(amountFormatted),
    [amountFormatted, formatRawBody]
  );

  // Nudge preview text — always synced for receipt capture; never gated by quota or Pro.
  useEffect(() => {
    onPreviewTextChange?.(rawBody);
  }, [onPreviewTextChange, rawBody]);

  const fullMessage = useMemo(
    () => buildFullNudgeMessage(rawBody, !isPro),
    [isPro, rawBody]
  );

  const contextLabel = restaurant.trim();

  const onPickTone = useCallback(
    (pickedTone: NudgeTone) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (pickedTone === tone) {
        advance(pickedTone);
        return;
      }
      onToneChange(pickedTone);
    },
    [advance, onToneChange, tone]
  );

  const onRegenerate = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void trackEvent("nudge_regenerate");
    advance(tone);
  }, [advance, tone]);

  const onSendNudge = useCallback(async () => {
    if (!hasBill) {
      return;
    }
    if (!isPro && !canSendFree) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowMonthlyLimitAlert(true);
      return;
    }

    try {
      if (Platform.OS === "web") {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ text: fullMessage });
          if (!isPro) {
            await recordSend();
          }
          void trackEvent("nudge_sent");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setShowWebPreviewNudgeAlert(true);
        }
        return;
      }

      const result = await Share.share({ message: fullMessage, title: t("yourShare") });
      if (result.action === Share.sharedAction) {
        if (!isPro) {
          await recordSend();
        }
        void trackEvent("nudge_sent");
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e instanceof Error ? e.message : t("couldNotOpenShareSheet");
      setShareFailedMessage(msg);
    }
  }, [canSendFree, fullMessage, hasBill, isPro, recordSend, router, t]);

  if (!hasBill) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>{t("sendANudge")}</Text>
      <Text style={styles.sectionSub}>{t("vibeSub")}</Text>
      {!isPro ? (
        <View style={[styles.quotaBadge, remainingFree === 0 && styles.quotaBadgeEmpty]}>
          <Text style={[styles.quotaText, remainingFree === 0 && styles.quotaTextEmpty]}>
            {loading
              ? "…"
              : remainingFree === 0
                ? t("noFreeNudges")
                : t("freeNudgesLeft", { remaining: remainingFree, total: FREE_NUDGES_PER_MONTH })}
          </Text>
        </View>
      ) : null}

      <View style={[styles.toneGrid, rtlRow(isRTL)]}>
        {toneOptions.map((opt) => {
          const active = tone === opt.id;
          return (
            <Pressable
              key={opt.id}
              onPress={() => onPickTone(opt.id)}
              style={({ pressed }) => [
                styles.toneBtn,
                active ? styles.toneBtnActive : styles.toneBtnIdle,
                pressed && styles.toneBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t("toneA11y", { label: opt.label })}
            >
              <Text style={styles.toneEmoji}>{opt.emoji}</Text>
              <Text style={[styles.toneLabel, active && styles.toneLabelActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Preview message — always visible for free and Pro; not affected by monthly nudge limit */}
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>{t("preview")}</Text>
        {contextLabel ? (
          <Text style={styles.contextSmall}>
            {t("fromPrefix")}
            {contextLabel}
          </Text>
        ) : null}
        <Text style={styles.previewText}>{rawBody}</Text>
      </View>

      <View style={[styles.secondaryRow, rtlRow(isRTL)]}>
        <Pressable
          onPress={onRegenerate}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel={t("regenerateMessage")}
        >
          <Text style={styles.secondaryBtnText}>{t("regenerate")}</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => void onSendNudge()}
        disabled={!isPro && !canSendFree && !loading}
        style={({ pressed }) => [
          styles.sendBtn,
          pressed && styles.sendBtnPressed,
          !isPro && !canSendFree && !loading && styles.sendBtnDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("sendTextReminder")}
      >
        <Text style={[styles.sendBtnText, !isPro && !canSendFree && !loading && styles.sendBtnTextDisabled]}>
          {!isPro && !canSendFree && !loading ? t("noFreeNudges") : t("sendTextReminder")}
        </Text>
      </Pressable>

      <AppAlert
        visible={showMonthlyLimitAlert}
        title={t("monthlyNudgeLimit")}
        message={t("monthlyNudgeLimitBody", { total: FREE_NUDGES_PER_MONTH })}
        onRequestClose={() => setShowMonthlyLimitAlert(false)}
        buttons={[
          { text: t("notNow"), style: "cancel", onPress: () => setShowMonthlyLimitAlert(false) },
          {
            text: t("getUnlimited"),
            onPress: () => {
              setShowMonthlyLimitAlert(false);
              router.push("/paywall");
            },
          },
        ]}
      />
      <AppAlert
        visible={showWebPreviewNudgeAlert}
        title={t("webPreviewLimitation")}
        message={t("webPreviewNudge")}
        onRequestClose={() => setShowWebPreviewNudgeAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowWebPreviewNudgeAlert(false) }]}
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
  wrap: {
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  sectionSub: {
    ...typography.badge,
    color: colors.textSecondary,
    opacity: 0.95,
    marginTop: -4,
  },
  quotaBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quotaBadgeEmpty: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  quotaText: {
    ...typography.badge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  quotaTextEmpty: {
    color: colors.accent,
    fontFamily: fonts.bodyBold,
  },
  toneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
    marginBottom: -spacing.sm,
  },
  toneBtn: {
    flexGrow: 1,
    flexBasis: "48%",
    marginHorizontal: spacing.xs,
    marginBottom: spacing.sm,
    minHeight: touchTarget.min + 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  toneBtnIdle: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toneBtnActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  toneBtnPressed: {
    opacity: 0.88,
  },
  toneEmoji: {
    ...typography.stepper,
  },
  toneLabel: {
    ...typography.badge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  toneLabelActive: {
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
  },
  preview: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.accentSoft,
    gap: spacing.xs,
  },
  previewLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  contextSmall: {
    ...typography.badge,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  previewText: {
    ...typography.body,
    fontFamily: fonts.mono,
    color: colors.textPrimary,
  },
  secondaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-start",
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.min,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
  },
  secondaryBtnPressed: {
    opacity: 0.88,
  },
  secondaryBtnText: {
    ...typography.body,
    color: colors.accent,
    fontFamily: fonts.bodySemiBold,
  },
  sendBtn: {
    minHeight: touchTarget.min,
    borderRadius: radii.lg,
    borderWidth: 0,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    marginTop: -2,
    shadowColor: colors.shadow,
    shadowOpacity: colors.cardShadowOpacity,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sendBtnPressed: {
    opacity: 0.88,
  },
  sendBtnDisabled: {
    opacity: 0.5,
    borderColor: colors.border,
  },
  sendBtnText: {
    ...typography.badge,
    color: colors.pillActiveText,
    fontFamily: fonts.bodySemiBold,
  },
  sendBtnTextDisabled: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },
  });
}
