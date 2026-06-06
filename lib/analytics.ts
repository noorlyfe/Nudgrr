import AsyncStorage from "@react-native-async-storage/async-storage";

const ANALYTICS_COUNTERS_KEY = "@nudgrr/analytics_counters_v1";

export type AnalyticsEvent =
  | "nudge_regenerate"
  | "nudge_sent"
  | "receipt_share"
  | "paywall_opened"
  | "paywall_purchase"
  | "paywall_restore"
  | "paywall_fallback"
  | "paywall_web_store_link";

export type CounterMap = Partial<Record<AnalyticsEvent, number>>;

/**
 * Lightweight local analytics counter.
 * Useful for validating flows in dev without external analytics SDKs.
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ANALYTICS_COUNTERS_KEY);
    const parsed: CounterMap = raw ? (JSON.parse(raw) as CounterMap) : {};
    parsed[event] = (parsed[event] ?? 0) + 1;
    await AsyncStorage.setItem(ANALYTICS_COUNTERS_KEY, JSON.stringify(parsed));
    if (__DEV__) {
      console.log(`[Analytics] ${event}`, parsed[event]);
    }
  } catch {
    // Best-effort only
  }
}

