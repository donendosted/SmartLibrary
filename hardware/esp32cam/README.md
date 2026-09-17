# ESP32-CAM library-card capture client

Firmware for an **AI Thinker ESP32-CAM**. The camera polls `GET /esp` every three
seconds, captures a JPEG when the librarian queues a request, and uploads it to
`POST /esp/snapshot` as multipart form data. A status LED (GPIO 4) blinks three
times for each capture. GPIO 13 is available for a local button (wired to GND);
the button gives visual feedback, while the librarian request remains the
authoritative trigger.

## Flash configuration

1. Install Arduino IDE, add the Espressif board URL
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`,
   and install the **esp32** package.
2. Select **AI Thinker ESP32-CAM**, CPU 80 MHz, 4 MB flash, and *Huge APP*.
3. Install the **ArduinoJson** library.
4. Edit the four constants at the top of `esp32cam.ino`:
   `WIFI_SSID`, `WIFI_PASSWORD`, `API_BASE_URL` (backend origin, no trailing
   slash), and `ESP_DEVICE_TOKEN`. Use the same token as the backend's
   `ESP_DEVICE_TOKEN`; do not commit real credentials.
5. Connect a 5 V, 2 A supply and USB-to-serial adapter (TX↔RX, RX↔TX, GND).
   Hold IO0 low while resetting to flash, then release IO0 and reset again.
6. Open Serial Monitor at 115200 baud. Expected messages include Wi-Fi IP,
   `Camera initialized successfully`, and `Backend is healthy`.

## Runtime flow

The librarian frontend's Holds page creates a capture request. The device claims
the oldest pending request, blinks, captures, and uploads it with the
`X-ESP-Device-Token` header. The librarian UI polls the request and displays the
result. Test device polling with:

```bash
curl -H "X-ESP-Device-Token: $ESP_DEVICE_TOKEN" https://your-backend.onrender.com/esp
```

Never put the token in source control, screenshots, or public issue reports.
