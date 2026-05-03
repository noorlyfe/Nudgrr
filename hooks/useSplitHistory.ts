import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@nudgrr/split_history_v1";

export type SplitRecord = {
  id: string;
  createdAt: string;
  restaurant: string;
  billAmount: number;
  tipPercent: number;
  people: number;
  tipPerPerson: number;
  totalPerPerson: number;
  tipAmount: number;
  totalAmount: number;
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
    }) => {
      const next: SplitRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
        restaurant: record.restaurant,
        billAmount: record.billAmount,
        tipPercent: record.tipPercent,
        people: record.people,
        tipPerPerson: record.tipPerPerson,
        totalPerPerson: record.totalPerPerson,
        tipAmount: record.tipAmount,
        totalAmount: record.totalAmount,
      };
      const all = await readAll();
      const merged = [next, ...all].slice(0, 200);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      await reload();
      return next;
    },
    [reload]
  );

  const getById = useCallback(
    async (id: string): Promise<SplitRecord | null> => {
      const all = await readAll();
      return all.find((r) => r.id === id) ?? null;
    },
    []
  );

  return { items, loading, reload, addSplit, getById };
}
