import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const SHARE_PATH = `${FileSystem.cacheDirectory}nudgrr-receipt.png`;

type ShareReceiptImageOptions = {
  mimeType?: string;
  dialogTitle: string;
};

/** Copy receipt PNG to a stable filename before sharing (fixes Android cache-path names). */
export async function shareReceiptImage(
  originalUri: string,
  options: ShareReceiptImageOptions
): Promise<void> {
  const shareOptions = {
    mimeType: options.mimeType ?? "image/png",
    dialogTitle: options.dialogTitle,
  };

  if (Platform.OS === "android") {
    await FileSystem.deleteAsync(SHARE_PATH, { idempotent: true });
    await FileSystem.copyAsync({ from: originalUri, to: SHARE_PATH });
    await Sharing.shareAsync(SHARE_PATH, shareOptions);
    return;
  }

  await Sharing.shareAsync(originalUri, shareOptions);
}
