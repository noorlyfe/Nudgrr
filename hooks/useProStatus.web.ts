import { useCallback, useEffect, useState } from "react";

import { DEV_UNLOCK_ALL } from "../constants/devUnlock";

/** Web preview — RevenueCat is native-only. */
export function useProStatus() {
  const [isPro, setIsPro] = useState(DEV_UNLOCK_ALL);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsPro(DEV_UNLOCK_ALL);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { isPro, loading, refresh };
}
