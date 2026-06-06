import type { NudgeTone } from "./messages";

/** Everything that makes the thermal receipt “scream” the same vibe as nudges. */
export type ReceiptTonePack = {
  /** Shout line under the wordmark */
  tagline: string;
  /** Tiny line under date (optional flavor) */
  dateFlavor: string;
  /** Row labels */
  billLabel: string;
  tipLabel: (tipPctPretty: string) => string;
  totalLabel: string;
  /** Big “each pays” section */
  eachTitle: string;
  splitCaption: (people: number) => string;
};

export function getLocalizedReceiptTonePack(
  tone: NudgeTone,
  t: (key: string, params?: Record<string, string | number>) => string
): ReceiptTonePack {
  const prefix = {
    funny: "receiptFunny",
    casual: "receiptCasual",
    passiveAggressive: "receiptPassive",
    serious: "receiptSerious",
  }[tone];

  return {
    tagline: t(`${prefix}Tagline`),
    dateFlavor: t(`${prefix}DateFlavor`),
    billLabel: t(`${prefix}Bill`),
    tipLabel: (pct) => t(`${prefix}Tip`, { pct }),
    totalLabel: t(`${prefix}Total`),
    eachTitle: t(`${prefix}Each`),
    splitCaption: (n) => t(`${prefix}Split`, { n }),
  };
}
