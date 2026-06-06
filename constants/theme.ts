export function getColors(isDark: boolean = false) {
  return {
    background: isDark ? "#3D3935" : "#FFF9F0",
    surface: isDark ? "#4D4843" : "#FFFFFF",
    surfaceElevated: isDark ? "#565048" : "#FFFFFF",
    accent: isDark ? "#FFC940" : "#FFB800",
    accentSoft: isDark ? "rgba(255, 201, 64, 0.18)" : "rgba(255, 184, 0, 0.14)",
    accentSecondary: isDark ? "#FF9F7A" : "#FF6B6B",
    textPrimary: isDark ? "#FAF7F2" : "#1C1917",
    textSecondary: isDark ? "#B8AFA3" : "#6F6557",
    border: isDark ? "#5C5650" : "#EDE4D8",
    pillActiveBg: isDark ? "#FFC940" : "#FFB800",
    pillActiveText: "#1C1917",
    pillInactiveBg: isDark ? "#4D4843" : "#FFFFFF",
    pillInactiveText: isDark ? "#B8AFA3" : "#6F6557",
    shadow: isDark ? "#000000" : "#2D2240",
    destructive: "#E5484D",
    cardShadowOpacity: isDark ? 0.22 : 0.1,
  } as const;
}

export type AppColors = ReturnType<typeof getColors>;

export const colors = getColors(false);

/** Receipt cards — lighter dark palette, warm paper in light mode. */
export function getReceiptColors(isDark: boolean) {
  return {
    background: isDark ? "#4A443C" : "#FFFDF8",
    text: isDark ? "#FAF7F2" : "#1C1917",
    accent: isDark ? "#FFC940" : "#E5A000",
    divider: isDark ? "#6B6358" : "#E8DFD0",
    muted: isDark ? "#A89880" : "#8B7355",
    surface: isDark ? "#565048" : "#F5F0E8",
  };
}

// Fonts loaded in `app/_layout.tsx`.
export const fonts = {
  mono: "SpaceMono_400Regular",
  monoBold: "SpaceMono_400Regular",
  body: "Inter_400Regular",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
} as const;

/** Shareable receipt (thermal paper look) */
export const receipt = {
  background: "#FFFDF8",
  text: "#1C1917",
  accent: "#E5A000",
  divider: "rgba(28, 25, 23, 0.2)",
  branding: "rgba(28, 25, 23, 0.4)",
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  wordmark: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.6,
    fontWeight: "700" as const,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
    fontWeight: "700" as const,
  },
  resultPrimary: {
    fontFamily: "Inter_700Bold",
    fontWeight: "700" as const,
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 34,
  },
  resultSecondary: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    letterSpacing: -0.3,
  },
  resultTertiary: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    letterSpacing: 0,
  },
  badge: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  stepper: {
    fontFamily: "Inter_700Bold",
    fontWeight: "700" as const,
    fontSize: 22,
    letterSpacing: -0.3,
  },
} as const;

export const touchTarget = {
  min: 44,
  inputHeight: 56,
} as const;
