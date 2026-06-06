import { useMemo } from "react";
import { Tabs } from "expo-router";

import { NudgrrTabBar } from "../../components/NudgrrTabBar";
import { useColors } from "../../hooks/useColors";

export default function TabsLayout() {
  const colors = useColors();
  const sceneStyle = useMemo(() => ({ backgroundColor: colors.background }), [colors.background]);

  return (
    <Tabs
      tabBar={(props) => <NudgrrTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Split",
        }}
      />
      <Tabs.Screen
        name="waiting"
        options={{
          title: "The Waiting Game",
        }}
      />
      <Tabs.Screen
        name="the-lack"
        options={{
          title: "The Lack",
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "The Project",
        }}
      />
    </Tabs>
  );
}
