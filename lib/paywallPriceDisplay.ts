import { LOCALE_BCP47, type SupportedLocale } from "./i18n";

// ===== PAYWALL CURRENCY DISPLAY (display only; Apple/Google charge the store price) — do not remove =====
// Amounts from App Store Connect “Starting Subscription Price” (USD/EUR/DKK/JPY/CNY/TWD markets).

type PaywallLocalePriceConfig = {
  /** Subscription list price for this language’s primary App Store region. */
  amount: number;
  minFractionDigits: number;
  maxFractionDigits: number;
};

/** Display symbol per app language — not the billed currency. */
const PAYWALL_DISPLAY_SYMBOL: Record<SupportedLocale, string> = {
  en: "$",
  da: "kr.",
  de: "€",
  fr: "€",
  es: "€",
  ja: "¥",
  zh: "¥",
  "zh-TW": "NT$",
};

const PAYWALL_LOCALE_PRICE: Record<SupportedLocale, PaywallLocalePriceConfig> = {
  en: { amount: 4.99, minFractionDigits: 2, maxFractionDigits: 2 }, // United States · USD
  da: { amount: 39, minFractionDigits: 2, maxFractionDigits: 2 }, // Denmark · DKK
  de: { amount: 5.99, minFractionDigits: 2, maxFractionDigits: 2 }, // Germany · EUR
  fr: { amount: 5.99, minFractionDigits: 2, maxFractionDigits: 2 }, // France · EUR
  es: { amount: 5.99, minFractionDigits: 2, maxFractionDigits: 2 }, // Spain · EUR
  ja: { amount: 800, minFractionDigits: 0, maxFractionDigits: 0 }, // Japan · JPY
  zh: { amount: 38, minFractionDigits: 0, maxFractionDigits: 0 }, // China mainland · CNY
  "zh-TW": { amount: 150, minFractionDigits: 0, maxFractionDigits: 0 }, // Taiwan · TWD
};

type SymbolPlacement = "prefix" | "suffix";

const PAYWALL_SYMBOL_PLACEMENT: Record<SupportedLocale, SymbolPlacement> = {
  en: "prefix",
  da: "suffix",
  de: "suffix",
  fr: "suffix",
  es: "suffix",
  ja: "prefix",
  zh: "prefix",
  "zh-TW": "prefix",
};

export function getPaywallDisplayPrice(locale: SupportedLocale): number {
  return PAYWALL_LOCALE_PRICE[locale].amount;
}

function formatAmountNumber(amount: number, locale: SupportedLocale): string {
  const { minFractionDigits, maxFractionDigits } = PAYWALL_LOCALE_PRICE[locale];
  return new Intl.NumberFormat(LOCALE_BCP47[locale], {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  }).format(amount);
}

/** Localized paywall price string (symbol + number format) for the active app language. */
export function formatPaywallPriceLabel(locale: SupportedLocale, perMonthSuffix: string): string {
  const { amount } = PAYWALL_LOCALE_PRICE[locale];
  const symbol = PAYWALL_DISPLAY_SYMBOL[locale];
  const formatted = formatAmountNumber(amount, locale);
  const placement = PAYWALL_SYMBOL_PLACEMENT[locale];
  const priceCore =
    placement === "prefix" ? `${symbol}${formatted}` : `${formatted} ${symbol}`;
  return `${priceCore}${perMonthSuffix}`;
}
