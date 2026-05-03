import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";

import { colors, radii, spacing, typography } from "../constants/theme";

type ProGateProps = {
  locked: boolean;
  children: ReactNode;
};

export function ProGate({ locked, children }: ProGateProps) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      {children}
      {locked ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.overlayInner} pointerEvents="box-none">
            <Text style={styles.title}>History is included in Unlimited</Text>
            <Text style={styles.sub}>
              $4.99/month — or stay on the free plan (2 nudges / month) for quick splits.
            </Text>
            <Pressable
              onPress={() => router.push("/paywall")}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Nudgrr unlimited subscription"
            >
              <Text style={styles.ctaText}>Get Unlimited</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  overlayInner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.body,
    fontFamily: "SpaceMono_700Bold",
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
  },
  sub: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  cta: {
    marginTop: spacing.sm,
    minHeight: 48,
    minWidth: 200,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontFamily: "SpaceMono_700Bold",
    fontSize: 16,
    color: colors.pillActiveText,
  },
});
