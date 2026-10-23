#!/usr/bin/env python3
"""Generate Maya's PWA and Android launcher icons from one approved base64 WebP."""
import base64
from io import BytesIO
from pathlib import Path
from PIL import Image
import sys

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "maya-main-icon.webp.b64"

def icon():
    if not SOURCE.is_file():
        raise SystemExit("Required maya-main-icon.webp.b64 not found; not using default icon")
    img = Image.open(BytesIO(base64.b64decode(SOURCE.read_text(encoding="ascii").strip(), validate=True))).convert("RGBA")
    if img.width != img.height or img.width < 128:
        raise SystemExit("Source icon must be a square at least 128x128 pixels")
    return img

def save(img, p):
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, "PNG", optimize=True)

def web(img):
    for size in (192, 512):
        save(img.resize((size, size), Image.Resampling.LANCZOS), ROOT / f"icon-{size}.png")
    print("New Maya PWA icons created")

def android(img):
    res = ROOT / "android/app/src/main/res"
    if not res.parent.exists():
        raise SystemExit("Create the Android project first")
    for density, size in (("mdpi",48),("hdpi",72),("xhdpi",96),("xxhdpi",144),("xxxhdpi",192)):
        folder = res / f"mipmap-{density}"
        image = img.resize((size,size), Image.Resampling.LANCZOS)
        save(image, folder / "ic_launcher.png")
        save(image, folder / "ic_launcher_round.png")
        adaptive = round(size * 108 / 48)
        artwork = round(adaptive * 0.62)
        layer = Image.new("RGBA", (adaptive,adaptive), (0,0,0,0))
        layer.alpha_composite(img.resize((artwork,artwork),Image.Resampling.LANCZOS),((adaptive-artwork)//2,(adaptive-artwork)//2))
        save(layer, folder / "ic_launcher_foreground.png")
    folder = res / "mipmap-anydpi-v26"
    folder.mkdir(parents=True, exist_ok=True)
    xml = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/black" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
'''
    for name in ("ic_launcher.xml","ic_launcher_round.xml"):
        (folder / name).write_text(xml, encoding="utf-8")
    print("New Maya Android home-screen icon created")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) == 2 else "both"
    if mode not in ("web","android","both"):
        raise SystemExit("Use web, android, or both")
    img = icon()
    if mode in ("web","both"): web(img)
    if mode in ("android","both"): android(img)
