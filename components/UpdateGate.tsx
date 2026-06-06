import { useEffect, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { getAppStoreUrl, PLAY_STORE_URL } from "../constants/storeLinks";
import { checkForUpdate, getCurrentVersion, isVersionOutdated } from "../lib/updateCheck";
import { ForceUpdateModal } from "./ForceUpdateModal";

const DEFAULT_UPDATE_URL =
  Platform.OS === "android" ? PLAY_STORE_URL : "https://apps.apple.com/app/nudgrr/id6763390989";

type Props = {
  children: ReactNode;
};

export function UpdateGate({ children }: Props) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateUrl, setUpdateUrl] = useState(DEFAULT_UPDATE_URL);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    async function runCheck() {
      const config = await checkForUpdate();
      if (!config) {
        return;
      }
      const current = getCurrentVersion();
      if (config.forceUpdate && isVersionOutdated(current, config.minimumVersion)) {
        const url =
          config.updateUrl?.trim() ||
          (Platform.OS === "android" ? PLAY_STORE_URL : getAppStoreUrl());
        setUpdateUrl(url);
        setShowUpdateModal(true);
      }
    }

    void runCheck();
  }, []);

  return (
    <>
      {children}
      <ForceUpdateModal visible={showUpdateModal} updateUrl={updateUrl} />
    </>
  );
}
