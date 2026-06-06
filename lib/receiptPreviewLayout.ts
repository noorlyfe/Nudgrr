export type ReceiptPreviewLayout = {
  imgW: number;
  imgH: number;
  marginH: number;
};

export const RECEIPT_PREVIEW_MARGIN_H = 20;

/** Extra inset so zigzag edges are not clipped in split preview. */
const FIT_SCREEN_EDGE_INSET = 28;

/** Logical width for receipt capture and preview (points). */
export function getReceiptCaptureWidth(windowWidth: number): number {
  return Math.min(300, Math.max(260, windowWidth - RECEIPT_PREVIEW_MARGIN_H * 2 - 12));
}

/**
 * ViewShot PNGs are often @2/@3 of logical capture width — normalize for preview sizing.
 */
export function normalizeCapturedReceiptSize(
  intrinsic: { width: number; height: number },
  captureWidth: number
): { width: number; height: number } {
  let { width: w, height: h } = intrinsic;
  if (w <= 0 || h <= 0) {
    return { width: captureWidth, height: captureWidth * 1.35 };
  }
  const scale = w / captureWidth;
  const rounded = Math.round(scale);
  if (rounded >= 2 && rounded <= 4 && Math.abs(scale - rounded) < 0.35) {
    w /= rounded;
    h /= rounded;
  }
  return { width: w, height: h };
}

export type ReceiptPreviewLayoutMode = "fitScreen" | "scrollable";

/**
 * fitScreen — scale down to fit modal (split tab).
 * scrollable — readable width, natural height, vertical scroll (waiting game).
 */
export function computeReceiptPreviewLayout(
  intrinsic: { width: number; height: number } | null,
  captureWidth: number,
  windowWidth: number,
  windowHeight: number,
  mode: ReceiptPreviewLayoutMode = "fitScreen",
  chromeHeight = 200
): ReceiptPreviewLayout {
  const marginH = RECEIPT_PREVIEW_MARGIN_H;

  const base = intrinsic
    ? normalizeCapturedReceiptSize(intrinsic, captureWidth)
    : { width: captureWidth, height: captureWidth * 1.35 };

  let maxW: number;
  if (mode === "scrollable") {
    maxW = windowWidth - marginH * 2 - 8;
  } else {
    maxW = Math.min(captureWidth, windowWidth - marginH * 2) - FIT_SCREEN_EDGE_INSET;
  }
  maxW = Math.max(220, maxW);

  let imgW = Math.min(base.width, maxW);
  let imgH = (base.height / base.width) * imgW;

  if (mode === "fitScreen") {
    const maxH = Math.max(220, windowHeight - chromeHeight);
    if (imgH > maxH) {
      const scale = maxH / imgH;
      imgH = maxH;
      imgW *= scale;
    }
  }

  return {
    imgW: Math.round(imgW),
    imgH: Math.round(imgH),
    marginH,
  };
}

/** @2x export width only — preserves aspect ratio (no vertical squash). */
export function getReceiptCaptureExportWidth(captureWidth: number) {
  return Math.round(captureWidth * 2);
}
