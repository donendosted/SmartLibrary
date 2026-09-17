#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* API_BASE_URL = "https://your-backend.onrender.com";
const char* ESP_DEVICE_TOKEN = "replace-with-ESP_DEVICE_TOKEN";

// AI-Thinker ESP32-CAM pin map.
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

void setupCamera() {
  camera_config_t c;
  c.ledc_channel = LEDC_CHANNEL_0; c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM; c.pin_vsync = VSYNC_GPIO_NUM; c.pin_href = HREF_GPIO_NUM;
  c.pin_sscb_sda = SIOD_GPIO_NUM; c.pin_sscb_scl = SIOC_GPIO_NUM; c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000; c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = FRAMESIZE_VGA; c.jpeg_quality = 10; c.fb_count = 1;
  if (esp_camera_init(&c) != ESP_OK) ESP.restart();
}

void setup() {
  Serial.begin(115200); WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  setupCamera();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); delay(2000); return; }
  HTTPClient poll; poll.begin(String(API_BASE_URL) + "/esp");
  poll.addHeader("X-ESP-Device-Token", ESP_DEVICE_TOKEN);
  int status = poll.GET(); String body = poll.getString(); poll.end();
  if (status == 200) {
    DynamicJsonDocument doc(1024); if (!deserializeJson(doc, body) && doc["capture"] == true) {
      String requestId = doc["request"]["id"].as<String>(); camera_fb_t* fb = esp_camera_fb_get();
      if (fb) {
        HTTPClient upload; upload.begin(String(API_BASE_URL) + "/esp/snapshot");
        upload.addHeader("X-ESP-Device-Token", ESP_DEVICE_TOKEN);
        String boundary = "----ESP32Boundary"; upload.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
        String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"request_id\"\r\n\r\n" + requestId + "\r\n--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"library-card.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
        String tail = "\r\n--" + boundary + "--\r\n"; uint8_t* data = (uint8_t*)malloc(head.length() + fb->len + tail.length());
        memcpy(data, head.c_str(), head.length()); memcpy(data + head.length(), fb->buf, fb->len); memcpy(data + head.length() + fb->len, tail.c_str(), tail.length());
        upload.POST(data, head.length() + fb->len + tail.length()); free(data); upload.end(); esp_camera_fb_return(fb);
      }
    }
  }
  delay(3000);
}
