/**
 * `react-native-purchases-ui` is not used on web.
 */
export async function presentRevenueCatPaywall(): Promise<{ kind: "not_presented" }> {
  return { kind: "not_presented" };
}
