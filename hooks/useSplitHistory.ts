import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NudgeTone } from "../constants/messages";

const STORAGE_KEY = "@nudgrr/split_history_v1";

/** `split` = bill split; `project` = mirrored project settlement (optional). */
export type WaitingEntrySource = "split" | "project";

export type SplitRecord = {
  id: string;
  createdAt: string;
  /** Distinguishes bill splits from project settlement rows when mirrored. */
  waitingSource?: WaitingEntrySource;
  projectId?: string;
  projectTransferId?: string;
  restaurant: string;
  billAmount: number;
  tipPercent: number;
  people: number;
  tipPerPerson: number;
  totalPerPerson: number;
  tipAmount: number;
  totalAmount: number;
  /** ISO 4217; omitted on older records → treat as USD */
  currency?: string;
  /** Receipt tone when saved (older records may omit → default in UI). */
  nudgeTone?: NudgeTone;
  /** Footer line exactly as shown on the receipt image when saved. */
  receiptFooterResolved?: string;
  /** Nudge preview text exactly as shown on the receipt image when saved. */
  nudgePreviewText?: string;
  /** ISO 8601 when the payer marked this split as settled (Paid / Done). */
  paidAt?: string;
  /** ISO 8601 when the reminder / receipt was effectively “sent”; falls back to `createdAt` in UI when missing. */
  nudgeSentAt?: string;
  /** Links this waiting entry to a person in the People tab. */
  linkedPersonName?: string;
};

async function readAll(): Promise<SplitRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(Boolean) as SplitRecord[];
  } catch {
    return [];
  }
}

async function writeAll(items: SplitRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useSplitHistory() {
  const [items, setItems] = useState<SplitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await readAll();
      setItems(next.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addSplit = useCallback(
    async (record: {
      restaurant: string;
      billAmount: number;
      tipPercent: number;
      people: number;
      tipPerPerson: number;
      totalPerPerson: number;
      tipAmount: number;
      totalAmount: number;
      currency: string;
      nudgeTone: NudgeTone;
      receiptFooterResolved: string;
      nudgePreviewText: string;
      linkedPersonName?: string;
    }) => {
      const now = new Date().toISOString();
      const next: SplitRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: now,
        restaurant: record.restaurant,
        billAmount: record.billAmount,
        tipPercent: record.tipPercent,
        people: record.people,
        tipPerPerson: record.tipPerPerson,
        totalPerPerson: record.totalPerPerson,
        tipAmount: record.tipAmount,
        totalAmount: record.totalAmount,
        currency: record.currency,
        nudgeTone: record.nudgeTone,
        receiptFooterResolved: record.receiptFooterResolved,
        nudgePreviewText: record.nudgePreviewText,
        nudgeSentAt: now,
        linkedPersonName: record.linkedPersonName?.trim() || undefined,
      };
      const all = await readAll();
      const merged = [next, ...all].slice(0, 200);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      await reload();
      return next;
    },
    [reload]
  );

  const getById = useCallback(async (id: string): Promise<SplitRecord | null> => {
    const all = await readAll();
    return all.find((r) => r.id === id) ?? null;
  }, []);

  const markAsPaid = useCallback(
    async (id: string) => {
      const all = await readAll();
      const ix = all.findIndex((r) => r.id === id);
      if (ix < 0) {
        return;
      }
      const now = new Date().toISOString();
      const row = all[ix];
      if (typeof row.paidAt === "string" && row.paidAt.trim().length > 0) {
        return;
      }
      const updated: SplitRecord = { ...row, paidAt: now };
      const nextAll = [...all];
      nextAll[ix] = updated;
      await writeAll(nextAll);
      await reload();
    },
    [reload]
  );

  const markNudgeSent = useCallback(
    async (id: string) => {
      const all = await readAll();
      const ix = all.findIndex((r) => r.id === id);
      if (ix < 0) {
        return;
      }
      const now = new Date().toISOString();
      const row = all[ix];
      if (typeof row.paidAt === "string" && row.paidAt.trim().length > 0) {
        return;
      }
      const updated: SplitRecord = { ...row, nudgeSentAt: now };
      const nextAll = [...all];
      nextAll[ix] = updated;
      await writeAll(nextAll);
      await reload();
    },
    [reload]
  );

  const unmarkPaid = useCallback(
    async (id: string) => {
      const all = await readAll();
      const updated = all.map((r) => (r.id === id ? { ...r, paidAt: undefined } : r));
      await writeAll(updated);
      await reload();
    },
    [reload]
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      const all = await readAll();
      const updated = all.filter((r) => r.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      await reload();
    },
    [reload]
  );

  const clearAll = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await reload();
  }, [reload]);

  return {
    items,
    loading,
    reload,
    addSplit,
    getById,
    markAsPaid,
    markNudgeSent,
    unmarkPaid,
    deleteRecord,
    clearAll,
  };
}
