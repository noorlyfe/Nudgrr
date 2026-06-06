import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Appearance, type ColorSchemeName } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "@nudgrr/theme_preference";

type ThemeContextValue = {
  preference: ThemePreference;
  isDark: boolean;
  changeTheme: (pref: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function useThemeState(): ThemeContextValue {
  const [preference, setPreference] = useState<ThemePreference>("light");
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName | null>(
    Appearance.getColorScheme() ?? null
  );

  useEffect(() => {
    void (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") {
        setPreference(saved);
      }
    })();
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const changeTheme = useCallback(async (pref: ThemePreference) => {
    await AsyncStorage.setItem(STORAGE_KEY, pref);
    setPreference(pref);
  }, []);

  const isDark = preference === "dark" || (preference === "system" && systemScheme === "dark");

  return { preference, isDark, changeTheme };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useThemeState();
  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
