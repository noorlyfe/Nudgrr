/**
 * Renders the Nudgrr app icon (1024×1024) — cream receipt inside dark-mode chat bubble.
 * Run: node scripts/generate-nudgrr-icon.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";

const SIZE = 1024;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const BOLD_FONT = path.join(root, "assets/fonts/Inter_700Bold.ttf");
if (!GlobalFonts.registerFromPath(BOLD_FONT, "InterBold")) {
  throw new Error(`Failed to register font: ${BOLD_FONT}`);
}

const C = {
  bg: "#FFF9F0",
  bubble: "#565048",
  bubbleBorder: "#E5A000",
  receipt: "#FFF9F0",
  receiptBorder: "#E5A000",
  itemLine: "rgba(100, 90, 78, 0.42)",
  totalLine: "rgba(80, 72, 62, 0.72)",
  brandText: "#1C1917",
};

const BUBBLE = {
  width: Math.round(SIZE * 0.75),
  height: Math.round(SIZE * 0.62),
  radius: 96,
  offsetY: -44,
  tailWidth: 88,
  tailHeight: 76,
};

const RECEIPT = {
  insetX: 6,
  insetY: 8,
  waveAmp: 9,
  waveLen: 14,
  waveDepth: 12,
};

function traceZigzagEdge(ctx, xStart, xEnd, baseY, amp, halfLen, outwardSign) {
  const peakY = baseY - outwardSign * amp;
  const valleyY = baseY + outwardSign * amp;
  const dir = xEnd >= xStart ? 1 : -1;
  let x = xStart;
  let atPeak = false;

  while (true) {
    atPeak = !atPeak;
    x = dir > 0 ? Math.min(x + halfLen, xEnd) : Math.max(x - halfLen, xEnd);
    ctx.lineTo(x, atPeak ? peakY : valleyY);
    if (x === xEnd) break;
  }
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const right = x + width;
  const bottom = y + height;
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(right - r, y);
  ctx.arcTo(right, y, right, y + r, r);
  ctx.lineTo(right, bottom - r);
  ctx.arcTo(right, bottom, right - r, bottom, r);
  ctx.lineTo(x + r, bottom);
  ctx.arcTo(x, bottom, x, bottom - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function getReceiptBounds(bubbleCx, bubbleCy) {
  const receiptW = BUBBLE.width - RECEIPT.insetX * 2;
  const receiptH = BUBBLE.height - RECEIPT.insetY * 2;
  const left = Math.round(bubbleCx - receiptW / 2);
  const top = Math.round(bubbleCy - BUBBLE.height / 2 + RECEIPT.insetY);
  const radius = Math.max(8, BUBBLE.radius - RECEIPT.insetX);
  return { left, top, receiptW, receiptH, radius };
}

function receiptPath(ctx, left, top, width, height, wave) {
  const right = left + width;
  const bottom = top + height;
  const topWave = top + wave.waveDepth;
  const bottomWave = bottom - wave.waveDepth;
  const halfLen = wave.waveLen / 2;

  ctx.beginPath();
  ctx.moveTo(left, topWave + wave.waveAmp);
  traceZigzagEdge(ctx, left, right, topWave, wave.waveAmp, halfLen, 1);
  ctx.lineTo(right, bottomWave - wave.waveAmp);
  traceZigzagEdge(ctx, right, left, bottomWave, wave.waveAmp, halfLen, -1);
  ctx.closePath();
}

function drawChatBubblePath(ctx, cx, cy, w, h, r, tailW, tailH) {
  const left = cx - w / 2;
  const top = cy - h / 2;
  const right = left + w;
  const bottom = top + h;
  const tailBase = left + r + 18;

  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.lineTo(right - r, top);
  ctx.arcTo(right, top, right, top + r, r);
  ctx.lineTo(right, bottom - r);
  ctx.arcTo(right, bottom, right - r, bottom, r);
  ctx.lineTo(tailBase + tailW, bottom);
  ctx.lineTo(left - 18, bottom + tailH);
  ctx.lineTo(tailBase, bottom);
  ctx.lineTo(left + r, bottom);
  ctx.arcTo(left, bottom, left, bottom - r, r);
  ctx.lineTo(left, top + r);
  ctx.arcTo(left, top, left + r, top, r);
  ctx.closePath();

  return { cx, cy };
}

function drawBackground(ctx) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);
}

function drawChatBubble(ctx) {
  const cx = SIZE / 2;
  const cy = SIZE / 2 + BUBBLE.offsetY;

  drawChatBubblePath(
    ctx,
    cx,
    cy,
    BUBBLE.width,
    BUBBLE.height,
    BUBBLE.radius,
    BUBBLE.tailWidth,
    BUBBLE.tailHeight,
  );
  ctx.fillStyle = C.bubble;
  ctx.fill();

  ctx.strokeStyle = C.bubbleBorder;
  ctx.lineWidth = 10;
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.stroke();

  return { cx, cy };
}

function drawTrackedWordmark(ctx, text, centerX, baselineY, fontSize, color) {
  const tracking = fontSize * -0.038;
  ctx.font = `700 ${fontSize}px InterBold`;
  ctx.fillStyle = color;
  ctx.textBaseline = "bottom";
  ctx.textAlign = "left";

  const widths = [];
  let totalWidth = 0;
  for (const ch of text) {
    const w = ctx.measureText(ch).width;
    widths.push(w);
    totalWidth += w;
  }
  totalWidth += tracking * (text.length - 1);

  let x = centerX - totalWidth / 2;
  for (let i = 0; i < text.length; i += 1) {
    ctx.fillText(text[i], x, baselineY);
    x += widths[i] + tracking;
  }
}

function drawReceipt(ctx, bubbleCx, bubbleCy) {
  const { left, top, receiptW, receiptH, radius } = getReceiptBounds(bubbleCx, bubbleCy);
  const wave = RECEIPT;

  ctx.save();
  roundedRectPath(ctx, left, top, receiptW, receiptH, radius);
  ctx.clip();

  ctx.fillStyle = C.receipt;
  receiptPath(ctx, left, top, receiptW, receiptH, wave);
  ctx.fill();

  const padX = receiptW * 0.1;
  const innerL = left + padX;
  const innerR = left + receiptW - padX;
  const bodyTop = top + wave.waveDepth + 6;
  const bodyBottom = top + receiptH - wave.waveDepth - 6;
  const bodyHeight = bodyBottom - bodyTop;

  const itemCount = 4;
  const itemZoneHeight = bodyHeight * 0.62;
  const itemGap = itemZoneHeight / (itemCount + 1);

  ctx.lineCap = "butt";
  for (let i = 0; i < itemCount; i += 1) {
    const y = bodyTop + itemGap * (i + 1);
    ctx.strokeStyle = C.itemLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(innerL, y);
    ctx.lineTo(innerR, y);
    ctx.stroke();
  }

  const brandSize = Math.round(receiptW * 0.2);
  const brandY = bodyTop + bodyHeight * 0.76;

  ctx.strokeStyle = C.totalLine;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(innerL, brandY);
  ctx.lineTo(innerR, brandY);
  ctx.stroke();

  drawTrackedWordmark(ctx, "NUDGRR", left + receiptW / 2, brandY - 3, brandSize, C.brandText);

  ctx.restore();

  roundedRectPath(ctx, left, top, receiptW, receiptH, radius);
  ctx.strokeStyle = C.receiptBorder;
  ctx.lineWidth = 7;
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  ctx.stroke();
}

function render() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx);
  const { cx, cy } = drawChatBubble(ctx);
  drawReceipt(ctx, cx, cy);

  return canvas.toBuffer("image/png");
}

const ANDROID_SIZES = [
  ["mipmap-mdpi", 48],
  ["mipmap-hdpi", 72],
  ["mipmap-xhdpi", 96],
  ["mipmap-xxhdpi", 144],
  ["mipmap-xxxhdpi", 192],
];

async function flattenIcon(png) {
  return sharp(png)
    .flatten({ background: { r: 0xff, g: 0xf9, b: 0xf0 } })
    .png()
    .toBuffer();
}

async function syncNativeIcons(png) {
  const iosIconDir = path.join(root, "ios", "Nudgrr", "Images.xcassets", "AppIcon.appiconset");
  const iosLight = path.join(iosIconDir, "App-Icon-1024x1024@1x.png");
  const iosDark = path.join(iosIconDir, "App-Icon-dark-1024x1024@1x.png");

  fs.writeFileSync(iosLight, png);
  fs.writeFileSync(iosDark, png);
  console.log("Wrote", iosLight);
  console.log("Wrote", iosDark);

  for (const [folder, size] of ANDROID_SIZES) {
    const dir = path.join(root, "android", "app", "src", "main", "res", folder);
    const webp = await sharp(png).resize(size, size).webp({ quality: 92 }).toBuffer();
    for (const name of ["ic_launcher.webp", "ic_launcher_round.webp"]) {
      const dest = path.join(dir, name);
      fs.writeFileSync(dest, webp);
      console.log("Wrote", dest);
    }
  }
}

async function main() {
  const png = await flattenIcon(render());
  fs.mkdirSync(path.join(root, "assets", "images"), { recursive: true });

  const targets = [
    path.join(root, "assets", "images", "icon.png"),
    path.join(root, "assets", "adaptive-icon.png"),
    path.join(root, "assets", "icon.png"),
    path.join(root, "assets", "icon-dark.png"),
    path.join(root, "assets", "nudgrr-icon-1024.png"),
  ];

  for (const dest of targets) {
    fs.writeFileSync(dest, png);
    console.log("Wrote", dest);
  }

  await syncNativeIcons(png);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
