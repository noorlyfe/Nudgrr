/**
 * Renders the Nudgrr app icon (1024×1024) — premium torn receipt.
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

const MONO_FONT = path.join(root, "assets/fonts/SpaceMono_400Regular.ttf");
if (!GlobalFonts.registerFromPath(MONO_FONT, "SpaceMono")) {
  throw new Error(`Failed to register font: ${MONO_FONT}`);
}

const C = {
  bg: "#161616",
  paper: "#F2EDE4",
  paperLight: "#F6F2EA",
  paperShadow: "#EAE4DA",
  line: "#C9C4BB",
  accent: "#E4B045",
};

const RECEIPT = {
  left: 224,
  top: 158,
  width: 576,
  height: 709,
  cornerR: 10,
  waveAmp: 4.5,
  waveLen: 15,
  waveDrop: 15,
};

const LINE_ITEMS = [
  { label: "Item 01", price: "$8.50" },
  { label: "Item 02", price: "$24.00" },
  { label: "Item 03", price: "$6.75" },
  { label: "Item 04", price: "$15.25" },
  { label: "TOTAL", price: "$54.50", total: true },
];

const ROW_Y = [0.26, 0.38, 0.5, 0.62, 0.74];

const TEAR_NOISE = [
  0.12, -0.38, 0.55, -0.21, 0.67, -0.44, 0.31, -0.58, 0.09, -0.72, 0.48, -0.15,
  0.63, -0.33, 0.26, -0.61, 0.41, -0.08, 0.74, -0.49, 0.19, -0.56, 0.52, -0.27,
  0.36, -0.65, 0.14, -0.42, 0.59, -0.18, 0.71, -0.35, 0.23, -0.68, 0.46, -0.11,
];

function hash(i) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Saw-blade inner tear for one half.
 * @param {"left"|"right"} side — which half owns this inner edge
 * @param nearGapX — x of the shallow point closest to the gap (preserves min gap width)
 */
function buildSawBladeEdge(yTop, yBottom, side, nearGapX, seed) {
  const points = [{ x: nearGapX + TEAR_NOISE[seed % TEAR_NOISE.length] * 3, y: yTop }];
  let y = yTop;
  let shallow = true;
  let i = 0;

  while (y < yBottom - 6) {
    const n1 = TEAR_NOISE[(i + seed) % TEAR_NOISE.length];
    const n2 = TEAR_NOISE[(i * 4 + seed + 5) % TEAR_NOISE.length];
    const n3 = TEAR_NOISE[(i * 7 + seed + 13) % TEAR_NOISE.length];
    const stepY = 14 + Math.abs(n1) * 4;
    y = Math.min(y + stepY, yBottom);
    const depth = 34 + Math.abs(n2) * 12 + Math.abs(n3) * 5;

    let x;
    if (shallow) {
      x = nearGapX + n1 * 7 + n3 * 3;
      points.push({ x, y });
    } else {
      x = side === "left" ? nearGapX - depth + n2 * 8 : nearGapX + depth + n2 * 8;
      points.push({ x, y });
      if (y < yBottom - 10) {
        const jagY = Math.min(y + 6 + Math.abs(n3) * 5, yBottom);
        const jagDepth = depth * (0.62 + Math.abs(n1) * 0.25);
        const jagX =
          side === "left" ? nearGapX - jagDepth + n3 * 5 : nearGapX + jagDepth + n3 * 5;
        points.push({ x: jagX, y: jagY });
      }
    }
    shallow = !shallow;

    i += 1;
  }

  points.push({ x: nearGapX + TEAR_NOISE[(seed + 11) % TEAR_NOISE.length] * 2, y: yBottom });
  return points;
}

/** Independent saw-blade tears with ≥40px dark gap between innermost points. */
function buildTearEdges(yTop, yBottom) {
  const cx = RECEIPT.left + RECEIPT.width / 2;
  const gapHalf = 24;
  const leftEdge = buildSawBladeEdge(yTop, yBottom, "left", cx - gapHalf, 0);
  const rightEdge = buildSawBladeEdge(yTop, yBottom, "right", cx + gapHalf, 23);
  return { leftEdge, rightEdge };
}

