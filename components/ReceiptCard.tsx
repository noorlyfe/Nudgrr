import { memo, useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Platform, StyleSheet, Text, View } from "react-native";

import { getLocalizedReceiptTonePack } from "../constants/receiptTone";
import type { NudgeTone } from "../constants/messages";
import { fonts, getReceiptColors, radii, spacing, typography } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import { formatCurrency } from "../lib/currency";
import { ReceiptCustomFooter } from "./ReceiptCustomFooter";
import { resolveReceiptFooterText } from "../lib/receiptFooter";
import { rtlRow } from "../lib/rtl";

export type ReceiptCardProps = {
  width: number;
  restaurantLabel: string;
  dateLabel: string;
  billAmount: number;
  tipPercent: number;
  tipAmount: number;
  totalAmount: number;
  totalPerPerson: number;
  people: number;
  isPro: boolean;
  hideReceiptBranding?: boolean;
  customFooter: string;
  tone: NudgeTone;
  currencyCode: string;
  previewText?: string;
  zigzagHorizontalOnly?: boolean;
};

type ReceiptColors = {
  background: string;
  text: string;
  accent: string;
  divider: string;
  muted: string;
  surface: string;
};

function receiptColorsForTheme(isDark: boolean): ReceiptColors {
  return getReceiptColors(isDark);
}

function DashedRule({ color }: { color: string }) {
  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: color,
        borderStyle: "dashed",
        marginVertical: 10,
        width: "100%",
      }}
    />
  );
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

export function receiptShareHeight(width: number): number {
  return (width * 16) / 9;
}

export function receiptCaptureOuterWidth(width: number): number {
  return width;
}

export const ReceiptCard = memo(function ReceiptCard({
  width,
  restaurantLabel,
  dateLabel,
  billAmount,
  tipPercent,
  tipAmount,
  totalAmount,
  totalPerPerson,
  people,
  isPro,
  hideReceiptBranding = false,
  customFooter,
  tone,
  currencyCode,
  previewText,
}: ReceiptCardProps) {
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const pack = useMemo(() => getLocalizedReceiptTonePack(tone, t), [tone, t]);
  const colors = useMemo(() => receiptColorsForTheme(isDark), [isDark]);

  const title = restaurantLabel.trim() || t("dinner");
  const tipPctLabel =
    Math.abs(tipPercent - Math.round(tipPercent)) < 0.001
      ? `${Math.round(tipPercent)}`
      : `${tipPercent}`;

  const footerText = useMemo(
    () => resolveReceiptFooterText(isPro, customFooter),
    [customFooter, isPro]
  );

  const showBranding = !(isPro && hideReceiptBranding);

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

      <View style={styles.inner}>
        <View style={styles.header}>
          {showBranding ? (
            <>
              <Text style={[styles.brand, { color: colors.text }]}>NUDGRR</Text>
              <Text style={[styles.tagline, { color: colors.muted }]}>{pack.tagline}</Text>
            </>
          ) : (
            <Text style={[styles.titleMain, { color: colors.text }]}>{title}</Text>
          )}
          <Text style={[styles.date, { color: colors.muted }]}>{dateLabel}</Text>
          <Text style={[styles.dateFlavor, { color: colors.muted }]}>{pack.dateFlavor}</Text>
        </View>

        <DashedRule color={colors.divider} />

        {showBranding ? (
          <Text style={[styles.restaurantName, { color: colors.text }]}>{title}</Text>
        ) : null}

        <View style={[styles.messageBox, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={8}>
            {previewText ?? ""}
          </Text>
        </View>

        <DashedRule color={colors.divider} />

        <View style={styles.lineItems}>
          <View style={[styles.row, rtlRow(isRTL)]}>
            <Text style={[styles.lineLabel, { color: colors.muted }]}>{pack.billLabel}</Text>
            <Text style={[styles.lineVal, { color: colors.text }]}>
              {formatCurrency(billAmount, currencyCode)}
            </Text>
          </View>
          <View style={[styles.row, rtlRow(isRTL)]}>
            <Text style={[styles.lineLabel, { color: colors.muted }]}>
              {pack.tipLabel(tipPctLabel)}
            </Text>
            <Text style={[styles.lineVal, { color: colors.text }]}>
              {formatCurrency(tipAmount, currencyCode)}
            </Text>
          </View>
          <View style={[styles.row, rtlRow(isRTL)]}>
            <Text style={[styles.lineLabelBold, { color: colors.text }]}>{pack.totalLabel}</Text>
            <Text style={[styles.lineValBold, { color: colors.text }]}>
              {formatCurrency(totalAmount, currencyCode)}
            </Text>
          </View>
        </View>

        <DashedRule color={colors.divider} />

        <View style={[styles.shareBox, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
          <Text style={[styles.shareLabel, { color: colors.muted }]}>{pack.eachTitle}</Text>
          <Text style={[styles.shareAmount, { color: colors.accent }]}>
            {formatCurrency(totalPerPerson, currencyCode)}
          </Text>
          <Text style={[styles.shareMeta, { color: colors.muted }]}>
            {pack.splitCaption(people)}
          </Text>
        </View>

        <DashedRule color={colors.divider} />

        <ReceiptCustomFooter text={footerText} color={colors.muted} />

        {showBranding ? (
          <Text style={[styles.madeWith, { color: colors.muted }]}>
            Made with Nudgrr
          </Text>
        ) : null}
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
  inner: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  header: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  brand: {
    fontFamily: fonts.mono,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: "center",
  },
  titleMain: {
    fontFamily: fonts.mono,
    fontSize: 18,
    letterSpacing: 1,
    textAlign: "center",
  },
  tagline: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 2,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
  },
  dateFlavor: {
    fontFamily: fonts.mono,
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
    opacity: 0.8,
  },
  restaurantName: {
    fontFamily: fonts.mono,
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 10,
  },
  messageBox: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  messageText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 17,
  },
  lineItems: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    flex: 1,
  },
  lineVal: {
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  lineLabelBold: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
  },
  lineValBold: {
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "500",
  },
  shareBox: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: "center",
    gap: 4,
  },
  shareLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  shareAmount: {
    fontFamily: fonts.mono,
    fontSize: 32,
    fontWeight: "500",
    letterSpacing: -1,
    marginTop: 4,
  },
  shareMeta: {
    fontFamily: fonts.mono,
    fontSize: 9,
    marginTop: 2,
  },
  madeWith: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 4,
  },
});
