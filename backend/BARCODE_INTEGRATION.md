# ESP32-CAM barcode integration

The backend accepts ESP32-CAM captures at both `/esp` (current firmware) and
`/backend/esp` (legacy firmware). Set a long random `ESP_DEVICE_TOKEN` in the
Render environment and configure the same secret on every trusted device.

## Flow

1. A librarian creates a request: `POST /api/admin/esp/request` with a
   librarian JWT. The optional JSON body is `{ "action": "checkout",
   "student_id": "001/26" }` (action may also be `return` or `capture`).
2. The camera polls `GET /esp` or `GET /backend/esp` with
   `X-ESP-Device-Token`. A pending request is returned once and marked
   `capturing`.
3. Upload a multipart `image` and `request_id` to `/esp/snapshot`, or send raw
   JPEG bytes to `/backend/esp/snapshot?request_id=<id>`. The token header is
   required for both formats.
4. The server stores the image in MongoDB, attempts barcode decoding with
   `scripts/decode_barcode.py`, and for checkout/return requests updates the
   normal library transaction collections. Every attempt is recorded in the
   `esp_scans` collection.

Barcode decoding uses Python Pillow + Pyzbar/libzbar when installed. If the
decoder is unavailable or no barcode is visible, the image is still retained
and the response reports `barcode: null`.

## Local decoder setup

```bash
python3 -m pip install pillow pyzbar
# Debian/Ubuntu may also need: sudo apt-get install libzbar0
python3 scripts/decode_barcode.py ./sample.jpg
```

Librarians can inspect recent attempts with `GET /api/admin/esp/scans`.
Completed images are available from `GET /api/admin/esp/:requestId/snapshot`
using a librarian JWT.
