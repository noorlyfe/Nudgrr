/**
 * ISO 4217 currency helpers + curated picker code list.
 */

import type { SupportedLocale } from "./i18n";
import { LOCALE_BCP47 } from "./i18n";

/** Used when `Intl.supportedValuesOf("currency")` is unavailable; kept in sync with runtime validation. */
const FALLBACK_CURRENCY_CODES: readonly string[] = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
  "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY",
  "COP", "CRC", "CUC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD",
  "EGP", "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP",
  "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR",
  "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR",
  "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD",
  "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU",
  "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK",
  "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG",
  "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK",
  "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP", "STN", "SVC", "SYP",
  "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS",
  "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF",
  "XCD", "XCG", "XOF", "XPF", "XSU", "YER", "ZAR", "ZMW", "ZWG", "ZWL",
];

/** Currencies omitted from the in-app picker (not everyday money). */
const EXCLUDED_CURRENCY_CODES = new Set<string>([
  "ILS",
  // Precious metals
  "XAU",
  "XAG",
  "XPT",
  "XPD",
  // IMF / composite units
  "XDR",
  // Non-standard financial instruments
  "BOV",
  "CHE",
  "CHW",
  "CLF",
  "CNH",
  "MXV",
  "USN",
  "USS",
  "UYI",
]);

function getEnglishCurrencyDisplayName(code: string): string | null {
  try {
    const name = new Intl.DisplayNames(["en-US"], { type: "currency" }).of(code);
    return name && name !== code ? name : null;
  } catch {
    return null;
  }
}

/** True when `en-US` can format the code and a human-readable English name exists. */
export function isValidCurrencyCode(code: string): boolean {
  if (!/^[A-Z]{3}$/i.test(code)) {
    return false;
  }
  const upper = code.toUpperCase();
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: upper }).format(1);
  } catch {
    return false;
  }
  return getEnglishCurrencyDisplayName(upper) !== null;
}

/** All picker-ready currency codes from the curated fallback list, sorted A–Z. */
export function getAllCurrencyCodes(): string[] {
  const unique = new Set<string>();
  for (const c of FALLBACK_CURRENCY_CODES) {
    const upper = c.toUpperCase();
    if (!EXCLUDED_CURRENCY_CODES.has(upper)) {
      unique.add(upper);
    }
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
}

export function getCurrencyFractionDigits(code: string): number {
  try {
    const upper = code.toUpperCase();
    const nf = new Intl.NumberFormat("en", { style: "currency", currency: upper });
    const { minimumFractionDigits, maximumFractionDigits } = nf.resolvedOptions();
    const min = minimumFractionDigits ?? 2;
    const max = maximumFractionDigits ?? min;
    return Math.min(6, Math.max(0, Math.max(min, max)));
  } catch {
    return 2;
  }
}

export function minorDigitsToAmount(digits: string, fractionDigits: number): number | null {
  const clean = digits.replace(/\D/g, "");
  if (!clean) {
    return null;
  }
  const n = parseInt(clean, 10);
  if (!Number.isFinite(n)) {
    return null;
  }
  const scale = 10 ** fractionDigits;
  return Math.round((n / scale) * 1e8) / 1e8;
}

export function amountToMinorDigits(amount: number, fractionDigits: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "";
  }
  const scale = 10 ** fractionDigits;
  return String(Math.round(amount * scale));
}

export function formatMinorDigitsForInput(digits: string, fractionDigits: number): string {
  if (!digits) {
    return "";
  }
  const n = parseInt(digits.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n)) {
    return "";
  }
  if (fractionDigits === 0) {
    return String(n);
  }
  const scale = 10 ** fractionDigits;
  return (n / scale).toFixed(fractionDigits);
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const upper = currencyCode.toUpperCase();
  const fd = getCurrencyFractionDigits(upper);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: upper,
      minimumFractionDigits: fd,
      maximumFractionDigits: fd,
    }).format(safe);
  } catch {
    return `${safe.toFixed(Math.min(fd, 2))} ${upper}`;
  }
}

export function getCurrencyNarrowSymbol(code: string): string {
  const upper = code.toUpperCase();
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency",
      currency: upper,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(1);
    return parts.find((p) => p.type === "currency")?.value ?? upper;
  } catch {
    return upper;
  }
}

