import type { ViewStyle } from "react-native";

/** Mirror a horizontal row layout when the UI is RTL. */
export function rtlRow(isRTL: boolean): ViewStyle {
  return isRTL ? { flexDirection: "row-reverse" } : {};
}
