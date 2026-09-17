#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "esp_camera.h"

// ============================================================
// CONFIG
// ============================================================

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// IMPORTANT: NO trailing slash
const char* API_BASE_URL = "https://your-backend.onrender.com";

const char* ESP_DEVICE_TOKEN = "YOUR_64_CHAR_ESP_DEVICE_TOKEN";

constexpr uint8_t TRIGGER_BUTTON_PIN = 13;
constexpr uint8_t STATUS_LED_PIN = 4;

constexpr unsigned long POLL_INTERVAL_MS = 5000;
constexpr unsigned long HEALTH_INTERVAL_MS = 60000;

// ============================================================
// AI THINKER ESP32-CAM PINS
// ============================================================

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5

#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ============================================================
// LED
// ============================================================

void blink(uint8_t times) {
  Serial.printf("LED BLINK x%d\n", times);

  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(250);

    digitalWrite(STATUS_LED_PIN, LOW);
    delay(250);
  }
}

// ============================================================
// CAMERA
// ============================================================

void setupCamera() {
  camera_config_t c;

  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;

  c.pin_d0 = Y2_GPIO_NUM;
  c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM;
  c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM;
  c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM;
  c.pin_d7 = Y9_GPIO_NUM;

  c.pin_xclk = XCLK_GPIO_NUM;
  c.pin_pclk = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM;

  c.pin_sscb_sda = SIOD_GPIO_NUM;
  c.pin_sscb_scl = SIOC_GPIO_NUM;

  c.pin_pwdn = PWDN_GPIO_NUM;
  c.pin_reset = RESET_GPIO_NUM;

  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_JPEG;

  c.frame_size = FRAMESIZE_VGA;
  c.jpeg_quality = 10;
  c.fb_count = 1;

  Serial.println("Initializing camera...");

  esp_err_t err = esp_camera_init(&c);

  if (err != ESP_OK) {
    Serial.printf("Camera initialization FAILED: 0x%x\n", err);
    delay(2000);
    ESP.restart();
  }

  Serial.println("Camera initialized successfully");
}

// ============================================================
// HTTPS CLIENT
// ============================================================

bool beginHTTPS(HTTPClient& client, WiFiClientSecure& secureClient, const String& url) {
  // For testing. This skips certificate verification.
  // Once everything works, replace this with proper CA verification.
  secureClient.setInsecure();

  client.setTimeout(15000);

  if (!client.begin(secureClient, url)) {
    Serial.printf("HTTP begin FAILED: %s\n", url.c_str());
    return false;
  }

  client.addHeader("X-ESP-Device-Token", ESP_DEVICE_TOKEN);

  return true;
}

// ============================================================
// BACKEND HEALTH
// ============================================================

bool backendHealthy() {
  WiFiClientSecure secureClient;
  HTTPClient client;

  const String url = String(API_BASE_URL) + "/esp";

  Serial.printf("Health GET: %s\n", url.c_str());

  if (!beginHTTPS(client, secureClient, url)) {
    return false;
  }

  int status = client.GET();

  Serial.printf("Health HTTP status: %d\n", status);

  if (status > 0) {
    Serial.printf("Health response: %s\n", client.getString().c_str());
  }

  client.end();

  return status == HTTP_CODE_OK;
}

// ============================================================
// BUTTON -> BACKEND TRIGGER
// ============================================================

bool queueButtonCapture() {
  WiFiClientSecure secureClient;
  HTTPClient client;

  const String url = String(API_BASE_URL) + "/esp/trigger";

  Serial.printf("POST trigger: %s\n", url.c_str());

  if (!beginHTTPS(client, secureClient, url)) {
    return false;
  }

  client.addHeader("Content-Type", "application/json");

  int status = client.POST("{}");

  Serial.printf("Trigger HTTP status: %d\n", status);

  if (status > 0) {
    Serial.printf("Trigger response: %s\n", client.getString().c_str());
  }

  client.end();

  return status >= 200 && status < 300;
}

// ============================================================
// IMAGE UPLOAD
// ============================================================

bool uploadCapture(const String& requestId) {

  Serial.printf("Capturing image for request: %s\n", requestId.c_str());

  camera_fb_t* fb = esp_camera_fb_get();

  if (!fb) {
    Serial.println("Camera capture FAILED");
    return false;
  }

  Serial.printf("Image captured: %u bytes\n", fb->len);

  WiFiClientSecure secureClient;
  HTTPClient upload;

  const String url = String(API_BASE_URL) + "/esp/snapshot";

  Serial.printf("Uploading to: %s\n", url.c_str());

  if (!beginHTTPS(upload, secureClient, url)) {
    esp_camera_fb_return(fb);
    return false;
  }

  const String boundary = "----SmartLibraryESP32Boundary";

  upload.addHeader(
      "Content-Type",
      "multipart/form-data; boundary=" + boundary
  );

  const String head =
      "--" + boundary + "\r\n"
      "Content-Disposition: form-data; name=\"request_id\"\r\n"
      "\r\n" +
      requestId +
      "\r\n"
      "--" + boundary + "\r\n"
      "Content-Disposition: form-data; name=\"image\"; filename=\"library-card.jpg\"\r\n"
      "Content-Type: image/jpeg\r\n"
      "\r\n";

  const String tail =
      "\r\n--" + boundary + "--\r\n";

  const size_t total =
      head.length() +
      fb->len +
      tail.length();

  uint8_t* body = (uint8_t*)malloc(total);

  if (!body) {
    Serial.println("Failed to allocate upload buffer");

    esp_camera_fb_return(fb);
    upload.end();

    return false;
  }

  memcpy(body, head.c_str(), head.length());
  memcpy(body + head.length(), fb->buf, fb->len);
  memcpy(
      body + head.length() + fb->len,
      tail.c_str(),
      tail.length()
  );

  int status = upload.POST(body, total);

  Serial.printf("Snapshot upload HTTP status: %d\n", status);

  if (status > 0) {
    Serial.printf(
        "Snapshot response: %s\n",
        upload.getString().c_str()
    );
  }

  free(body);
  upload.end();

  esp_camera_fb_return(fb);

  return status >= 200 && status < 300;
}

