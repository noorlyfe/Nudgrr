import { useCallback, useMemo, useState } from "react";
import { Alert, Platform, Share, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import {
  FREE_NUDGES_PER_MONTH,
  NUDGE_TEMPLATES,
  NUDGE_TONE_OPTIONS,
  type NudgeTone,
  buildFullNudgeMessage,
  fillNudgeTemplate,
} from "../constants/messages";
import { colors, radii, spacing, touchTarget, typography } from "../constants/theme";
import { useNudgeQuota } from "../hooks/useNudgeQuota";
import { trackEvent } from "../lib/analytics";
import { formatUsd } from "../hooks/useTipCalculator";

type NudgeSectionProps = {
  hasBill: boolean;
  totalPerPerson: number;
  restaurant: string;
  isPro: boolean;
  tone: NudgeTone;
  onToneChange: (t: NudgeTone) => void;
};

type ToneCycleState = {
  order: number[];
  position: number;
  lastIndex: number | null;
};

function shuffledIndices(length: number, avoidFirst: number | null = null): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (avoidFirst !== null && arr.length > 1 && arr[0] === avoidFirst) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}

function createInitialCycles(): Record<NudgeTone, ToneCycleState> {
  return {
    funny: {
      order: shuffledIndices(NUDGE_TEMPLATES.funny.length),
      position: 0,
      lastIndex: null,
    },
    casual: {
      order: shuffledIndices(NUDGE_TEMPLATES.casual.length),
      position: 0,
      lastIndex: null,
    },
    passiveAggressive: {
      order: shuffledIndices(NUDGE_TEMPLATES.passiveAggressive.length),
      position: 0,
      lastIndex: null,
    },
    serious: {
      order: shuffledIndices(NUDGE_TEMPLATES.serious.length),
      position: 0,
      lastIndex: null,
    },
  };
}

