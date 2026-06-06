import { memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { NudgeTone } from "../constants/messages";
import { getLocalizedReceiptTonePack } from "../constants/receiptTone";
import { fonts, getReceiptColors, spacing } from "../constants/theme";
import type { ProjectWaitingEntry } from "../hooks/useProjects";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import { formatCurrency } from "../lib/currency";
import { buildProjectReminderMessage } from "../lib/projectReminders";
import { ReceiptCustomFooter } from "./ReceiptCustomFooter";
import { resolveReceiptFooterText } from "../lib/receiptFooter";
import { rtlRow } from "../lib/rtl";

export type ProjectOverdueReceiptCardProps = {
  width: number;
  entry: ProjectWaitingEntry;
  daysOverdue: number;
  dateLabel: string;
  currencyCode: string;
  nudgeTone: NudgeTone;
  isPro: boolean;
  hideReceiptBranding?: boolean;
  customFooter?: string;
  compact?: boolean;
};

const OVERDUE_RED = "#E5484D";

function receiptColorsForTheme(isDark: boolean) {
  return getReceiptColors(isDark);
}

function PerforationEdge({ width, color, position }: { width: number; color: string; position: "top" | "bottom" }) {
  const circles = Math.floor(width / 12);
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        paddingHorizontal: 6,
        marginTop: position === "bottom" ? 12 : 0,
        marginBottom: position === "top" ? 12 : 0,
      }}
    >
      {Array.from({ length: circles }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
            opacity: 0.4,
          }}
        />
      ))}
    </View>
  );
}

export const ProjectOverdueReceiptCard = memo(function ProjectOverdueReceiptCard({
  width,
  entry,
  daysOverdue,
  dateLabel,
  currencyCode,
  nudgeTone,
  isPro,
  hideReceiptBranding = false,
  customFooter = "",
  compact = false,
}: ProjectOverdueReceiptCardProps) {
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const colors = useMemo(() => receiptColorsForTheme(isDark), [isDark]);
  const showBranding = !(isPro && hideReceiptBranding);
  const footerText = useMemo(
    () => resolveReceiptFooterText(isPro, customFooter),
    [customFooter, isPro]
  );
  const pack = useMemo(() => getLocalizedReceiptTonePack(nudgeTone, t), [nudgeTone, t]);
  const amountFormatted = formatCurrency(entry.amount, currencyCode);
  const projectTitle = entry.projectName.trim() || t("projectDefaultName");

  const reminderBody = useMemo(
    () =>
      buildProjectReminderMessage(t, nudgeTone, daysOverdue, {
        amount: amountFormatted,
        project: projectTitle,
        payee: entry.toParticipantName,
      }),
    [amountFormatted, daysOverdue, entry.toParticipantName, nudgeTone, projectTitle, t]
  );

  const overduePillLabel =
    daysOverdue === 0
      ? t("dueToday")
      : daysOverdue === 1
        ? t("oneDayOverdue")
        : t("daysOverdue", { days: daysOverdue });

  const CARD_PAD_H = compact ? 20 : 24;
  const ruleWidth = Math.max(40, width - CARD_PAD_H * 2);

  return (
    <View
      style={[
        styles.root,
        {
          width,
          backgroundColor: colors.background,
          borderColor: colors.divider,
        },
      ]}
    >
      <PerforationEdge width={width} color={colors.muted} position="top" />
      <View style={[styles.body, compact && styles.bodyCompact, { width }]}>
        <View style={styles.watermarkLayer} pointerEvents="none">
          <View style={styles.watermarkStamp}>
            <Text style={styles.watermarkStampText}>{t("pastDue")}</Text>
          </View>
        </View>

        <View style={[styles.column, compact && styles.columnCompact]}>
          <View style={styles.stamp}>
            <Text style={styles.stampText}>{t("reminder2")}</Text>
          </View>

          <Text style={[styles.brand, { color: colors.text }]}>Nudgrr</Text>
          <Text style={[styles.tagline, { color: colors.muted }]}>{pack.tagline}</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{dateLabel}</Text>

          <Text style={styles.secondNoticeLabel}>{t("secondNoticeHeader")}</Text>
          <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={3}>
            {projectTitle}
          </Text>
          <Text style={[styles.debtorLine, { color: colors.muted }]}>
            {t("projectOverdueDebtor", { name: entry.participantName })}
          </Text>

          <View style={[styles.messageBox, { borderColor: colors.divider, backgroundColor: colors.surface }]}>
            <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={10}>
              {reminderBody}
            </Text>
          </View>

          <View style={[styles.dashedRule, { width: ruleWidth, borderColor: colors.divider }]} />

          <View style={[styles.amountBox, { borderColor: colors.divider, backgroundColor: colors.surface }]}>
            <Text style={[styles.amountLabel, { color: colors.muted }]}>{t("projectOverdueAmountLabel")}</Text>
            <View style={[styles.amountRow, rtlRow(isRTL)]}>
              <Text style={styles.amountValue}>{amountFormatted}</Text>
              <View style={styles.overduePill}>
                <Text style={styles.overduePillText}>{overduePillLabel}</Text>
              </View>
            </View>
            <Text style={[styles.payeeLine, { color: colors.muted }]}>
              {t("projectOverduePayee", { name: entry.toParticipantName })}
            </Text>
          </View>

          <ReceiptCustomFooter text={footerText} color={colors.muted} />
          {showBranding ? (
            <Text style={[styles.madeWith, { color: colors.muted }]}>Made with Nudgrr</Text>
          ) : null}
        </View>
      </View>
      <PerforationEdge width={width} color={colors.muted} position="bottom" />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignSelf: "center",
    flexShrink: 0,
    borderWidth: 0.5,
    borderRadius: 4,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  body: {
    position: "relative",
    paddingVertical: 28,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  bodyCompact: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
    opacity: 0.08,
  },
  watermarkStamp: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    borderColor: OVERDUE_RED,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "15deg" }],
  },
  watermarkStampText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1.6,
    color: OVERDUE_RED,
    textTransform: "uppercase",
  },
  column: {
    zIndex: 1,
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
  },
  columnCompact: {
    gap: spacing.sm,
  },
  stamp: {
    borderWidth: 3,
    borderColor: OVERDUE_RED,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ rotate: "-4deg" }],
  },
  stampText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 2,
    color: OVERDUE_RED,
    textTransform: "uppercase",
  },
  brand: {
    fontFamily: fonts.mono,
    fontSize: 22,
    letterSpacing: 3,
    marginTop: spacing.xs,
  },
  tagline: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1,
    textAlign: "center",
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
  },
  secondNoticeLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: OVERDUE_RED,
    marginTop: spacing.sm,
  },
  projectTitle: {
    fontFamily: fonts.mono,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 1,
    textAlign: "center",
  },
  debtorLine: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
  },
  messageBox: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 12,
    marginTop: spacing.xs,
  },
  messageText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  dashedRule: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    marginVertical: spacing.sm,
  },
  amountBox: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  amountLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  amountValue: {
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: "600",
    color: OVERDUE_RED,
  },
  overduePill: {
    borderWidth: 1,
    borderColor: OVERDUE_RED,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overduePillText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: OVERDUE_RED,
    textTransform: "uppercase",
  },
  payeeLine: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
  },
  madeWith: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
});
