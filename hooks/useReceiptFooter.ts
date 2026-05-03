import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FOOTER_KEY = "@nudgrr/receipt_footer_v1";

export function useReceiptFooter() {
  const [footer, setFooter] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(FOOTER_KEY);
        if (alive) {
          setFooter(v ?? "");
        }
      } finally {
        if (alive) {
          setLoaded(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const saveFooter = useCallback(async (text: string) => {
    const trimmed = text.trim();
    setFooter(trimmed);
    await AsyncStorage.setItem(FOOTER_KEY, trimmed);
  }, []);

  return { footer, loaded, saveFooter };
}