export function NudgeSection({
  hasBill,
  totalPerPerson,
  restaurant,
  isPro,
  tone,
  onToneChange,
}: NudgeSectionProps) {
  const router = useRouter();
  const { remainingFree, canSendFree, loading, recordSend } = useNudgeQuota(isPro);
  /**
   * Each tone has its own shuffled cycle:
   * - Regenerate moves chronologically through the current shuffled order.
   * - After a full round, a new shuffled order is created (no immediate repeat first item).
   */
  const [toneCycles, setToneCycles] = useState<Record<NudgeTone, ToneCycleState>>(
    createInitialCycles
  );

  const amountFormatted = useMemo(() => formatUsd(totalPerPerson), [totalPerPerson]);

  const templateIndex = useMemo(() => {
    const list = NUDGE_TEMPLATES[tone];
    const cycle = toneCycles[tone];
    if (!cycle || list.length === 0) {
      return 0;
    }
    return cycle.order[cycle.position] ?? 0;
  }, [tone, toneCycles]);

  const rawBody = useMemo(() => {
    const list = NUDGE_TEMPLATES[tone];
    const t = list[templateIndex];
    return fillNudgeTemplate(t, amountFormatted);
  }, [amountFormatted, templateIndex, tone]);

  const fullMessage = useMemo(
    () => buildFullNudgeMessage(rawBody, !isPro),
    [isPro, rawBody]
  );

  const contextLabel = restaurant.trim();

  const advanceToneMessage = useCallback((targetTone: NudgeTone) => {
    setToneCycles((prev) => {
      const current = prev[targetTone];
      const listLength = NUDGE_TEMPLATES[targetTone].length;
      if (!current || listLength === 0) {
        return prev;
      }

      const currentIndex = current.order[current.position] ?? 0;
      const nextPosition = current.position + 1;

      if (nextPosition < current.order.length) {
        return {
          ...prev,
          [targetTone]: {
            ...current,
            position: nextPosition,
            lastIndex: currentIndex,
          },
        };
      }

      return {
        ...prev,
        [targetTone]: {
          order: shuffledIndices(listLength, currentIndex),
          position: 0,
          lastIndex: currentIndex,
        },
      };
    });
  }, []);

  const onPickTone = useCallback(
    (t: NudgeTone) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (t === tone) {
        advanceToneMessage(t);
        return;
      }
      onToneChange(t);
    },
    [advanceToneMessage, onToneChange, tone]
  );

  const onRegenerate = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void trackEvent("nudge_regenerate");
    advanceToneMessage(tone);
  }, [advanceToneMessage, tone]);

  const onSendNudge = useCallback(async () => {
    if (!hasBill) {
      return;
    }
    if (!isPro && !canSendFree) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Monthly nudge limit",
        `The free plan includes ${FREE_NUDGES_PER_MONTH} nudges per month. Unlimited is $4.99/month in the app.`,
        [
          { text: "Not now", style: "cancel" },
          { text: "Get Unlimited", onPress: () => router.push("/paywall") },
        ]
      );
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
        } else {
          Alert.alert(
            "Web preview limitation",
            "Text reminders are fully supported in the iOS/Android app. On desktop web, copy manually for now."
          );
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const result = await Share.share({ message: fullMessage, title: "Your share" });
      if (result.action === Share.sharedAction) {
        if (!isPro) {
          await recordSend();
        }
        void trackEvent("nudge_sent");
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = e instanceof Error ? e.message : "Could not open share sheet.";
      Alert.alert("Share failed", msg);
    }
  }, [canSendFree, fullMessage, hasBill, isPro, recordSend, router]);

  if (!hasBill) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>Send a Nudge</Text>
      <Text style={styles.sectionSub}>Your receipt uses this vibe too — go wild, then share.</Text>
      {!isPro ? (
        <Text style={styles.hint}>
          {loading
          ? "…"
          : `${remainingFree} of ${FREE_NUDGES_PER_MONTH} free nudges left this month · “Sent via Nudgrr” on each message`}
        </Text>
      ) : null}

      <View style={styles.toneGrid}>
        {NUDGE_TONE_OPTIONS.map((opt) => {
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
              accessibilityLabel={`${opt.label} tone`}
            >
              <Text style={styles.toneEmoji}>{opt.emoji}</Text>
              <Text style={[styles.toneLabel, active && styles.toneLabelActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewLabel}>Preview</Text>
        {contextLabel ? <Text style={styles.contextSmall}>From: {contextLabel}</Text> : null}
        <Text style={styles.previewText}>{rawBody}</Text>
      </View>

      <View style={styles.secondaryRow}>
        <Pressable
          onPress={onRegenerate}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Regenerate message"
        >
          <Text style={styles.secondaryBtnText}>Regenerate</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => void onSendNudge()}
        style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel="Send text reminder"
      >
        <Text style={styles.sendBtnText}>Send text reminder</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    ...typography.label,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 1.4,
  },
  sectionSub: {
    ...typography.badge,
    fontSize: 11,
    color: colors.textSecondary,
    opacity: 0.95,
    lineHeight: 16,
    marginTop: -4,
  },
  hint: {
    ...typography.badge,
    color: colors.textSecondary,
    lineHeight: 16,
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
    borderRadius: radii.md,
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
    backgroundColor: colors.surface,
  },
  toneBtnPressed: {
    opacity: 0.88,
  },
  toneEmoji: {
    fontSize: 22,
  },
  toneLabel: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  toneLabelActive: {
    color: colors.accent,
    fontFamily: "SpaceMono_700Bold",
  },
  preview: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  previewLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  contextSmall: {
    ...typography.badge,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  previewText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
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
    minHeight: 40,
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
    fontSize: 13,
    color: colors.accent,
    fontFamily: "SpaceMono_700Bold",
  },
  sendBtn: {
    minHeight: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    marginTop: -2,
  },
  sendBtnPressed: {
    opacity: 0.88,
  },
  sendBtnText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
