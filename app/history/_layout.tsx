import { useMemo } from "react";
import { Stack } from "expo-router";

import { useColors } from "../../hooks/useColors";

/** Receipt detail only — no list index. */
export default function HistoryLayout() {
  const colors = useColors();
  const contentStyle = useMemo(() => ({ backgroundColor: colors.background }), [colors.background]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
