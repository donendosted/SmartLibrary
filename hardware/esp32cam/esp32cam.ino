#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"

// Fill these values before flashing. Never commit real credentials.
const char* WIFI_SSID = "Jab we net";
const char* WIFI_PASSWORD = "ohlovely";
// Use the backend origin only (no trailing slash). The API is also exposed at /esp.
const char* API_BASE_URL = "https://smartlibrary-umx9.onrender.com/";
const char* ESP_DEVICE_TOKEN = "2fe1395cbbb73867d0e7984fbb11b81cef47da6df3181c30b86e42024c391523";

constexpr uint8_t TRIGGER_BUTTON_PIN = 13; // button to GND, internal pull-up
constexpr uint8_t STATUS_LED_PIN = 4;      // AI Thinker onboard flash LED
constexpr unsigned long POLL_INTERVAL_MS = 3000;
constexpr unsigned long HEALTH_INTERVAL_MS = 60000;

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
  if (esp_camera_init(&c) != ESP_OK) {
    Serial.println("Camera initialization failed; restarting");
    delay(2000);
    ESP.restart();
  }
}

void blink(uint8_t times) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(200);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(200);
  }
}

bool backendHealthy() {
  HTTPClient client;
  client.setTimeout(5000);
  if (!client.begin(String(API_BASE_URL) + "/esp")) return false;
  client.addHeader("X-ESP-Device-Token", ESP_DEVICE_TOKEN);
  const int status = client.GET();
  client.end();
  return status == HTTP_CODE_OK;
}

bool queueButtonCapture() {
  HTTPClient client;
  client.setTimeout(5000);
  if (!client.begin(String(API_BASE_URL) + "/esp/trigger")) return false;
  client.addHeader("X-ESP-Device-Token", ESP_DEVICE_TOKEN);
  client.addHeader("Content-Type", "application/json");
  const int status = client.POST("{}");
  client.end();
  return status >= 200 && status < 300;
}

bool uploadCapture(const String& requestId) {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return false;
  }

  HTTPClient upload;
  upload.setTimeout(15000);
  const String url = String(API_BASE_URL) + "/esp/snapshot";
  if (!upload.begin(url)) {
    esp_camera_fb_return(fb);
    return false;
  }
  const String boundary = "----SmartLibraryESP32Boundary";
  upload.addHeader("X-ESP-Device-Token", ESP_DEVICE_TOKEN);
  upload.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  const String head = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"request_id\"\r\n\r\n" + requestId +
                      "\r\n--" + boundary + "\r\nContent-Disposition: form-data; name=\"image\"; filename=\"library-card.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n";
  const String tail = "\r\n--" + boundary + "--\r\n";
  const size_t total = head.length() + fb->len + tail.length();
  uint8_t* body = static_cast<uint8_t*>(malloc(total));
  if (!body) {
    esp_camera_fb_return(fb);
    upload.end();
    return false;
  }
  memcpy(body, head.c_str(), head.length());
  memcpy(body + head.length(), fb->buf, fb->len);
  memcpy(body + head.length() + fb->len, tail.c_str(), tail.length());
  const int status = upload.POST(body, total);
  Serial.printf("Snapshot upload HTTP status: %d\n", status);
  free(body);
  upload.end();
  esp_camera_fb_return(fb);
  return status >= 200 && status < 300;
}

void pollForCapture() {
  HTTPClient poll;
  poll.setTimeout(5000);
  if (!poll.begin(String(API_BASE_URL) + "/esp")) return;
  poll.addHeader("X-ESP-Device-Token", ESP_DEVICE_TOKEN);
  const int status = poll.GET();
  if (status == HTTP_CODE_OK) {
    DynamicJsonDocument doc(1536);
    if (!deserializeJson(doc, poll.getString()) && doc["capture"] == true) {
      const String requestId = doc["requestId"].as<String>();
      Serial.printf("SCAN TRIGGERED (request %s)\n", requestId.c_str());
      blink(3);
      Serial.println(uploadCapture(requestId) ? "Capture uploaded" : "Capture upload failed");
    }
  } else if (status > 0) {
    Serial.printf("ESP poll HTTP status: %d\n", status);
  }
  poll.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIGGER_BUTTON_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print('.'); }
  Serial.printf("\nWi-Fi connected: %s\n", WiFi.localIP().toString().c_str());
  setupCamera();
  Serial.println("Camera initialized successfully");
}

void loop() {
  static unsigned long lastPoll = 0, lastHealth = 0;
  static bool buttonWasDown = false;
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); delay(2000); return; }
  const bool buttonDown = digitalRead(TRIGGER_BUTTON_PIN) == LOW;
  if (buttonDown && !buttonWasDown) {
    Serial.println(queueButtonCapture() ? "SCAN REQUEST QUEUED" : "SCAN REQUEST FAILED");
    blink(3);
    lastPoll = 0;
  }
  buttonWasDown = buttonDown;
  const unsigned long now = millis();
  if (now - lastHealth >= HEALTH_INTERVAL_MS || lastHealth == 0) {
    Serial.println(backendHealthy() ? "Backend is healthy" : "Backend health check failed");
    lastHealth = now;
  }
  if (now - lastPoll >= POLL_INTERVAL_MS || lastPoll == 0) { pollForCapture(); lastPoll = now; }
  delay(25);
}
