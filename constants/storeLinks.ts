/** Google Play — package must match `app.json` android.package */
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.noorlyfe.nudgrr";

/**
 * App Store product page. Set `EXPO_PUBLIC_APP_STORE_ID` (numeric Apple ID) when the app is live.
 * Falls back to App Store search until then.
 */
export function getAppStoreUrl(): string {
  const id = process.env.EXPO_PUBLIC_APP_STORE_ID;
  if (typeof id === "string" && /^\d+$/.test(id.trim())) {
    return `https://apps.apple.com/app/id${id.trim()}`;
  }
  return "https://apps.apple.com/search?term=Nudgrr";
}
