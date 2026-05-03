from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BG = (14, 14, 14)
ACCENT = (245, 200, 66)
TEXT = "T$"


def _pick_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def _draw_monogram(canvas: Image.Image, font_size_ratio: float = 0.42) -> None:
    draw = ImageDraw.Draw(canvas)
    w, h = canvas.size
    font_size = int(min(w, h) * font_size_ratio)
    font = _pick_font(font_size)

    bbox = draw.textbbox((0, 0), TEXT, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (w - text_w) / 2 - bbox[0]
    y = (h - text_h) / 2 - bbox[1]

    draw.text((x, y), TEXT, font=font, fill=ACCENT)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    assets = root / "assets"
    assets.mkdir(parents=True, exist_ok=True)

    icon = Image.new("RGB", (1024, 1024), BG)
    _draw_monogram(icon)
    icon.save(assets / "icon.png", optimize=True)

    adaptive = Image.new("RGB", (1024, 1024), BG)
    _draw_monogram(adaptive)
    adaptive.save(assets / "adaptive-icon.png", optimize=True)

    splash = Image.new("RGB", (2200, 2200), BG)
    _draw_monogram(splash, font_size_ratio=0.34)
    splash.save(assets / "splash.png", optimize=True)


if __name__ == "__main__":
    main()
