/** Project tab and routes require Nudgrr Unlimited. */
export function isProjectFeatureLocked(isPro: boolean): boolean {
  return !isPro;
}
