#!/usr/bin/env python3
"""Decode the first barcode in an image, printing its payload.

Pyzbar/libzbar are optional at development time. The API treats a missing
decoder or an image without a barcode as a normal unsuccessful scan.
"""
import sys

if len(sys.argv) < 2:
    raise SystemExit(2)

try:
    from PIL import Image
    from pyzbar.pyzbar import decode
    symbols = decode(Image.open(sys.argv[1]))
    if symbols:
        print(symbols[0].data.decode("utf-8", errors="replace"))
except Exception:
    raise SystemExit(1)
