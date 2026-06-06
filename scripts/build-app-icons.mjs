/**
 * Builds app icons from assets/_source-app-icon.png:
 * - Removes warm cream/beige background (opaque pixels outside the receipt)
 * - Trims transparent margins
 * - Scales with "cover" to 1024×1024 so artwork fills the square
 *
 * Run: node scripts/build-app-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "assets", "_source-app-icon.png");

/** Only remove the outer squircle cream — tight thresholds so receipt ink / tan bars stay. */
function shouldMakeTransparent(r, g, b, a) {
  if (a < 12) return true;
  const sum = r + g + b;
  if (sum < 125) return false;
  if (r > 244 && g > 240 && b > 232) return false;
  if (r > 230 && g > 175 && b < 155 && r - b > 70) return false;

  const pairs = [
    [[206, 180, 145], 22],
    [[235, 221, 200], 26],
    [[225, 208, 178], 20],
    [[218, 198, 165], 18],
  ];
  for (const [[refR, refG, refB], maxD] of pairs) {
    if (Math.hypot(r - refR, g - refG, b - refB) < maxD) return true;
  }
  return false;
}

async function removeBackgroundToBuffer(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const copy = Buffer.from(data);
  for (let i = 0; i < copy.length; i += 4) {
    const r = copy[i];
    const g = copy[i + 1];
    const b = copy[i + 2];
    const a = copy[i + 3];
    if (shouldMakeTransparent(r, g, b, a)) {
      copy[i] = 0;
      copy[i + 1] = 0;
      copy[i + 2] = 0;
      copy[i + 3] = 0;
    }
  }
  return sharp(copy, { raw: { width, height, channels } });
}

async function main() {
  if (!fs.existsSync(source)) {
    console.error("Missing", source);
    process.exit(1);
  }

  let pipeline = await removeBackgroundToBuffer(source);
  pipeline = pipeline.trim();

  const icon1024 = await pipeline
    .clone()
    .resize(1024, 1024, {
      fit: "cover",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const outIcon = path.join(root, "assets", "icon.png");
  const outAdaptive = path.join(root, "assets", "adaptive-icon.png");
  const outIos = path.join(
    root,
    "ios",
    "Nudgrr",
    "Images.xcassets",
    "AppIcon.appiconset",
    "App-Icon-1024x1024@1x.png"
  );

  fs.writeFileSync(outIcon, icon1024);
  fs.writeFileSync(outAdaptive, icon1024);
  fs.writeFileSync(outIos, icon1024);

  const androidSizes = [
    ["mipmap-mdpi", 108],
    ["mipmap-hdpi", 162],
    ["mipmap-xhdpi", 216],
    ["mipmap-xxhdpi", 324],
    ["mipmap-xxxhdpi", 432],
  ];

  const fgBase = await removeBackgroundToBuffer(source);
  const fgTrim = fgBase.trim();

  for (const [folder, size] of androidSizes) {
    const buf = await fgTrim
      .clone()
      .resize(size, size, { fit: "cover", position: "centre" })
      .webp({ quality: 92 })
      .toBuffer();
    const dir = path.join(root, "android", "app", "src", "main", "res", folder);
    fs.writeFileSync(path.join(dir, "ic_launcher_foreground.webp"), buf);
    fs.writeFileSync(path.join(dir, "ic_launcher.webp"), buf);
    fs.writeFileSync(path.join(dir, "ic_launcher_round.webp"), buf);
  }

  console.log("Wrote:", outIcon, outAdaptive, outIos);
  console.log("Wrote Android mipmaps (webp) for mdpi–xxxhdpi");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
