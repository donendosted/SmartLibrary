#include "esp_camera.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

// ---- User configuration -------------------------------------------------
const char *WIFI_SSID = "YOUR_WIFI_SSID";
const char *WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char *BACKEND_BASE_URL = "https://your-backend.example.com";
const char *DEVICE_TOKEN = "replace-with-long-random-token";
// -------------------------------------------------------------------------

constexpr uint32_t POLL_INTERVAL_MS = 3000;
constexpr int LED_PIN = 4; // AI-Thinker onboard flash LED (active low)

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

uint32_t lastPoll = 0;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.printf("\nConnected: %s\n", WiFi.localIP().toString().c_str());
}

bool setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_SVGA;
  config.jpeg_quality = 10;
  config.fb_count = psramFound() ? 2 : 1;
  config.grab_mode = CAMERA_GRAB_LATEST;

  return esp_camera_init(&config) == ESP_OK;
}

bool uploadImage(camera_fb_t *frame, const String &requestId) {
  WiFiClient client;
  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/esp/snapshot";
  if (!http.begin(client, url)) return false;
  http.addHeader("X-ESP-Device-Token", DEVICE_TOKEN);

  String boundary = "----SmartLibraryBoundary";
  String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"request_id\"\r\n\r\n" + requestId + "\r\n";
  head += "--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"library-card.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  int total = head.length() + frame->len + tail.length();
  WiFiClient *stream = http.getStreamPtr();
  // HTTPClient's POST(uint8_t*, size) cannot prepend multipart sections, so
  // build the small envelope in a temporary buffer and stream the JPEG.
  uint8_t *payload = (uint8_t *)malloc(total);
  if (!payload) { http.end(); return false; }
  memcpy(payload, head.c_str(), head.length());
  memcpy(payload + head.length(), frame->buf, frame->len);
  memcpy(payload + head.length() + frame->len, tail.c_str(), tail.length());
  int status = http.POST(payload, total);
  free(payload);
  http.end();
  Serial.printf("Upload response: %d\n", status);
  return status >= 200 && status < 300;
}

void pollBackend() {
  if (WiFi.status() != WL_CONNECTED) { connectWiFi(); return; }
  HTTPClient http;
  WiFiClient client;
  if (!http.begin(client, String(BACKEND_BASE_URL) + "/esp")) return;
  http.addHeader("X-ESP-Device-Token", DEVICE_TOKEN);
  int status = http.GET();
  if (status != 200) { http.end(); return; }
  DynamicJsonDocument doc(512);
  if (deserializeJson(doc, http.getString())) { http.end(); return; }
  bool active = doc["capture"] | false;
  String requestId = "";
  if (doc["request"].is<JsonObject>()) {
    requestId = doc["request"]["id"] | "";
  }
  http.end();
  if (!active) return;

  digitalWrite(LED_PIN, LOW);
  camera_fb_t *frame = esp_camera_fb_get();
  if (frame) {
    uploadImage(frame, requestId);
    esp_camera_fb_return(frame);
  }
  digitalWrite(LED_PIN, HIGH);
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  if (!setupCamera()) { Serial.println("Camera init failed"); while (true) delay(1000); }
  connectWiFi();
}

void loop() {
  if (millis() - lastPoll >= POLL_INTERVAL_MS) {
    lastPoll = millis();
    pollBackend();
  }
  delay(10);
}
