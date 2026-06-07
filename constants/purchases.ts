import { Platform } from "react-native";

// RevenueCat public SDK keys are designed to be embedded in client apps.
// Env vars take priority (EAS builds); native Xcode Archive builds fall back to the hardcoded key.
const FALLBACK_IOS_KEY = "appl_DhTqpVVlojtgQHbusCxKaEqgTkO";

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
  env("EXPO_PUBLIC_REVENUECAT_API_KEY_IOS") || shared || FALLBACK_IOS_KEY
);
const FALLBACK_ANDROID_KEY = "goog_PFzNApaGoEWQliHAWTnyyEujHgz";

export const REVENUECAT_API_KEY_ANDROID = sanitizeRevenueCatKey(
  env("EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID") || shared || FALLBACK_ANDROID_KEY
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
