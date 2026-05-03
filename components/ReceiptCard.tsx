import { memo, useMemo } from "react";
import { StyleSheet, Text, View, type TextStyle } from "react-native";
import Svg, { Defs, FeTurbulence, Filter, G, Path, Rect } from "react-native-svg";

import { getReceiptTonePack } from "../constants/receiptTone";
import type { NudgeTone } from "../constants/messages";
import { receipt } from "../constants/theme";
import { formatUsd } from "../hooks/useTipCalculator";

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
  customFooter: string;
  tone: NudgeTone;
};

type ToneAppearance = {
  paperBg: string;
  paperOpacity: number;
  textColor: string;
  brandColor: string;
  dashOpacity: number;
  accentBg: string;
  accentBorder: string;
  footerMutedColor: string;
};

function jaggedTopCapPath(width: number): string {
  const base = 10;
  const alt = 4;
  const steps = Math.max(16, Math.floor(width / 10));
  const parts: string[] = ["M0,0", `L${width},0`, `L${width},${base}`];
  for (let i = steps; i >= 0; i--) {
    const x = (width * i) / steps;
    const y = i % 2 === 0 ? alt : base;
    parts.push(`L${x.toFixed(1)},${y}`);
  }
  parts.push("L0,0", "Z");
  return parts.join(" ");
}

