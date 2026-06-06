import { useMemo } from "react";

import { getColors } from "../constants/theme";
import { useTheme } from "./useTheme";

export function useColors() {
  const { isDark } = useTheme();
  return useMemo(() => getColors(isDark), [isDark]);
}
