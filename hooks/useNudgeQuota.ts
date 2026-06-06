import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { FREE_NUDGES_PER_MONTH } from "../constants/messages";

const STORAGE_KEY = "@nudgrr/nudge_quota_v2";

/** Keeps every useNudgeQuota() caller in sync (e.g. Split index + NudgeSection). */
const quotaListeners = new Set<() => void>();

function emitQuotaChanged() {
  for (const listener of quotaListeners) {
    listener();
  }
}

type QuotaPayload = {
  month: string;
  count: number;
};

function currentMonthKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function readPayload(): Promise<QuotaPayload> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { month: currentMonthKey(), count: 0 };
  }
  try {
    const p = JSON.parse(raw) as QuotaPayload;
    if (typeof p?.month !== "string" || typeof p?.count !== "number") {
      return { month: currentMonthKey(), count: 0 };
    }
    return p;
  } catch {
    return { month: currentMonthKey(), count: 0 };
  }
}

/**
 * Free tier: {@link FREE_NUDGES_PER_MONTH} nudges per calendar month (local).
 * Pro bypasses via caller.
 */
export function useNudgeQuota(isPro: boolean) {
  const [usedThisMonth, setUsedThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      let p = await readPayload();
      const month = currentMonthKey();
      if (p.month !== month) {
        p = { month, count: 0 };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      }
      setUsedThisMonth(p.count);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncFromStorage = useCallback(async () => {
    let p = await readPayload();
    const month = currentMonthKey();
    if (p.month !== month) {
      p = { month, count: 0 };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    }
    setUsedThisMonth(p.count);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onQuotaChanged = () => {
      void syncFromStorage();
    };
    quotaListeners.add(onQuotaChanged);
    return () => {
      quotaListeners.delete(onQuotaChanged);
    };
  }, [syncFromStorage]);

  const remainingFree = Math.max(0, FREE_NUDGES_PER_MONTH - usedThisMonth);

  const recordSend = useCallback(async () => {
    if (isPro) {
      return;
    }
    const month = currentMonthKey();
    let p = await readPayload();
    if (p.month !== month) {
      p = { month, count: 0 };
    }
    p.count += 1;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    emitQuotaChanged();
  }, [isPro]);

  const canSendFree = isPro || usedThisMonth < FREE_NUDGES_PER_MONTH;

  return {
    usedThisMonth,
    remainingFree,
    canSendFree,
    loading,
    reload,
    recordSend,
  };
}
