/** Web preview — OneSignal is native-only. */
export async function trackNudgeSent(_isPro: boolean, _locale: string): Promise<void> {}

export async function trackProStatus(_isPro: boolean): Promise<void> {}

export async function trackLocale(_locale: string): Promise<void> {}

export async function trackFreeNudgesUsed(_count: number): Promise<void> {}

export async function trackDaysWaiting(_days: number): Promise<void> {}

export function initOneSignal(): Promise<void> {
  return Promise.resolve();
}
