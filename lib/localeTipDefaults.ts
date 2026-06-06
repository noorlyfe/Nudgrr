import type { SupportedLocale } from "./i18n";

export type LocaleTipConfig = {
  /** Whether the tip row starts expanded on a fresh split screen. */
  startEnabled: boolean;
  /** Percent applied when tip is enabled (also used when user taps "Add tip"). */
  defaultPercent: number;
  /** Preset pills shown when tip is expanded (percent mode only). */
  presets: readonly number[];
};

export const LOCALE_TIP_CONFIG: Record<SupportedLocale, LocaleTipConfig> = {
  en: {
    startEnabled: true,
    defaultPercent: 18,
    presets: [10, 15, 18, 20, 25],
  },
  da: {
    startEnabled: false,
    defaultPercent: 10,
    presets: [5, 10, 15],
  },
  de: {
    startEnabled: false,
    defaultPercent: 10,
    presets: [5, 10, 15],
  },
  fr: {
    startEnabled: false,
    defaultPercent: 10,
    presets: [5, 10, 15],
  },
  es: {
    startEnabled: false,
    defaultPercent: 10,
    presets: [5, 10, 15],
  },
  ja: {
    startEnabled: false,
    defaultPercent: 0,
    presets: [5, 10],
  },
  zh: {
    startEnabled: false,
    defaultPercent: 0,
    presets: [5, 10],
  },
  "zh-TW": {
    startEnabled: false,
    defaultPercent: 10,
    presets: [5, 10, 15],
  },
};

export function getLocaleTipConfig(locale: SupportedLocale): LocaleTipConfig {
  return LOCALE_TIP_CONFIG[locale] ?? LOCALE_TIP_CONFIG.en;
}
