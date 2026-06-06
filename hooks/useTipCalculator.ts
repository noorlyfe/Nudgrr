import { minorDigitsToAmount } from "../lib/currency";

export const TIP_PRESETS = [0, 10, 15, 18, 20, 25] as const;

export type TipSplitResult = {
  hasBill: boolean;
  people: number;
  tipPercent: number;
  tipAmount: number;
  totalAmount: number;
  tipPerPerson: number;
  totalPerPerson: number;
};

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function clampPeople(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    return 1;
  }
  if (value > 20) {
    return 20;
  }
  return Math.floor(value);
}

export function clampTipPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value > 999) {
    return 999;
  }
  return value;
}

/** @param fractionDigits ISO minor units (e.g. 2 for USD/EUR, 0 for JPY). */
export function billDigitsToAmount(digits: string, fractionDigits = 2): number | null {
  const amount = minorDigitsToAmount(digits, fractionDigits);
  if (amount === null) {
    return null;
  }
  return round2(amount);
}

export type TipEntryMode = "percent" | "total" | "per_person";

/**
 * Fixed total tip in dollars, or fixed tip per person in dollars; derives effective % from bill.
 */
export function computeTipFromFixed(
  billAmount: number | null,
  peopleCount: number,
  which: "total" | "per_person",
  fixedDollars: number
): TipSplitResult {
  const people = clampPeople(peopleCount);
  if (billAmount === null || !Number.isFinite(billAmount) || billAmount <= 0) {
    return {
      hasBill: false,
      people,
      tipPercent: 0,
      tipAmount: 0,
      totalAmount: 0,
      tipPerPerson: 0,
      totalPerPerson: 0,
    };
  }

  const raw = Number.isFinite(fixedDollars) ? fixedDollars : 0;
  const bounded =
    which === "total" ? round2(Math.max(0, Math.min(raw, 1_000_000))) : round2(Math.max(0, Math.min(raw, 100_000)));

  const tipAmount =
    which === "total"
      ? bounded
      : round2(bounded * people);

  const totalAmount = round2(billAmount + tipAmount);
  const tipPerPerson = people > 0 ? round2(tipAmount / people) : 0;
  const totalPerPerson = people > 0 ? round2(totalAmount / people) : 0;
  const tipPercent = round2((tipAmount / billAmount) * 100);

  return {
    hasBill: true,
    people,
    tipPercent: clampTipPercent(tipPercent),
    tipAmount,
    totalAmount,
    tipPerPerson,
    totalPerPerson,
  };
}

export function computeTipSplit(
  billAmount: number | null,
  tipPercent: number,
  peopleCount: number
): TipSplitResult {
  const people = clampPeople(peopleCount);
  const tip = clampTipPercent(tipPercent);

  if (billAmount === null || !Number.isFinite(billAmount) || billAmount <= 0) {
    return {
      hasBill: false,
      people,
      tipPercent: tip,
      tipAmount: 0,
      totalAmount: 0,
      tipPerPerson: 0,
      totalPerPerson: 0,
    };
  }

  const tipAmount = round2(billAmount * (tip / 100));
  const totalAmount = round2(billAmount + tipAmount);
  const tipPerPerson = round2(tipAmount / people);
  const totalPerPerson = round2(totalAmount / people);

  return {
    hasBill: true,
    people,
    tipPercent: tip,
    tipAmount,
    totalAmount,
    tipPerPerson,
    totalPerPerson,
  };
}

export { formatCurrency } from "../lib/currency";
