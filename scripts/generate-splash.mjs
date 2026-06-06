/**
 * Renders assets/splash.png (1242×2688) for expo-splash-screen.
 * Typography matches app wordmark: Inter_700Bold + label-style tagline.
 * Run: node scripts/generate-splash.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

const require = createRequire(import.meta.url);
const splash = require("../constants/splashTypography.js");

const W = splash.designWidth;
const H = 2688;
/** Must match `getColors().background` / `accent` in constants/theme.ts */
const BG = "#1A1710";
const TEXT = "#D9A52B";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const INTER_BOLD = path.join(
  root,
  "node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"
);
const INTER_SEMIBOLD = path.join(
  root,
  "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"
);

/** App `typography.wordmark` / label — see constants/splashTypography.js */
const WORDMARK_SIZE = splash.wordmarkSize;
const WORDMARK_LETTER_SPACING = splash.wordmarkKern;
const TAGLINE_SIZE = splash.taglineSize;
const TAGLINE_LETTER_SPACING = splash.taglineKern;

function registerFont(filePath, family) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing font file: ${filePath}`);
  }
  GlobalFonts.registerFromPath(filePath, family);
  return family;
}

function drawSpacedText(ctx, text, centerX, y, letterSpacingPx) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total =
    widths.reduce((a, b) => a + b, 0) + letterSpacingPx * Math.max(0, chars.length - 1);
  let x = centerX - total / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += widths[i] + letterSpacingPx;
  }
}

function main() {
  const interBold = registerFont(INTER_BOLD, "InterBold");
  const interSemi = registerFont(INTER_SEMIBOLD, "InterSemiBold");

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const cx = W / 2;
  const cy = H / 2;

  ctx.fillStyle = TEXT;
  ctx.font = `${WORDMARK_SIZE}px "${interBold}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  drawSpacedText(ctx, splash.titleText, cx, cy - 40, WORDMARK_LETTER_SPACING);

  ctx.font = `${TAGLINE_SIZE}px "${interSemi}"`;
  drawSpacedText(ctx, splash.taglineText, cx, cy + 62, TAGLINE_LETTER_SPACING);

  const out = path.join(root, "assets", "splash.png");
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("Wrote", out, `(${W}×${H})`);
}

main();
