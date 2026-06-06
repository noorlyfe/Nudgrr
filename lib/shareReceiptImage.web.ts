import * as Sharing from "expo-sharing";

type ShareReceiptImageOptions = {
  mimeType?: string;
  dialogTitle: string;
};

export async function shareReceiptImage(
  originalUri: string,
  options: ShareReceiptImageOptions
): Promise<void> {
  await Sharing.shareAsync(originalUri, {
    mimeType: options.mimeType ?? "image/png",
    dialogTitle: options.dialogTitle,
  });
}