export function getCurrencyDisplayName(code: string, locale = "en"): string {
  const upper = code.toUpperCase();
  try {
    const dn = new Intl.DisplayNames([locale], { type: "currency" });
    return dn.of(upper) ?? upper;
  } catch {
    return upper;
  }
}

const LIST_LABEL_EM_DASH = "\u2014";

/** English display names for the currency picker (one entry per `getAllCurrencyCodes()` code). */
export const CURRENCY_NAMES: Record<string, string> = {
  AED: "UAE Dirham",
  AFN: "Afghan Afghani",
  ALL: "Albanian Lek",
  AMD: "Armenian Dram",
  ANG: "Netherlands Antillean Guilder",
  AOA: "Angolan Kwanza",
  ARS: "Argentine Peso",
  AUD: "Australian Dollar",
  AWG: "Aruban Florin",
  AZN: "Azerbaijani Manat",
  BAM: "Bosnian Mark",
  BBD: "Barbadian Dollar",
  BDT: "Bangladeshi Taka",
  BGN: "Bulgarian Lev",
  BHD: "Bahraini Dinar",
  BIF: "Burundian Franc",
  BMD: "Bermudian Dollar",
  BND: "Brunei Dollar",
  BOB: "Bolivian Boliviano",
  BRL: "Brazilian Real",
  BSD: "Bahamian Dollar",
  BTN: "Bhutanese Ngultrum",
  BWP: "Botswanan Pula",
  BYN: "Belarusian Ruble",
  BZD: "Belize Dollar",
  CAD: "Canadian Dollar",
  CDF: "Congolese Franc",
  CHF: "Swiss Franc",
  CLP: "Chilean Peso",
  CNY: "Chinese Yuan",
  COP: "Colombian Peso",
  CRC: "Costa Rican Colón",
  CUC: "Cuban Convertible Peso",
  CUP: "Cuban Peso",
  CVE: "Cape Verdean Escudo",
  CZK: "Czech Koruna",
  DJF: "Djiboutian Franc",
  DKK: "Danish Krone",
  DOP: "Dominican Peso",
  DZD: "Algerian Dinar",
  EGP: "Egyptian Pound",
  ERN: "Eritrean Nakfa",
  ETB: "Ethiopian Birr",
  EUR: "Euro",
  FJD: "Fijian Dollar",
  FKP: "Falkland Islands Pound",
  GBP: "British Pound",
  GEL: "Georgian Lari",
  GHS: "Ghanaian Cedi",
  GIP: "Gibraltar Pound",
  GMD: "Gambian Dalasi",
  GNF: "Guinean Franc",
  GTQ: "Guatemalan Quetzal",
  GYD: "Guyanese Dollar",
  HKD: "Hong Kong Dollar",
  HNL: "Honduran Lempira",
  HRK: "Croatian Kuna",
  HTG: "Haitian Gourde",
  HUF: "Hungarian Forint",
  IDR: "Indonesian Rupiah",
  INR: "Indian Rupee",
  IQD: "Iraqi Dinar",
  IRR: "Iranian Rial",
  ISK: "Icelandic Króna",
  JMD: "Jamaican Dollar",
  JOD: "Jordanian Dinar",
  JPY: "Japanese Yen",
  KES: "Kenyan Shilling",
  KGS: "Kyrgyzstani Som",
  KHR: "Cambodian Riel",
  KMF: "Comorian Franc",
  KPW: "North Korean Won",
  KRW: "South Korean Won",
  KWD: "Kuwaiti Dinar",
  KYD: "Cayman Islands Dollar",
  KZT: "Kazakhstani Tenge",
  LAK: "Lao Kip",
  LBP: "Lebanese Pound",
  LKR: "Sri Lankan Rupee",
  LRD: "Liberian Dollar",
  LSL: "Lesotho Loti",
  LYD: "Libyan Dinar",
  MAD: "Moroccan Dirham",
  MDL: "Moldovan Leu",
  MGA: "Malagasy Ariary",
  MKD: "Macedonian Denar",
  MMK: "Myanmar Kyat",
  MNT: "Mongolian Tugrik",
  MOP: "Macanese Pataca",
  MRU: "Mauritanian Ouguiya",
  MUR: "Mauritian Rupee",
  MVR: "Maldivian Rufiyaa",
  MWK: "Malawian Kwacha",
  MXN: "Mexican Peso",
  MYR: "Malaysian Ringgit",
  MZN: "Mozambican Metical",
  NAD: "Namibian Dollar",
  NGN: "Nigerian Naira",
  NIO: "Nicaraguan Córdoba",
  NOK: "Norwegian Krone",
  NPR: "Nepalese Rupee",
  NZD: "New Zealand Dollar",
  OMR: "Omani Rial",
  PAB: "Panamanian Balboa",
  PEN: "Peruvian Sol",
  PGK: "Papua New Guinean Kina",
  PHP: "Philippine Peso",
  PKR: "Pakistani Rupee",
  PLN: "Polish Złoty",
  PYG: "Paraguayan Guaraní",
  QAR: "Qatari Riyal",
  RON: "Romanian Leu",
  RSD: "Serbian Dinar",
  RUB: "Russian Ruble",
  RWF: "Rwandan Franc",
  SAR: "Saudi Riyal",
  SBD: "Solomon Islands Dollar",
  SCR: "Seychellois Rupee",
  SDG: "Sudanese Pound",
  SEK: "Swedish Krona",
  SGD: "Singapore Dollar",
  SHP: "Saint Helena Pound",
  SLE: "Sierra Leonean Leone",
  SLL: "Sierra Leonean Leone (1964—2022)",
  SOS: "Somali Shilling",
  SRD: "Surinamese Dollar",
  SSP: "South Sudanese Pound",
  STN: "São Tomé and Príncipe Dobra",
  SVC: "Salvadoran Colón",
  SYP: "Syrian Pound",
  SZL: "Swazi Lilangeni",
  THB: "Thai Baht",
  TJS: "Tajikistani Somoni",
  TMT: "Turkmenistani Manat",
  TND: "Tunisian Dinar",
  TOP: "Tongan Paʻanga",
  TRY: "Turkish Lira",
  TTD: "Trinidad and Tobago Dollar",
  TWD: "Taiwan Dollar",
  TZS: "Tanzanian Shilling",
  UAH: "Ukrainian Hryvnia",
  UGX: "Ugandan Shilling",
  USD: "US Dollar",
  UYU: "Uruguayan Peso",
  UZS: "Uzbekistani Som",
  VES: "Venezuelan Bolívar",
  VND: "Vietnamese Dong",
  VUV: "Vanuatu Vatu",
  WST: "Samoan Tala",
  XAF: "Central African CFA Franc",
  XCD: "East Caribbean Dollar",
  XCG: "Caribbean guilder",
  XOF: "West African CFA Franc",
  XPF: "CFP Franc",
  XSU: "Sucre",
  YER: "Yemeni Rial",
  ZAR: "South African Rand",
  ZMW: "Zambian Kwacha",
  ZWG: "Zimbabwe Gold",
  ZWL: "Zimbabwean Dollar (2009–2024)",
};