function appendJaggedEdge(ctx, points, startIdx = 1) {
  for (let i = startIdx; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
}

function perforationY(px, left, waveY) {
  const t = (px - left) / RECEIPT.waveLen;
  return waveY + Math.sin(t * Math.PI * 2) * RECEIPT.waveAmp;
}

function tracePerforation(ctx, fromX, toX, left, waveY) {
  const step = fromX <= toX ? 1.5 : -1.5;
  for (let px = fromX; step > 0 ? px <= toX : px >= toX; px += step) {
    ctx.lineTo(px, perforationY(px, left, waveY));
  }
}

function receiptOutlinePath(ctx, left, top, width, height) {
  const right = left + width;
  const bottom = top + height;
  const waveY = bottom - RECEIPT.waveDrop;
  const r = RECEIPT.cornerR;

  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.lineTo(right - r, top);
  ctx.arcTo(right, top, right, top + r, r);
  ctx.lineTo(right, waveY);
  tracePerforation(ctx, right, left, left, waveY);
  ctx.lineTo(left, top + r);
  ctx.arcTo(left, top, left + r, top, r);
  ctx.closePath();
}

function halfClipPath(ctx, side, leftEdge, rightEdge, left, top, width, height) {
  const right = left + width;
  const waveY = top + height - RECEIPT.waveDrop;
  const r = RECEIPT.cornerR;
  const edge = side === "left" ? leftEdge : rightEdge;
  const edgeBottomX = edge[edge.length - 1].x;

  ctx.beginPath();
  if (side === "left") {
    ctx.moveTo(left + r, top);
    ctx.lineTo(edge[0].x, edge[0].y);
    appendJaggedEdge(ctx, edge, 1);
    ctx.lineTo(edgeBottomX, perforationY(edgeBottomX, left, waveY));
    tracePerforation(ctx, edgeBottomX - 1.5, left, left, waveY);
    ctx.lineTo(left, top + r);
    ctx.arcTo(left, top, left + r, top, r);
  } else {
    ctx.moveTo(edge[0].x, edge[0].y);
    ctx.lineTo(right - r, top);
    ctx.arcTo(right, top, right, top + r, r);
    ctx.lineTo(right, waveY);
    tracePerforation(ctx, right, edgeBottomX, left, waveY);
    for (let i = edge.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(edge[i].x, edge[i].y);
    }
  }
  ctx.closePath();
}

function drawPaperFill(ctx, left, top, width, height) {
  receiptOutlinePath(ctx, left, top, width, height);
  const grad = ctx.createLinearGradient(left, top, left + width, top + height);
  grad.addColorStop(0, C.paperLight);
  grad.addColorStop(0.45, C.paper);
  grad.addColorStop(1, C.paperShadow);
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawPaperTexture(ctx, left, top, width, height) {
  ctx.save();
  receiptOutlinePath(ctx, left, top, width, height);
  ctx.clip();

  ctx.globalAlpha = 0.028;
  for (let i = 0; i < 9000; i += 1) {
    const x = left + hash(i) * width;
    const y = top + hash(i * 3 + 17) * height;
    ctx.fillStyle = hash(i * 11) > 0.5 ? C.paperLight : C.paperShadow;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.globalAlpha = 0.018;
  for (let i = 0; i < 120; i += 1) {
    const x = left + hash(i * 19) * width;
    const y = top + hash(i * 23) * height;
    const w = 8 + hash(i * 29) * 24;
    ctx.fillStyle = C.paperShadow;
    ctx.fillRect(x, y, w, 1);
  }

  ctx.restore();
}

function drawReceiptText(ctx, left, top, width, padX) {
  const innerL = left + padX;
  const innerR = left + width - padX;
  const fontSize = 27;

  ctx.font = `${fontSize}px SpaceMono`;
  ctx.textBaseline = "middle";

  LINE_ITEMS.forEach((item, idx) => {
    const y = top + RECEIPT.height * ROW_Y[idx];
    ctx.fillStyle = item.total ? C.accent : C.line;
    ctx.textAlign = "left";
    ctx.fillText(item.label, innerL, y);
    ctx.textAlign = "right";
    ctx.fillText(item.price, innerR, y);
  });
}

function drawTotalAccent(ctx, left, top, width, padX) {
  const innerL = left + padX;
  const innerR = left + width - padX;
  const totalY = top + RECEIPT.height * 0.835;

  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2.25;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(innerL, totalY);
  ctx.lineTo(innerR, totalY);
  ctx.stroke();
}

function drawHalf(ctx, side, leftEdge, rightEdge) {
  const { left, top, width, height } = RECEIPT;

  ctx.save();
  halfClipPath(ctx, side, leftEdge, rightEdge, left, top, width, height);
  ctx.clip();

  drawPaperFill(ctx, left, top, width, height);
  drawPaperTexture(ctx, left, top, width, height);
  drawReceiptText(ctx, left, top, width, 36);
  drawTotalAccent(ctx, left, top, width, 36);

  ctx.restore();
}

function render() {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const tearTop = RECEIPT.top + RECEIPT.cornerR + 2;
  const tearBottom = RECEIPT.top + RECEIPT.height - RECEIPT.waveDrop - 4;
  const { leftEdge, rightEdge } = buildTearEdges(tearTop, tearBottom);

  drawHalf(ctx, "left", leftEdge, rightEdge);
  drawHalf(ctx, "right", leftEdge, rightEdge);

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
    .flatten({ background: { r: 0x16, g: 0x16, b: 0x16 } })
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
  const outDir = path.join(root, "assets", "images");
  fs.mkdirSync(outDir, { recursive: true });

  const targets = [
    path.join(outDir, "icon.png"),
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
