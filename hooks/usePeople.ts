import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@nudgrr/people_v1";

export type Person = {
  id: string;
  name: string;
  createdAt: string;
};

async function readAll(): Promise<Person[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(Boolean) as Person[];
  } catch {
    return [];
  }
}

async function writeAll(items: Person[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function normalizePersonName(name: string): string {
  return name.trim();
}

export function personNamesMatch(a: string, b: string): boolean {
  return normalizePersonName(a).toLowerCase() === normalizePersonName(b).toLowerCase();
}

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const next = await readAll();
      setPeople(next.sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addPerson = useCallback(
    async (name: string): Promise<Person | null> => {
      const trimmed = normalizePersonName(name);
      if (!trimmed) {
        return null;
      }
      const all = await readAll();
      if (all.some((p) => personNamesMatch(p.name, trimmed))) {
        return null;
      }
      const person: Person = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: trimmed,
        createdAt: new Date().toISOString(),
      };
      const merged = [...all, person].sort((a, b) => a.name.localeCompare(b.name));
      await writeAll(merged);
      await reload();
      return person;
    },
    [reload]
  );

  const getById = useCallback(async (id: string): Promise<Person | null> => {
    const all = await readAll();
    return all.find((p) => p.id === id) ?? null;
  }, []);

  return {
    people,
    loading,
    reload,
    addPerson,
    getById,
  };
}
