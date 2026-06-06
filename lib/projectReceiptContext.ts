export type ProjectReceiptContext = "travel" | "food" | "default";

const TRIP_KEYWORDS = [
  "trip",
  "travel",
  "vacation",
  "ferie",
  "rejse",
  "voyage",
  "viaje",
  "reise",
  "urlaub",
  "holiday",
  "holidays",
];

const FOOD_KEYWORDS = [
  "dinner",
  "lunch",
  "breakfast",
  "brunch",
  "restaurant",
  "food",
  "middag",
  "mad",
  "frokost",
  "dîner",
  "diner",
  "cena",
  "comida",
  "essen",
  "mahl",
  "meal",
  "eat",
  "cafe",
  "café",
];

export function detectProjectReceiptContext(projectName: string): ProjectReceiptContext {
  const haystack = projectName.trim().toLowerCase();
  if (!haystack) {
    return "default";
  }
  if (TRIP_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return "travel";
  }
  if (FOOD_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return "food";
  }
  return "default";
}

export function projectReceiptCopyKeys(context: ProjectReceiptContext) {
  const suffix = context === "travel" ? "Travel" : context === "food" ? "Food" : "Default";
  return {
    contextBadge: `projectReceiptContextBadge${suffix}` as const,
    tagline: `projectReceiptTagline${suffix}` as const,
    sectionTitle: `projectReceiptSectionTitle${suffix}` as const,
    lineExpense: `projectReceiptLineExpense${suffix}` as const,
    lineShare: `projectReceiptLineShare${suffix}` as const,
    lineTotalOwed: `projectReceiptLineTotalOwed${suffix}` as const,
  };
}

export function receiptColorsForProjectContext(
  context: ProjectReceiptContext,
  isDark: boolean
): {
  background: string;
  text: string;
  accent: string;
  divider: string;
  muted: string;
  surface: string;
  badgeBg: string;
} {
  if (context === "travel") {
    return {
      background: isDark ? "#3A4550" : "#EEF4F8",
      text: isDark ? "#E8F0F6" : "#1A2834",
      accent: isDark ? "#7EC8FF" : "#2B6CB0",
      divider: isDark ? "#4E5E6C" : "#B8CCD8",
      muted: isDark ? "#8AABB8" : "#5A7A8F",
      surface: isDark ? "#45525E" : "#E2ECF2",
      badgeBg: isDark ? "rgba(126, 200, 255, 0.16)" : "rgba(43, 108, 176, 0.1)",
    };
  }
  if (context === "food") {
    return {
      background: isDark ? "#4A4038" : "#F8F0E6",
      text: isDark ? "#F5E8D8" : "#2A1810",
      accent: isDark ? "#FFAB80" : "#B45309",
      divider: isDark ? "#5E5248" : "#D4B896",
      muted: isDark ? "#B09880" : "#8B6914",
      surface: isDark ? "#564C42" : "#F0E4D4",
      badgeBg: isDark ? "rgba(255, 171, 128, 0.16)" : "rgba(180, 83, 9, 0.1)",
    };
  }
  return {
    background: isDark ? "#4A443C" : "#FFFDF8",
    text: isDark ? "#FAF7F2" : "#1C1917",
    accent: isDark ? "#FFC940" : "#E5A000",
    divider: isDark ? "#6B6358" : "#E8DFD0",
    muted: isDark ? "#A89880" : "#8B7355",
    surface: isDark ? "#565048" : "#F5F0E8",
    badgeBg: isDark ? "rgba(255, 201, 64, 0.16)" : "rgba(229, 160, 0, 0.1)",
  };
}
