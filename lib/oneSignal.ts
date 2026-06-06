import Constants from "expo-constants";
import { Platform } from "react-native";
import { OneSignal } from "react-native-onesignal";

let initPromise: Promise<void> | null = null;
let initialized = false;

function getAppId(): string | undefined {
  return Constants.expoConfig?.extra?.oneSignalAppId as string | undefined;
}

/** Initialize OneSignal once — must complete before any User/tag API calls. */
export function initOneSignal(): Promise<void> {
  if (Platform.OS === "web") {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const appId = getAppId();
    if (!appId || initialized) {
      return;
    }

    try {
      OneSignal.initialize(appId);
      initialized = true;
    } catch {
      // Native module unavailable on unsupported builds.
      return;
    }

    try {
      await OneSignal.Notifications.requestPermission(true);
    } catch {
      // Permission prompt may fail if already decided or unavailable.
    }
  })();

  return initPromise;
}

async function withOneSignalReady(run: () => void): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  await initOneSignal();
  if (!initialized) {
    return;
  }

  try {
    run();
  } catch {
    // OneSignal may be unavailable on unsupported builds.
  }
}

function safeTag(value: string): string {
  return value.slice(0, 255);
}

export async function trackNudgeSent(isPro: boolean, locale: string): Promise<void> {
  await withOneSignalReady(() => {
    OneSignal.User.addTags({
      last_nudge_sent: new Date().toISOString(),
      is_pro: isPro ? "true" : "false",
      locale: safeTag(locale),
    });
  });
}

export async function trackProStatus(isPro: boolean): Promise<void> {
  await withOneSignalReady(() => {
    OneSignal.User.addTag("is_pro", isPro ? "true" : "false");
  });
}

export async function trackLocale(locale: string): Promise<void> {
  await withOneSignalReady(() => {
    OneSignal.User.addTag("locale", safeTag(locale));
  });
}

export async function trackFreeNudgesUsed(count: number): Promise<void> {
  await withOneSignalReady(() => {
    OneSignal.User.addTag("free_nudges_used", String(count));
  });
}

export async function trackDaysWaiting(days: number): Promise<void> {
  await withOneSignalReady(() => {
    OneSignal.User.addTag("max_days_waiting", String(days));
  });
}
