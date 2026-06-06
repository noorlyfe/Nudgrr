import Constants from "expo-constants";

const UPDATE_CHECK_URL = "https://raw.githubusercontent.com/noorlyfe/nudgrr-update/main/version.json";

export type UpdateConfig = {
  minimumVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
};

export async function checkForUpdate(): Promise<UpdateConfig | null> {
  try {
    const response = await fetch(UPDATE_CHECK_URL, {
      cache: "no-cache",
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as UpdateConfig;
    return data;
  } catch {
    return null;
  }
}

export function isVersionOutdated(current: string, minimum: string): boolean {
  const toNum = (v: string) =>
    v.split(".").reduce((acc, val, i) => acc + parseInt(val, 10) * Math.pow(1000, 2 - i), 0);
  return toNum(current) < toNum(minimum);
}

export function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? "1.0.0";
}
