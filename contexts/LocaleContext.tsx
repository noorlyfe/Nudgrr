import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import {
  type SupportedLocale,
  SUPPORTED_LOCALES,
  LOCALE_DEFAULT_CURRENCY,
  getDeviceLocale,
  getSavedLocale,
  saveLocale,
  clearLocaleOverride,
  t as translate,
} from "../lib/i18n";
import { trackLocale } from "../lib/oneSignal";
import { useAppPreferences } from "../hooks/useAppPreferences";

type LocaleContextType = {
  locale: SupportedLocale;
  loading: boolean;
  changeLocale: (locale: SupportedLocale) => Promise<void>;
  resetLocale: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
};

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  loading: true,
  changeLocale: async () => {},
  resetLocale: async () => {},
  t: (key) => key,
  isRTL: false,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { setCurrency } = useAppPreferences();
  const [locale, setLocale] = useState<SupportedLocale>(getDeviceLocale());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const saved = await getSavedLocale();
      if (saved) {
        setLocale(saved);
      } else {
        setLocale(getDeviceLocale());
      }
      setLoading(false);
    })();
  }, []);

  const changeLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      await saveLocale(newLocale);
      setLocale(newLocale);
      void trackLocale(newLocale);
      const defaultCurrency = LOCALE_DEFAULT_CURRENCY[newLocale];
      if (defaultCurrency) {
        await setCurrency(defaultCurrency);
      }
    },
    [setCurrency]
  );

  const resetLocale = useCallback(async () => {
    await clearLocaleOverride();
    const deviceLocale = getDeviceLocale();
    setLocale(deviceLocale);
    const defaultCurrency = LOCALE_DEFAULT_CURRENCY[deviceLocale];
    if (defaultCurrency) {
      await setCurrency(defaultCurrency);
    }
  }, [setCurrency]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(key, locale, params),
    [locale]
  );

  const isRTL = SUPPORTED_LOCALES[locale]?.rtl ?? false;

  return (
    <LocaleContext.Provider value={{ locale, loading, changeLocale, resetLocale, t, isRTL }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
