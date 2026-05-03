export const colors = {
  background: "#EBDDC8",
  surface: "#F3E8D4",
  accent: "#D9A52B",
  textPrimary: "#0E1116",
  textSecondary: "#6F6557",
  border: "#D6C7AE",
  pillActiveBg: "#D9A52B",
  pillActiveText: "#0E1116",
  pillInactiveBg: "#F3E8D4",
  pillInactiveText: "#6F6557",
  shadow: "#000000",
} as const;

/** Shareable receipt (thermal paper look) */
export const receipt = {
  background: "#F5F0E8",
  text: "#1A1A1A",
  accent: "#1A1A1A",
  divider: "rgba(26, 26, 26, 0.35)",
  branding: "rgba(26, 26, 26, 0.45)",
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  wordmark: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 36,
    letterSpacing: -0.5,
  },
  label: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  body: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 16,
  },
  input: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  resultPrimary: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 36,
    letterSpacing: -1,
  },
  resultSecondary: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 24,
    letterSpacing: -0.5,
  },
  resultTertiary: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 18,
    letterSpacing: -0.25,
  },
  badge: {
    fontFamily: "SpaceMono_400Regular",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  stepper: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 22,
  },
} as const;

export const touchTarget = {
  min: 44,
  inputHeight: 56,
} as const;
