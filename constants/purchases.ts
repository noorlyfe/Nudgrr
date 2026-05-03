import { Platform } from "react-native";

/**
 * Public SDK keys (iOS / Android are often different in production).
 * Set `EXPO_PUBLIC_REVENUECAT_API_KEY` for both, or
 * `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` / `_ANDROID` separately.
 *
 * IMPORTANT:
 * - We intentionally do NOT ship a default test key.
 * - In release builds, keys starting with `test_` are treated as invalid.
 * - iOS builds only need the iOS key; Android only the Android key. Requiring both
 *   would block Purchases on a single-platform release.
 */

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

const shared = env("EXPO_PUBLIC_REVENUECAT_API_KEY");

function sanitizeRevenueCatKey(key: string): string {
  if (!key) {
    return "";
  }
  if (!__DEV__ && key.startsWith("test_")) {
    return "";
  }
  return key;
}

export const REVENUECAT_API_KEY_IOS = sanitizeRevenueCatKey(
  env("EXPO_PUBLIC_REVENUECAT_API_KEY_IOS") || shared
);
export const REVENUECAT_API_KEY_ANDROID = sanitizeRevenueCatKey(
  env("EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID") || shared
);

/** @deprecated Use `REVENUECAT_API_KEY_IOS` / `ANDROID` — kept for a few legacy imports. */
export const REVENUECAT_API_KEY = REVENUECAT_API_KEY_IOS;

export function isRevenueCatApiKeySet(): boolean {
  if (Platform.OS === "ios") {
    return REVENUECAT_API_KEY_IOS.length > 0;
  }
  if (Platform.OS === "android") {
    return REVENUECAT_API_KEY_ANDROID.length > 0;
  }
  return false;
}

/**
 * Must match the “Entitlement identifier” in RevenueCat exactly (case-sensitive).
 * Read via `customerInfo.entitlements.active[…]`.
 */
export const REVENUECAT_UNLIMITED_ENTITLEMENT_ID = "Nudgrr Unlimited" as const;
