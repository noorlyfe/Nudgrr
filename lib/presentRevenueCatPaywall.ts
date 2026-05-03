import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

const DEBOUNCE_MS = 500;
let lastPresentedAt = 0;

export type PaywallOpenResult =
  | { kind: "debounced" }
  | { kind: "not_presented" }
  | { kind: "error" }
  | { kind: "cancelled" }
  | { kind: "purchased" }
  | { kind: "restored" };

/**
 * Presents the RevenueCat paywall (configure Paywalls in the dashboard for the current offering).
 * Returns a result for custom fallback UI.
 * (On web, use `presentRevenueCatPaywall.web.ts`.)
 */
export async function presentRevenueCatPaywall(): Promise<PaywallOpenResult> {
  const now = Date.now();
  if (now - lastPresentedAt < DEBOUNCE_MS) {
    return { kind: "debounced" };
  }
  lastPresentedAt = now;

  try {
    const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

    switch (paywallResult) {
      case PAYWALL_RESULT.NOT_PRESENTED:
        return { kind: "not_presented" };
      case PAYWALL_RESULT.ERROR:
        return { kind: "error" };
      case PAYWALL_RESULT.CANCELLED:
        return { kind: "cancelled" };
      case PAYWALL_RESULT.PURCHASED:
        return { kind: "purchased" };
      case PAYWALL_RESULT.RESTORED:
        return { kind: "restored" };
      default:
        return { kind: "error" };
    }
  } catch {
    return { kind: "error" };
  }
}
