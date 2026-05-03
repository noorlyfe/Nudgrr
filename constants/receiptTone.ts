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
  /** When not Pro — still tone-matched; Pro uses custom footer instead */
  freeFooter: string;
};

function splitWays(n: number): string {
  return n === 1 ? "1 person" : `${n} people`;
}

const FUNNY: ReceiptTonePack = {
  tagline: "THE RECEIPT OF TRUTH 😭",
  dateFlavor: "(no refunds on vibes)",
  billLabel: "The damage",
  tipLabel: (pct) => `Tip (${pct}%) — be generous lol`,
  totalLabel: "Ouch total",
  eachTitle: "YOUR TURN TO PAY 💸",
  splitCaption: (n) => `${splitWays(n)} · no escape`,
  freeFooter: "Made with Nudgrr · we did the math so nobody gets disowned",
};

const CASUAL: ReceiptTonePack = {
  tagline: "split · paid · done",
  dateFlavor: "low stress, correct math",
  billLabel: "Bill",
  tipLabel: (pct) => `Tip (${pct}%)`,
  totalLabel: "Total",
  eachTitle: "Your part",
  splitCaption: (n) => `${splitWays(n)} · easy`,
  freeFooter: "Made with Nudgrr · tap, share, peace ✌️",
};

const PASSIVE: ReceiptTonePack = {
  tagline: "A courteous record of shared dining",
  dateFlavor: "With warm regards",
  billLabel: "Base amount (if that’s alright)",
  tipLabel: (pct) => `Gratuity (${pct}%), only if comfortable`,
  totalLabel: "Combined total",
  eachTitle: "Your portion, whenever you’re ready",
  splitCaption: (n) =>
    `Kindly divided among ${splitWays(n)} — thank you so much`,
  freeFooter:
    "Made with Nudgrr · we hope this finds you well and in good spirits",
};

const SERIOUS: ReceiptTonePack = {
  tagline: "STATEMENT OF AMOUNT DUE",
  dateFlavor: "Document generated for settlement",
  billLabel: "Subtotal",
  tipLabel: (pct) => `Service charge (${pct}%)`,
  totalLabel: "Amount due",
  eachTitle: "Per-person obligation",
  splitCaption: (n) => `Allocation: ${n} party${n === 1 ? "" : "ies"}`,
  freeFooter: "Made with Nudgrr · verified split",
};

const PACKS: Record<NudgeTone, ReceiptTonePack> = {
  funny: FUNNY,
  casual: CASUAL,
  passiveAggressive: PASSIVE,
  serious: SERIOUS,
};

export function getReceiptTonePack(tone: NudgeTone): ReceiptTonePack {
  return PACKS[tone];
}
