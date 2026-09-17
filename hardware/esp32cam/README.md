# ESP32-CAM library-card capture client

This example targets an AI-Thinker ESP32-CAM with Arduino core. Set Wi-Fi, `API_BASE_URL`, and the same `ESP_DEVICE_TOKEN` configured on the backend. The sketch polls `/esp`, captures a JPEG when a pending request arrives, and uploads it as multipart form data.

Install the `ArduinoJson` library and select **AI Thinker ESP32-CAM**. Keep the device token private.
