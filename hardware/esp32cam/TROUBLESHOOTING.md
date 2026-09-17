# ESP32-CAM troubleshooting

## No serial output

- Confirm 5 V power (a laptop USB port may brown out during capture).
- Cross TX/RX and share GND; use 115200 baud.
- GPIO0 must be low only while flashing, then high for normal boot.

## Camera initialization failed

- Select **AI Thinker ESP32-CAM**; other pin maps are incompatible.
- Reseat the OV2640 ribbon cable with contacts facing the connector contacts.
- Use a stable 5 V / 2 A supply. Repeated brownouts usually indicate a weak
  regulator or USB cable.

## Backend health check fails

- `API_BASE_URL` must be the HTTPS backend origin with no trailing slash.
- Verify the Render service is awake and that `/esp` is reachable.
- Ensure the firmware token exactly matches backend `ESP_DEVICE_TOKEN`.
- Check Wi-Fi DNS and captive-portal restrictions; ESP32 cannot pass a login
  portal automatically.

## Capture is not uploaded

- Queue a request from Librarian → Holds → **Add** first; the button alone only
  blinks the LED because it cannot create a server request without credentials.
- Keep the camera within Wi-Fi range and avoid pressing reset during upload.
- If memory is low, change `FRAMESIZE_VGA` to `FRAMESIZE_QVGA`, set
  `jpeg_quality` to 12–16, or reduce `fb_count` to 1.

## Invalid token (401)

Generate a new token and update both systems, then redeploy/reflash:

```bash
openssl rand -hex 32
```

Store it only in Render environment variables and the local, uncommitted
firmware configuration.