// Acknowledge the poll response after the LED signal. This lets the backend
// know the device consumed the request while keeping it in `capturing` state
// until the image upload completes.
bool acknowledgeCapture(const String& requestId) {
  WiFiClientSecure secureClient;
  HTTPClient client;
  if (!beginHTTPS(client, secureClient, String(API_BASE_URL) + "/esp/ack")) return false;
  client.addHeader("Content-Type", "application/json");
  DynamicJsonDocument body(256);
  body["request_id"] = requestId;
  body["active"] = false;
  String payload;
  serializeJson(body, payload);
  const int status = client.POST(payload);
  client.end();
  return status >= 200 && status < 300;
}

// ============================================================
// POLL BACKEND
// ============================================================

void pollForCapture() {

  WiFiClientSecure secureClient;
  HTTPClient poll;

  const String url = String(API_BASE_URL) + "/esp";

  Serial.printf("Polling: %s\n", url.c_str());

  if (!beginHTTPS(poll, secureClient, url)) {
    Serial.println("Poll connection FAILED");
    return;
  }

  int status = poll.GET();

  Serial.printf("Poll HTTP status: %d\n", status);

  if (status <= 0) {
    Serial.printf(
        "Poll network error: %s\n",
        poll.errorToString(status).c_str()
    );

    poll.end();
    return;
  }

  String response = poll.getString();

  Serial.printf("Poll response: %s\n", response.c_str());

  if (status == HTTP_CODE_OK) {

    DynamicJsonDocument doc(2048);

    DeserializationError error =
        deserializeJson(doc, response);

    if (error) {
      Serial.printf(
          "JSON parse FAILED: %s\n",
          error.c_str()
      );

      poll.end();
      return;
    }

    bool capture = doc["capture"] | false;

    Serial.printf(
        "capture = %s\n",
        capture ? "TRUE" : "FALSE"
    );

    if (capture) {

      const String requestId =
          doc["requestId"].as<String>();

      Serial.printf(
          "\n====================================\n"
          "SCAN ROUTE ACTIVE\n"
          "Request ID: %s\n"
          "====================================\n",
          requestId.c_str()
      );

      // ======================================================
      // THIS IS THE IMPORTANT PART
      // Blink immediately when backend says capture=true.
      // ======================================================

      blink(3);

      Serial.println(acknowledgeCapture(requestId)
          ? "Backend acknowledged: active=false"
          : "Backend acknowledgement failed");

      bool uploaded = uploadCapture(requestId);

      if (uploaded) {
        Serial.println("IMAGE UPLOAD SUCCESS");
      } else {
        Serial.println("IMAGE UPLOAD FAILED");
      }
    }
  }

  poll.end();
}

// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("====================================");
  Serial.println(" SmartLibrary ESP32-CAM");
  Serial.println("====================================");

  pinMode(TRIGGER_BUTTON_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED_PIN, OUTPUT);

  digitalWrite(STATUS_LED_PIN, LOW);

  // ----------------------------------------------------------
  // LED SELF TEST
  // ----------------------------------------------------------

  Serial.println("LED self-test...");
  blink(3);

  // ----------------------------------------------------------
  // WIFI
  // ----------------------------------------------------------

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  Serial.printf(
      "Wi-Fi connected: %s\n",
      WiFi.localIP().toString().c_str()
  );

  // ----------------------------------------------------------
  // CAMERA
  // ----------------------------------------------------------

  setupCamera();

  // ----------------------------------------------------------
  // BACKEND TEST
  // ----------------------------------------------------------

  Serial.println("Testing backend...");

  if (backendHealthy()) {
    Serial.println("BACKEND OK");
  } else {
    Serial.println("BACKEND FAILED");
  }
}

// ============================================================
// LOOP
// ============================================================

void loop() {

  static unsigned long lastPoll = 0;
  static unsigned long lastHealth = 0;
  static bool buttonWasDown = false;

  if (WiFi.status() != WL_CONNECTED) {

    Serial.println("Wi-Fi disconnected. Reconnecting...");

    WiFi.reconnect();

    delay(2000);

    return;
  }

  // ----------------------------------------------------------
  // PHYSICAL BUTTON
  // ----------------------------------------------------------

  bool buttonDown =
      digitalRead(TRIGGER_BUTTON_PIN) == LOW;

  if (buttonDown && !buttonWasDown) {

    Serial.println();
    Serial.println("PHYSICAL BUTTON PRESSED");

    bool queued = queueButtonCapture();

    if (queued) {
      Serial.println("SCAN REQUEST QUEUED");

    } else {
      Serial.println("SCAN REQUEST FAILED");
    }

    lastPoll = 0;
  }

  buttonWasDown = buttonDown;

  // ----------------------------------------------------------
  // TIMERS
  // ----------------------------------------------------------

  unsigned long now = millis();

  if (
      now - lastHealth >= HEALTH_INTERVAL_MS ||
      lastHealth == 0
  ) {

    Serial.println();

    if (backendHealthy()) {
      Serial.println("Backend is healthy");
    } else {
      Serial.println("Backend health check FAILED");
    }

    lastHealth = now;
  }

  if (
      now - lastPoll >= POLL_INTERVAL_MS ||
      lastPoll == 0
  ) {

    pollForCapture();

    lastPoll = now;
  }

  delay(25);
}
