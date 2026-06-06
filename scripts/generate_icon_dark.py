#!/usr/bin/env python3
"""Generate assets/icon-dark.png from assets/icon.png for iOS dark mode."""

from __future__ import annotations

import colorsys
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "icon.png"
DST = ROOT / "assets" / "icon-dark.png"

# Target palette
BG_DARK = (0x1A, 0x17, 0x10)  # outer white/cream background
RECEIPT = (0x25, 0x22, 0x18)  # light beige receipt fill
INK = (0xF0, 0xE6, 0xD3)  # outlines, text, dashed lines


def luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def is_golden(r: int, g: int, b: int, a: int) -> bool:
    """Preserve golden/yellow ray pixels (e.g. #D9A52B)."""
    if a < 128:
        return False
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    # Yellow–gold hue band; needs clear saturation and brightness
    return (
        0.06 <= h <= 0.18
        and s >= 0.32
        and v >= 0.32
        and r >= 120
        and g >= 70
        and b <= 140
        and r > g > b * 0.55
    )


def is_dark_ink(r: int, g: int, b: int, a: int) -> bool:
    if a < 128:
        return False
    if luminance(r, g, b) < 95:
        return True
    # Near-black with low chroma (anti-aliased strokes)
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return v < 0.38 and s < 0.35


def is_outer_background(r: int, g: int, b: int, a: int) -> bool:
    """White / cream area outside the receipt."""
    if a < 128:
        return True
    lum = luminance(r, g, b)
    # Brightest warm creams and near-whites
    if lum >= 243:
        return True
    if r >= 250 and g >= 238 and b >= 218:
        return True
    return False


def map_pixel(r: int, g: int, b: int, a: int) -> tuple[int, int, int, int]:
    if a < 128:
        return (*BG_DARK, 255)

    if is_golden(r, g, b, a):
        return (r, g, b, 255)

    if is_dark_ink(r, g, b, a):
        return (*INK, 255)

    if is_outer_background(r, g, b, a):
        return (*BG_DARK, 255)

    # Remaining light warm tones → receipt body, zigzag fill, etc.
    return (*RECEIPT, 255)


def main() -> None:
    if not SRC.exists():
        print(f"Missing source icon: {SRC}", file=sys.stderr)
        sys.exit(1)

    img = Image.open(SRC).convert("RGBA")
    out = Image.new("RGBA", img.size)
    px_in = img.load()
    px_out = out.load()
    w, h = img.size

    for y in range(h):
        for x in range(w):
            px_out[x, y] = map_pixel(*px_in[x, y])

    DST.parent.mkdir(parents=True, exist_ok=True)
    out.save(DST, "PNG")
    print(f"Wrote {DST.relative_to(ROOT)} ({w}x{h})")


if __name__ == "__main__":
    main()
