#!/usr/bin/env python3
"""Generate PWA icons and logo for VSM Ambassador."""
from __future__ import annotations

from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit("Install Pillow first: pip install pillow") from exc

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"
RED = (225, 11, 44)
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)


def _font(bold: bool, size: int):
    names = ["arialbd.ttf", "Arial Bold.ttf"] if bold else ["arial.ttf", "Arial.ttf"]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    img = Image.new("RGBA", (size, size), BLACK + (255,))
    d = ImageDraw.Draw(img)
    pad = int(size * 0.18) if maskable else int(size * 0.12)
    inner = size - 2 * pad
    d.rounded_rectangle(
        [pad, pad, pad + inner, pad + inner],
        radius=max(4, int(size * 0.08)),
        fill=RED,
    )
    font = _font(True, max(12, int(size * 0.28)))
    text = "VSM"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - tw) // 2, (size - th) // 2 - int(size * 0.02)), text, fill=WHITE, font=font)
    return img


def draw_logo() -> Image.Image:
    img = Image.new("RGBA", (176, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.text((0, 0), "VSM", fill=RED + (255,), font=_font(True, 36))
    d.text((0, 44), "AMBASSADOR", fill=WHITE + (255,), font=_font(False, 14))
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for size, name, maskable in [
        (192, "icon-192.png", False),
        (512, "icon-512.png", False),
        (192, "icon-maskable-192.png", True),
        (512, "icon-maskable-512.png", True),
    ]:
        draw_icon(size, maskable).save(OUT / name)
    draw_logo().save(OUT / "logo.png")
    draw_icon(32).save(ROOT / "public" / "favicon.png")
    print(f"Icons written to {OUT}")


if __name__ == "__main__":
    main()
