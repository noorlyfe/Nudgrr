import { memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { getLocalizedReceiptTonePack } from "../constants/receiptTone";
import { NUDGE_TEMPLATES, fillNudgeTemplate } from "../constants/messages";
import { fonts, getReceiptColors, radii, receipt, spacing } from "../constants/theme";
import type { SplitRecord } from "../hooks/useSplitHistory";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import { formatCurrency } from "../lib/currency";
import { ReceiptCustomFooter } from "./ReceiptCustomFooter";
import { resolveReceiptFooterText } from "../lib/receiptFooter";
import { rtlRow } from "../lib/rtl";

export type OverdueReceiptCardProps = {
  width: number;
  record: SplitRecord;
  daysOverdue: number;
  dateLabel: string;
  isPro: boolean;
  hideReceiptBranding?: boolean;
  customFooter?: string;
  /** When set, shown in the message box instead of auto-escalated template text. */
  previewText?: string;
  /** Waiting Game reminder capture: tighter vertical spacing. */
  compact?: boolean;
};

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Level-2 reminder: funny/casual → passive; passive → serious; serious → blunt serious pool. */
function pickEscalatedTemplate(record: SplitRecord, daysOverdue: number): string {
  const orig = record.nudgeTone ?? "funny";
  const list =
    orig === "serious" || orig === "passiveAggressive"
      ? NUDGE_TEMPLATES.serious
      : NUDGE_TEMPLATES.passiveAggressive;
  const h = simpleHash(`${record.id}:${daysOverdue}`);
  if (orig === "serious") {
    const bluntStart = Math.max(0, list.length - 14);
    const span = Math.max(1, list.length - bluntStart);
    return list[bluntStart + (h % span)] ?? list[list.length - 1]!;
  }
  return list[h % list.length] ?? list[0]!;
}

const OVERDUE_RED = "#E5484D";

function DashedRule({ w, color, compact = false }: { w: number; color: string; compact?: boolean }) {
  return <View style={[styles.dashedRule, compact && styles.dashedRuleCompact, { width: w, borderColor: color }]} />;
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

function receiptColorsForTheme(isDark: boolean) {
  return getReceiptColors(isDark);
}

export const OverdueReceiptCard = memo(function OverdueReceiptCard({
  width,
  record,
  daysOverdue,
  dateLabel,
  isPro = false,
  hideReceiptBranding = false,
  customFooter = "",
  previewText,
  compact = false,
}: OverdueReceiptCardProps) {
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const colors = useMemo(() => receiptColorsForTheme(isDark), [isDark]);
  const showBranding = !(isPro && hideReceiptBranding);
  const footerText = useMemo(
    () => resolveReceiptFooterText(isPro, customFooter),
    [customFooter, isPro]
  );
  const originalTone = record.nudgeTone ?? "funny";
  const pack = useMemo(() => getLocalizedReceiptTonePack(originalTone, t), [originalTone, t]);
  const title = record.restaurant.trim() || t("dinner");
  const currencyCode = record.currency ?? "USD";
  const amountFormatted = useMemo(
    () => formatCurrency(record.totalPerPerson, currencyCode),
    [currencyCode, record.totalPerPerson]
  );
  const reminderBody = useMemo(() => {
    if (previewText != null && previewText.length > 0) {
      return previewText;
    }
    return fillNudgeTemplate(pickEscalatedTemplate(record, daysOverdue), amountFormatted);
  }, [amountFormatted, daysOverdue, previewText, record]);

  const tipPctLabel =
    Math.abs(record.tipPercent - Math.round(record.tipPercent)) < 0.001
      ? `${Math.round(record.tipPercent)}`
      : `${record.tipPercent}`;

  const overduePillLabel =
    daysOverdue === 0
      ? t("dueToday")
      : daysOverdue === 1
        ? t("oneDayOverdue")
        : t("daysOverdue", { days: daysOverdue });

  const CARD_PAD_H = 24;
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

        <View style={[styles.fillColumn, compact && styles.fillColumnCompact]}>
          <View style={[styles.topSection, compact && styles.topSectionCompact]}>
            <View style={[styles.stampRow, compact && styles.stampRowCompact]}>
              <View style={styles.stamp}>
                <Text style={styles.stampText}>{t("reminder2")}</Text>
              </View>
            </View>

            <View style={[styles.header, compact && styles.headerCompact]}>
              <Text style={[styles.brand, { color: colors.text }]}>Nudgrr</Text>
              <Text style={[styles.tagline, { color: colors.muted }]}>{pack.tagline}</Text>
              <Text style={[styles.date, { color: colors.muted }]}>{dateLabel}</Text>
              <Text style={[styles.dateFlavor, { color: colors.muted }]}>{pack.dateFlavor}</Text>
            </View>

            <View style={[styles.noticeHeader, compact && styles.noticeHeaderCompact]}>
              <Text style={styles.secondNoticeLabel}>{t("secondNoticeHeader")}</Text>
              <Text style={[styles.restaurant, { color: colors.text }]} numberOfLines={3}>
                {title}
              </Text>
            </View>

            <View
              style={[
                styles.messageBox,
                compact && styles.messageBoxCompact,
                { borderColor: colors.divider, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={10}>
                {reminderBody}
              </Text>
            </View>
          </View>

          <View style={[styles.midSection, compact && styles.midSectionCompact]}>
            <DashedRule w={ruleWidth} color={colors.divider} compact={compact} />

            <View style={[styles.padH, compact && styles.padHCompact]}>
              <View style={[styles.row, rtlRow(isRTL)]}>
                <Text style={[styles.lineLabel, { color: colors.muted }]}>{pack.billLabel}</Text>
                <Text style={[styles.lineVal, styles.amountRed]}>
                  {formatCurrency(record.billAmount, currencyCode)}
                </Text>
              </View>
              <View style={[styles.row, rtlRow(isRTL)]}>
                <Text style={[styles.lineLabel, { color: colors.muted }]}>
                  {pack.tipLabel(tipPctLabel)}
                </Text>
                <Text style={[styles.lineVal, styles.amountRed]}>
                  {formatCurrency(record.tipAmount, currencyCode)}
                </Text>
              </View>
              <View style={[styles.row, rtlRow(isRTL)]}>
                <Text style={[styles.lineLabelStrong, { color: colors.text }]}>{pack.totalLabel}</Text>
                <Text style={[styles.lineValStrong, styles.amountRed]}>
                  {formatCurrency(record.totalAmount, currencyCode)}
                </Text>
              </View>
            </View>

            <DashedRule w={ruleWidth} color={colors.divider} compact={compact} />

            <View
              style={[
                styles.padH,
                compact && styles.padHCompact,
                styles.splitBox,
                compact && styles.splitBoxCompact,
                { borderColor: colors.divider, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.eachLabel, { color: colors.muted }]}>{pack.eachTitle}</Text>
              <View style={[styles.amountRow, rtlRow(isRTL)]}>
                <Text style={[styles.eachAmount, styles.amountRed]}>
                  {formatCurrency(record.totalPerPerson, currencyCode)}
                </Text>
                <View style={styles.overduePill}>
                  <Text style={styles.overduePillText}>{overduePillLabel}</Text>
                </View>
              </View>
              <Text style={[styles.splitMeta, { color: colors.muted }]}>{pack.splitCaption(record.people)}</Text>
            </View>
          </View>

          <View style={[styles.bottomSection, compact && styles.bottomSectionCompact]}>
            <ReceiptCustomFooter text={footerText} color={colors.muted} />
            {showBranding ? (
              <Text style={[styles.madeWith, { color: colors.muted }]}>Made with Nudgrr</Text>
            ) : null}
          </View>
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
  bodyCompact: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  body: {
    position: "relative",
    paddingVertical: 32,
    paddingHorizontal: 24,
    overflow: "hidden",
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
    textTransform: "uppercase" as const,
  },
  fillColumn: {
    flexShrink: 0,
    zIndex: 1,
    gap: spacing.lg,
  },
  fillColumnCompact: {
    gap: spacing.sm,
  },
  topSection: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xl,
    marginBottom: spacing.sm,
  },
  topSectionCompact: {
    gap: spacing.md,
    marginBottom: 0,
  },
  midSection: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  midSectionCompact: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: spacing.xl,
    paddingTop: spacing.sm,
  },
  bottomSectionCompact: {
    minHeight: 0,
    paddingTop: 0,
  },
  stampRow: {
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  stampRowCompact: {
    minHeight: 36,
    marginBottom: 0,
  },
  stamp: {
    borderWidth: 3,
    borderColor: OVERDUE_RED,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    transform: [{ rotate: "-8deg" }],
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  stampText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1.2,
    color: OVERDUE_RED,
  },
  header: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  headerCompact: {
    marginBottom: 0,
  },
  noticeHeader: {
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  noticeHeaderCompact: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: 0,
  },
  secondNoticeLabel: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 2,
    color: OVERDUE_RED,
    textAlign: "center",
    textTransform: "uppercase" as const,
  },
  brand: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    color: receipt.text,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  tagline: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 11,
    color: receipt.branding,
    textAlign: "center",
    marginTop: 4,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: receipt.branding,
    textAlign: "center",
    marginTop: 8,
  },
  dateFlavor: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: receipt.branding,
    textAlign: "center",
    marginTop: 4,
    opacity: 0.9,
  },
  restaurant: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 15,
    color: receipt.text,
    textAlign: "center",
  },
  messageBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  messageBoxCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  messageText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  dashedRule: {
    alignSelf: "center",
    borderStyle: "dashed",
    borderTopWidth: 1,
    marginVertical: spacing.sm,
  },
  dashedRuleCompact: {
    marginVertical: spacing.xs,
  },
  amountRed: {
    color: OVERDUE_RED,
  },
  padH: { width: "100%", gap: spacing.md },
  padHCompact: {
    gap: spacing.sm,
  },
  splitBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xs,
  },
  splitBoxCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: 0,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineLabel: {
    fontFamily: fonts.mono,
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  lineLabelStrong: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  lineVal: {
    fontFamily: fonts.mono,
    fontSize: 13,
  },
  lineValStrong: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 13,
  },
  eachLabel: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  eachAmount: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 26,
    letterSpacing: -1,
    textAlign: "center",
  },
  overduePill: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: "rgba(192, 57, 43, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(192, 57, 43, 0.45)",
  },
  overduePillText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 9,
    letterSpacing: 0.8,
    color: OVERDUE_RED,
    textTransform: "uppercase" as const,
  },
  splitMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  madeWith: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 4,
  },
});
