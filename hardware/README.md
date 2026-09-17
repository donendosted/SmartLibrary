# Smart Library ESP32-CAM

This folder contains an Arduino sketch for the AI-Thinker ESP32-CAM. The
device polls the backend for a pending library-card capture request and uploads
one JPEG frame when a request is active.

## Wiring (AI-Thinker ESP32-CAM)

- Insert a micro-SD card only if you need local diagnostics (the sketch does
  not require one).
- To flash, connect `GPIO0` to `GND`, upload, then disconnect GPIO0 and reset.
- Power from a stable 5 V supply capable of at least 500 mA. Avoid powering
  the camera from a weak 3.3 V USB-serial adapter.

The sketch uses the standard AI-Thinker pin map and the onboard camera LED on
`GPIO 4` (active-low). Adjust `LED_PIN` if your board revision differs.

## Configure and upload

1. Install Arduino IDE 2.x, the **ESP32 by Espressif Systems** board core, and
   the **ArduinoJson** library (Library Manager).
2. Select **AI Thinker ESP32-CAM** and a partition scheme with at least 3 MB
   application space.
3. Edit the constants at the top of `esp32cam.ino`:
   `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_BASE_URL`, and `DEVICE_TOKEN`.
4. Upload, open Serial Monitor at 115200 baud, and remove GPIO0 from GND.

`BACKEND_BASE_URL` should be the backend origin without a trailing slash, for
example `https://smart-library-api.onrender.com`.

## Backend contract

Every `POLL_INTERVAL_MS` the camera sends:

```http
GET /esp
X-Device-Token: <DEVICE_TOKEN>
```

The response is JSON. A capture is requested with:

```json
{"active":true,"requestId":"optional-id"}
```

When active, the camera enables its LED, captures a JPEG, and sends:

```http
POST /esp
X-Device-Token: <DEVICE_TOKEN>
Content-Type: multipart/form-data; boundary=...
```

The multipart field is named `image`; `requestId` is included as a text field.
The backend should return `2xx` and mark the request fulfilled. Any failure is
retried on the next poll; the camera never stores credentials or images in
flash.

Create a long random device token and configure the same value as the
backend's `ESP_DEVICE_TOKEN` environment variable. Keep this token private.
