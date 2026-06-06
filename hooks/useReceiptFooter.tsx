import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { resolveReceiptFooterText } from "../lib/receiptFooter";

const FOOTER_KEY = "@nudgrr/receipt_footer_v1";

type ReceiptFooterContextValue = {
  loaded: boolean;
  footer: string;
  saveFooter: (text: string) => Promise<void>;
  /** Resolved footer for receipt render when Pro. */
  footerForReceipt: (isPro: boolean) => string;
};

const ReceiptFooterContext = createContext<ReceiptFooterContextValue | null>(null);

export function ReceiptFooterProvider({ children }: { children: React.ReactNode }) {
  const [footer, setFooter] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(FOOTER_KEY);
        if (alive) {
          setFooter(v ?? "");
        }
      } finally {
        if (alive) {
          setLoaded(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const saveFooter = useCallback(async (text: string) => {
    const trimmed = text.trim();
    setFooter(trimmed);
    await AsyncStorage.setItem(FOOTER_KEY, trimmed);
  }, []);

  const footerForReceipt = useCallback(
    (isPro: boolean) => resolveReceiptFooterText(isPro, footer),
    [footer]
  );

  const value: ReceiptFooterContextValue = {
    loaded,
    footer,
    saveFooter,
    footerForReceipt,
  };

  return <ReceiptFooterContext.Provider value={value}>{children}</ReceiptFooterContext.Provider>;
}

export function useReceiptFooter(): ReceiptFooterContextValue {
  const ctx = useContext(ReceiptFooterContext);
  if (!ctx) {
    throw new Error("useReceiptFooter must be used within ReceiptFooterProvider");
  }
  return ctx;
}
