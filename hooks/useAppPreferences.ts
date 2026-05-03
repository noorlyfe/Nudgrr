import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NudgeTone } from "../constants/messages";

const PREFERENCES_KEY = "@nudgrr/app_preferences_v1";

type Preferences = {
  defaultTone: NudgeTone;
};

const DEFAULT_PREFERENCES: Preferences = {
  defaultTone: "funny",
};

function isTone(value: string): value is NudgeTone {
  return value === "funny" || value === "casual" || value === "passiveAggressive" || value === "serious";
}

export function useAppPreferences() {
  const [loaded, setLoaded] = useState(false);
  const [defaultTone, setDefaultToneState] = useState<NudgeTone>(DEFAULT_PREFERENCES.defaultTone);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
        if (!raw || !alive) {
          return;
        }
        const parsed = JSON.parse(raw) as Partial<Preferences>;
        if (typeof parsed.defaultTone === "string" && isTone(parsed.defaultTone)) {
          setDefaultToneState(parsed.defaultTone);
        }
      } catch {
        // ignore invalid payloads
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

  const setDefaultTone = useCallback(async (tone: NudgeTone) => {
    setDefaultToneState(tone);
    const payload: Preferences = { defaultTone: tone };
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(payload));
    } catch {
      // best-effort persistence
    }
  }, []);

  return { loaded, defaultTone, setDefaultTone };
}

