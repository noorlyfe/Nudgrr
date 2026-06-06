import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NudgeTone } from "../constants/messages";
import { isValidCurrencyCode } from "../lib/currency";
import { LOCALE_DEFAULT_CURRENCY } from "../lib/i18n";

const PREFERENCES_KEY_V2 = "@nudgrr/app_preferences_v2";
const PREFERENCES_KEY_V1 = "@nudgrr/app_preferences_v1";

const LOCALE_DEFAULT_CURRENCY_CODES = new Set(Object.values(LOCALE_DEFAULT_CURRENCY));

type Preferences = {
  defaultTone: NudgeTone;
  currency: string;
  hideReceiptBranding: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  defaultTone: "funny",
  currency: "USD",
  hideReceiptBranding: false,
};

function isTone(value: string): value is NudgeTone {
  return value === "funny" || value === "casual" || value === "passiveAggressive" || value === "serious";
}

function isAllowedCurrencyCode(code: string): boolean {
  return isValidCurrencyCode(code) || LOCALE_DEFAULT_CURRENCY_CODES.has(code);
}

type AppPreferencesContextValue = {
  loaded: boolean;
  defaultTone: NudgeTone;
  setDefaultTone: (tone: NudgeTone) => Promise<void>;
  currency: string;
  setCurrency: (code: string) => Promise<void>;
  hideReceiptBranding: boolean;
  setHideReceiptBranding: (hide: boolean) => Promise<void>;
  reload: () => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [defaultTone, setDefaultToneState] = useState<NudgeTone>(DEFAULT_PREFERENCES.defaultTone);
  const [currency, setCurrencyState] = useState<string>(DEFAULT_PREFERENCES.currency);
  const [hideReceiptBranding, setHideReceiptBrandingState] = useState<boolean>(DEFAULT_PREFERENCES.hideReceiptBranding);

  const loadFromStorage = useCallback(async () => {
    try {
      const raw =
        (await AsyncStorage.getItem(PREFERENCES_KEY_V2)) ??
        (await AsyncStorage.getItem(PREFERENCES_KEY_V1));
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<Preferences>;
      if (typeof parsed.defaultTone === "string" && isTone(parsed.defaultTone)) {
        setDefaultToneState(parsed.defaultTone);
      }
      if (typeof parsed.currency === "string") {
        const upper = parsed.currency.toUpperCase();
        if (isAllowedCurrencyCode(upper)) {
          setCurrencyState(upper);
        }
      }
      if (typeof parsed.hideReceiptBranding === "boolean") {
        setHideReceiptBrandingState(parsed.hideReceiptBranding);
      }
    } catch {
      // ignore invalid payloads
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await loadFromStorage();
      if (alive) {
        setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadFromStorage]);

  const reload = useCallback(async () => {
    await loadFromStorage();
  }, [loadFromStorage]);

  const persist = useCallback(async (next: Preferences) => {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY_V2, JSON.stringify(next));
    } catch {
      // best-effort persistence
    }
  }, []);

  const setDefaultTone = useCallback(
    async (tone: NudgeTone) => {
      setDefaultToneState(tone);
      await persist({ defaultTone: tone, currency, hideReceiptBranding });
    },
    [currency, hideReceiptBranding, persist]
  );

  const setCurrency = useCallback(
    async (code: string) => {
      const upper = code.toUpperCase();
      if (!isAllowedCurrencyCode(upper)) {
        return;
      }
      setCurrencyState(upper);
      await persist({ defaultTone, currency: upper, hideReceiptBranding });
    },
    [defaultTone, hideReceiptBranding, persist]
  );

  const setHideReceiptBranding = useCallback(
    async (hide: boolean) => {
      setHideReceiptBrandingState(hide);
      await persist({ defaultTone, currency, hideReceiptBranding: hide });
    },
    [defaultTone, currency, persist]
  );

  const value: AppPreferencesContextValue = {
    loaded,
    defaultTone,
    setDefaultTone,
    currency,
    setCurrency,
    hideReceiptBranding,
    setHideReceiptBranding,
    reload,
  };

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences(): AppPreferencesContextValue {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return ctx;
}