function DashedRule({ w, color, opacity }: { w: number; color: string; opacity: number }) {
  return (
    <View style={[styles.rule, { width: w, opacity }]}>
      {Array.from({ length: Math.floor(w / 10) }).map((_, i) => (
        <View key={i} style={[styles.ruleDash, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

function taglineStyleForTone(tone: NudgeTone): TextStyle {
  switch (tone) {
    case "funny":
      return { fontSize: 12, marginTop: 6, lineHeight: 16 };
    case "casual":
      return { fontSize: 11, marginTop: 6, opacity: 0.92, letterSpacing: 0.5 };
    case "passiveAggressive":
      return { fontSize: 10, marginTop: 6, fontStyle: "italic", lineHeight: 14 };
    case "serious":
      return { fontSize: 9, marginTop: 8, letterSpacing: 1.4, textTransform: "uppercase" as const };
    default:
      return {};
  }
}

function brandLineForTone(tone: NudgeTone): string {
  switch (tone) {
    case "funny":
      return "Nudgrr";
    case "casual":
      return "nudgrr";
    case "passiveAggressive":
      return "Nudgrr";
    case "serious":
      return "NUDGRR";
    default:
      return "Nudgrr";
  }
}

function toneAppearanceForTone(tone: NudgeTone): ToneAppearance {
  switch (tone) {
    case "funny":
      return {
        paperBg: "#FFF7DC",
        paperOpacity: 0.18,
        textColor: "#4A3712",
        brandColor: "#8B6A23",
        dashOpacity: 0.75,
        accentBg: "#FFF1C2",
        accentBorder: "#D6B567",
        footerMutedColor: "#9D8752",
      };
    case "casual":
      return {
        paperBg: "#F5F4EE",
        paperOpacity: 0.12,
        textColor: "#2F302F",
        brandColor: "#6D716A",
        dashOpacity: 0.5,
        accentBg: "#ECEBE3",
        accentBorder: "#CACDC1",
        footerMutedColor: "#7C8178",
      };
    case "passiveAggressive":
      return {
        paperBg: "#FCF4F7",
        paperOpacity: 0.15,
        textColor: "#3B2A34",
        brandColor: "#7B5C6C",
        dashOpacity: 0.56,
        accentBg: "#F8E9F0",
        accentBorder: "#D8B5C5",
        footerMutedColor: "#8A6A79",
      };
    case "serious":
      return {
        paperBg: "#EFEFEE",
        paperOpacity: 0.1,
        textColor: "#1A1A1A",
        brandColor: "#4E4E4E",
        dashOpacity: 0.42,
        accentBg: "#E7E7E7",
        accentBorder: "#B9B9B9",
        footerMutedColor: "#636363",
      };
    default:
      return {
        paperBg: receipt.background,
        paperOpacity: 0.14,
        textColor: receipt.text,
        brandColor: receipt.branding,
        dashOpacity: 0.55,
        accentBg: "#F2F2EC",
        accentBorder: "#D1D1C7",
        footerMutedColor: receipt.branding,
      };
  }
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
  customFooter,
  tone,
}: ReceiptCardProps) {
  const pack = useMemo(() => getReceiptTonePack(tone), [tone]);
  const look = useMemo(() => toneAppearanceForTone(tone), [tone]);
  const title = restaurantLabel.trim() || "Dinner";
  const tipPctLabel =
    Math.abs(tipPercent - Math.round(tipPercent)) < 0.001 ? `${Math.round(tipPercent)}` : `${tipPercent}`;

  const footerText = useMemo(() => {
    if (isPro) {
      return customFooter.trim();
    }
    return pack.freeFooter;
  }, [customFooter, isPro, pack.freeFooter]);

  const topPath = useMemo(() => jaggedTopCapPath(width), [width]);
  const restaurantLine =
    tone === "funny"
      ? `📍 ${title}`
      : tone === "passiveAggressive"
        ? `Regarding: ${title}`
        : tone === "serious"
          ? `Establishment: ${title}`
          : title;

  return (
    <View style={[styles.root, { width }]}>
      <Svg width={width} height={12} viewBox={`0 0 ${width} 12`}>
        <Path d={topPath} fill={look.paperBg} />
      </Svg>

      <View style={[styles.body, { width, backgroundColor: look.paperBg }]}>
        <View style={styles.textureWrap} pointerEvents="none">
          <Svg width={width} height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <Filter id="paperGrain" x="-20%" y="-20%" width="140%" height="140%">
                <FeTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="8" />
              </Filter>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={width}
              height={720}
              fill={look.paperBg}
              filter="url(#paperGrain)"
              opacity={look.paperOpacity}
            />
          </Svg>
        </View>

        <Text style={[styles.brand, { color: look.textColor }]}>{brandLineForTone(tone)}</Text>
        <Text style={[styles.tagline, taglineStyleForTone(tone), { color: look.textColor }]}>{pack.tagline}</Text>
        <Text style={[styles.date, { color: look.brandColor }]}>{dateLabel}</Text>
        <Text
          style={[styles.dateFlavor, tone === "serious" && styles.dateFlavorSerious, { color: look.brandColor }]}
        >
          {pack.dateFlavor}
        </Text>
        <Text
          style={[styles.restaurant, tone === "funny" && styles.restaurantFunny, { color: look.textColor }]}
          numberOfLines={3}
        >
          {restaurantLine}
        </Text>

        <DashedRule w={width - 40} color={look.textColor} opacity={look.dashOpacity} />
        <View style={styles.padH}>
          <View style={styles.row}>
            <Text style={[styles.lineLabel, lineLabelTone(tone), { color: look.textColor }]}>{pack.billLabel}</Text>
            <Text style={[styles.lineVal, { color: look.textColor }]}>{formatUsd(billAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.lineLabel, lineLabelTone(tone), { color: look.textColor }]}>
              {pack.tipLabel(tipPctLabel)}
            </Text>
            <Text style={[styles.lineVal, { color: look.textColor }]}>{formatUsd(tipAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.lineLabelStrong, lineLabelTone(tone), { color: look.textColor }]}>
              {pack.totalLabel}
            </Text>
            <Text style={[styles.lineValStrong, { color: look.textColor }]}>{formatUsd(totalAmount)}</Text>
          </View>
        </View>

        <DashedRule w={width - 40} color={look.textColor} opacity={look.dashOpacity} />

        <View style={[styles.padH, styles.splitBox, { backgroundColor: look.accentBg, borderColor: look.accentBorder }]}>
          <Text style={[styles.eachLabel, eachLabelTone(tone), { color: look.textColor }]}>{pack.eachTitle}</Text>
          <Text style={[styles.eachAmount, tone === "funny" && styles.eachAmountFunny, { color: look.textColor }]}>
            {formatUsd(totalPerPerson)}
          </Text>
          <Text style={[styles.splitMeta, tone === "passiveAggressive" && styles.splitMetaPassive, { color: look.brandColor }]}>
            {pack.splitCaption(people)}
          </Text>
        </View>

        <Text
          style={[
            styles.footer,
            { color: look.textColor },
            !isPro && styles.footerFaint,
            !isPro && { color: look.footerMutedColor },
          ]}
          numberOfLines={4}
        >
          {footerText || " "}
        </Text>
      </View>

      <Svg width={width} height={12} viewBox={`0 0 ${width} 12`}>
        <G transform={`translate(0,12) scale(1,-1)`}>
          <Path d={topPath} fill={look.paperBg} />
        </G>
      </Svg>
    </View>
  );
});

function lineLabelTone(tone: NudgeTone): TextStyle {
  if (tone === "serious") {
    return { fontSize: 11, letterSpacing: 0.3 };
  }
  if (tone === "funny") {
    return { fontSize: 12 };
  }
  return {};
}

function eachLabelTone(tone: NudgeTone): TextStyle {
  if (tone === "serious") {
    return { letterSpacing: 0.5, textTransform: "uppercase" as const, fontSize: 11 };
  }
  if (tone === "funny") {
    return { fontSize: 13, letterSpacing: 0.2 };
  }
  if (tone === "passiveAggressive") {
    return { fontSize: 11, lineHeight: 16 };
  }
  return {};
}

const styles = StyleSheet.create({
  root: {
    alignSelf: "center",
    backgroundColor: "transparent",
  },
  body: {
    backgroundColor: receipt.background,
    paddingTop: 4,
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  textureWrap: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  brand: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 18,
    color: receipt.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: "SpaceMono_700Bold",
    color: receipt.text,
    textAlign: "center",
  },
  date: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 11,
    color: receipt.branding,
    textAlign: "center",
    marginTop: 8,
  },
  dateFlavor: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 9,
    color: receipt.branding,
    textAlign: "center",
    marginTop: 3,
    opacity: 0.9,
  },
  dateFlavorSerious: {
    fontSize: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase" as const,
  },
  restaurant: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 15,
    color: receipt.text,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 14,
  },
  restaurantFunny: {
    fontSize: 14,
    lineHeight: 20,
  },
  rule: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignSelf: "center",
    marginVertical: 12,
    opacity: 0.55,
  },
  ruleDash: {
    width: 5,
    height: 1,
    backgroundColor: receipt.text,
    marginHorizontal: 1,
  },
  padH: {
    gap: 8,
  },
  splitBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineLabel: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 13,
    color: receipt.text,
    flex: 1,
    paddingRight: 8,
  },
  lineLabelStrong: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 13,
    color: receipt.text,
    flex: 1,
    paddingRight: 8,
  },
  lineVal: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 13,
    color: receipt.text,
  },
  lineValStrong: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 13,
    color: receipt.text,
  },
  eachLabel: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 13,
    color: receipt.text,
    marginTop: 4,
    textAlign: "center",
  },
  eachAmount: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 26,
    color: receipt.text,
    marginTop: 4,
    letterSpacing: -1,
    textAlign: "center",
  },
  eachAmountFunny: {
    fontSize: 28,
  },
  splitMeta: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 12,
    color: receipt.branding,
    marginTop: 6,
    textAlign: "center",
  },
  splitMetaPassive: {
    fontSize: 11,
    lineHeight: 16,
  },
  footer: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 10,
    color: receipt.text,
    textAlign: "center",
    marginTop: 18,
  },
  footerFaint: {
    color: receipt.branding,
  },
});
