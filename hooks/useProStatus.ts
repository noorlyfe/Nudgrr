import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases, { type CustomerInfo } from "react-native-purchases";

import { DEV_UNLOCK_ALL } from "../constants/devUnlock";
import { isRevenueCatApiKeySet, REVENUECAT_UNLIMITED_ENTITLEMENT_ID } from "../constants/purchases";
import { trackProStatus } from "../lib/oneSignal";

function readIsPro(info: CustomerInfo | null): boolean {
  if (!info) {
    return false;
  }
  return typeof info.entitlements.active[REVENUECAT_UNLIMITED_ENTITLEMENT_ID] !== "undefined";
}

export function useProStatus() {
  const [isPro, setIsPro] = useState(DEV_UNLOCK_ALL);
  const [loading, setLoading] = useState(!DEV_UNLOCK_ALL);

  const refresh = useCallback(async () => {
    if (DEV_UNLOCK_ALL) {
      setIsPro(true);
      setLoading(false);
      return;
    }
    if (Platform.OS === "web" || !isRevenueCatApiKeySet()) {
      setIsPro(false);
      setLoading(false);
      return;
    }
    try {
      const info = await Purchases.getCustomerInfo();
      setIsPro(readIsPro(info));
    } catch {
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void trackProStatus(isPro);
  }, [isPro]);

  useEffect(() => {
    if (DEV_UNLOCK_ALL || Platform.OS === "web" || !isRevenueCatApiKeySet()) {
      return;
    }
    const listener = (info: CustomerInfo) => {
      setIsPro(readIsPro(info));
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return { isPro, loading, refresh };
}