/** Full English name for the currency picker; never returns bare code when a name exists. */
export function getCurrencyPickerName(code: string): string {
  const upper = code.toUpperCase();
  const mapped = CURRENCY_NAMES[upper];
  if (mapped && mapped !== upper) {
    return mapped;
  }
  const intl = getCurrencyDisplayName(upper, "en-US");
  if (intl && intl !== upper) {
    return intl;
  }
  return mapped ?? intl ?? upper;
}

function currencyNameForSettingsList(code: string): string {
  const upper = code.toUpperCase();
  return CURRENCY_NAMES[upper] ?? getCurrencyDisplayName(upper, "en-US");
}

/** Localized currency name for the settings list (name only, no code). */
export function getCurrencyListName(code: string, locale: SupportedLocale = "en"): string {
  const upper = code.toUpperCase();
  const fromMap = CURRENCY_NAMES[upper];
  if (fromMap) {
    return fromMap;
  }
  const bcp47 = LOCALE_BCP47[locale] ?? "en-US";
  const name = getCurrencyDisplayName(upper, bcp47);
  if (name && name !== upper) {
    return name;
  }
  return currencyNameForSettingsList(upper);
}

/** Settings row label, e.g. `DKK — Danish Krone` (localized display name). */
export function getCurrencyListLabel(code: string, locale: SupportedLocale = "en"): string {
  const upper = code.toUpperCase();
  return `${upper} ${LIST_LABEL_EM_DASH} ${getCurrencyListName(code, locale)}`;
}
