import type { Router } from "expo-router";

/**
 * Avoids React Navigation errors when `back()` runs with no previous screen in the stack
 * (e.g. deep link to /settings or after `replace`).
 */
export function safeRouterBack(router: Router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}
