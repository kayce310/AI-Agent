# 🔧 Thiết Bị IoT Giá Rẻ — Research & Tích Hợp Cho Coral

**Tác giả:** Coral  
**Ngày:** 21/06/2026  
**Mục đích:** Research các thiết bị IoT giá rẻ (<$30) để tích hợp với AI Agent Coral  
**Status:** ✅ Completed Research Phase

---

## 📋 TÓMMỤC

1. [Thiết Bị IoT Giá Rẻ Phổ Biến](#thiết-bị-iot-giá-rẻ-phổ-biến)
2. [So Sánh & Lựa Chọn](#so-sánh--lựa-chọn)
3. [Cách Dùng & Lập Trình](#cách-dùng--lập-trình)
4. [Cách Tích Hợp Với AI Agent](#cách-tích-hợp-với-ai-agent)
5. [Architecture & Flow](#architecture--flow)
6. [Roadmap Thực Hiện](#roadmap-thực-hiện)

---

## 🛠️ Thiết Bị IoT Giá Rẻ Phổ Biến

### 1. **ESP32** (⭐ Recommended)
- **Giá:** $2-12 USD
- **Công nghệ:** Wi-Fi + Bluetooth BLE
- **CPU:** Dual-core (Xtensa @ 240MHz)
- **RAM:** 520KB
- **Flash:** 4MB-16MB
- **Ưu điểm:**
  - Giá siêu rẻ
  - Wi-Fi tích hợp → dễ tích hợp MQTT
  - Hỗ trợ lập trình Arduino/MicroPython
  - Có sensor analog/digital pins
  - Hỗ trợ PWM, I2C, SPI
- **Nhược điểm:**
  - RAM hạn chế (không chạy được các app lớn)
  - Không có OS (chỉ firmware)

### 2. **ESP8266** (Thế hệ cũ)
- **Giá:** 2,740₫ - 10,000₫ (~$0.11-$0.42)
- **So với ESP32:** Rẻ hơn nhưng yếu hơn (CPU chập hơn, RAM ít hơn)
- **Khuyến cáo:** Nếu bộ nhớ không yêu cầu cao thì có thể dùng

### 3. **Raspberry Pi Pico W** ($4-6)
- **Giá:** $4-6 USD
- **CPU:** ARM Cortex-M0+ (125MHz)
- **RAM:** 264KB
- **Wi-Fi:** ✅ Tích hợp (Pico W)
- **So với ESP32:** Tương đương, nhưng lập trình khác (C/C++ hoặc MicroPython)

### 4. **Cảm Biến & Actuator Kèm ESP**

| Loại | Giá | Mô tả |
|------|-----|-------|
| **DHT11** (Nhiệt độ/Độ ẩm) | 1-2$ | Accuracy: ±2°C, ±5% RH |
| **DS18B20** (Nhiệt độ) | 0.5-1$ | Accuracy: ±0.5°C, 1-wire |
| **LDR** (Ánh sáng) | 0.2-0.5$ | Analog input |
| **Motion Sensor** (PIR) | 1-2$ | Detect chuyển động |
| **Relay 5V** (Điều khiển thiết bị) | 0.5-1$ | Bật/tắt 220V AC |
| **Servo Motor** | 2-3$ | 0-180° rotation |

---

## 🔄 So Sánh & Lựa Chọn

### **Recommendation cho Coral:**

| Tiêu Chí | ESP32 | ESP8266 | Pi Pico W |
|----------|-------|---------|----------|
| **Giá** | $5-8 | $0.3-1 | $5-6 |
| **Wi-Fi** | ✅ | ✅ | ✅ (Pico W) |
| **Bluetooth** | ✅ | ❌ | ❌ |
| **RAM** | 520KB | 160KB | 264KB |
| **MQTT Support** | ✅✅ | ✅ | ✅ |
| **Dễ Lập Trình** | ✅ Arduino | ✅ Arduino | ✅ MicroPython |
| **Năng Lượng** | Trung bình | Rất thấp | Thấp |
| **Số Pins** | 34 | 11 | 26 |

### **Kết Luận:**
- **Best for Coral**: **ESP32** — rẻ, mạnh, dễ tích hợp MQTT
- **Budget Option**: **ESP8266** — siêu rẻ nếu không cần Bluetooth
- **For Edge AI**: **Raspberry Pi 5** ($85) hoặc **Jetson Orin Nano** — nếu cần AI inference

---

## 💻 Cách Dùng & Lập Trình

### **Bước 1: Setup ESP32 với Arduino IDE**

```bash
# Tải Arduino IDE: https://www.arduino.cc/en/software
# Thêm Board Manager: https://dl.espressif.com/dl/package_esp32_index.json
# Select: Tools → Board → esp32
```

### **Bước 2: Lập Trình MQTT Publish (Gửi Dữ Liệu)**

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// WiFi Setup
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Setup
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* mqtt_user = "coral_user";
const char* mqtt_password = "coral_pass";

WiFiClient espClient;
PubSubClient client(espClient);

// Sensor Setup
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // Connect WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Connect MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32_Coral", mqtt_user, mqtt_password)) {
      Serial.println("MQTT connected");
      client.subscribe("coral/commands/#"); // Subscribe to commands
    } else {
      delay(5000);
    }
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  // Handle incoming MQTT messages
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("Message: " + message);
  
  // Parse & Execute
  if (String(topic) == "coral/commands/light") {
    if (message == "ON") {
      digitalWrite(LED_PIN, HIGH);
    } else {
      digitalWrite(LED_PIN, LOW);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();
  
  // Read Sensor
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Publish to MQTT
  char json[100];
  sprintf(json, "{\"temp\": %.1f, \"humidity\": %.1f}", temp, humidity);
  client.publish("coral/sensors/dht11", json);
  
  delay(5000); // Publish every 5 seconds
}
```

### **Bước 3: Tích Hợp Relay (Điều Khiển Thiết Bị 220V)**

```cpp
#define RELAY_PIN 5

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Initially OFF
}

// Trong callback:
if (String(topic) == "coral/commands/relay") {
  if (message == "ON") {
    digitalWrite(RELAY_PIN, HIGH); // Bật relay
  } else {
    digitalWrite(RELAY_PIN, LOW);  // Tắt relay
  }
}
```

---

## 🔌 Cách Tích Hợp Với AI Agent

### **Architecture: ESP32 ↔️ MQTT Broker ↔️ Coral AI Agent**

```
┌─────────────┐
│  ESP32 +    │  ← Publish: coral/sensors/*
│  Sensors    │  ← Subscribe: coral/commands/*
└──────┬──────┘
       │ MQTT
       ▼
┌──────────────────┐
│ MQTT Broker      │  (Home Assistant, EMQX, Mosquitto)
│ (Localhost or    │
│  Cloud)          │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│  Coral AI Agent      │
│  - Listen to topics  │
│  - Process commands  │
│  - Send control msg  │
└──────────────────────┘
```

### **Step-by-Step Integration**

#### **1. Setup MQTT Broker (Mosquitto)**

```bash
# Option 1: Docker
docker run -d --name mosquitto -p 1883:1883 eclipse-mosquitto

# Option 2: Home Assistant + Mosquitto Add-on
# Settings → Add-ons → Mosquitto Broker
```

#### **2. Home Assistant Integration (MQTT Discovery)**

```yaml
# configuration.yaml
mqtt:
  broker: localhost
  port: 1883
  username: coral_user
  password: coral_pass
  discovery: true
  discovery_prefix: homeassistant
```

**ESP32 sẽ auto-discover:**
- Temperature sensor → `homeassistant/sensor/esp32_temp/config`
- Relay switch → `homeassistant/switch/esp32_light/config`

#### **3. Coral Agent → MQTT Control**

```python
# Python Script for Coral
import paho.mqtt.client as mqtt
import json

class CoralMQTTBridge:
    def __init__(self):
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.connect("localhost", 1883)
        
    def on_connect(self, client, userdata, flags, rc):
        print("Connected to MQTT")
        client.subscribe("coral/sensors/#")
    
    def on_message(self, client, userdata, msg):
        payload = json.loads(msg.payload.decode())
        print(f"[Sensor] {msg.topic}: {payload}")
        
        # Coral AI Logic Here
        if payload['temp'] > 30:
            self.turn_on_ac()
    
    def turn_on_ac(self):
        msg = json.dumps({"cmd": "ON", "temp": 22})
        self.client.publish("coral/commands/ac", msg)
        print("AC turned ON")
    
    def run(self):
        self.client.loop_forever()

bridge = CoralMQTTBridge()
bridge.run()
```

---

## 🏗️ Architecture & Flow

### **Full Integration Flow**

```
┌─────────────────────────────────────────────────────────┐
│                   CORAL AI AGENT                        │
│  (Telegram Bot / Python Backend / API Server)           │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │  MQTT Commands   │
        │ (JSON Payload)   │
        └────────┬─────────┘
                 │
        ┌────────▼──────────────────┐
        │  MQTT Broker              │
        │  (EMQX / Mosquitto)       │
        │  Topics:                  │
        │  - coral/sensors/*        │
        │  - coral/commands/*       │
        └────────┬──────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│ESP32+  │  │ESP32+  │  │ESP32+  │
│Sensor1 │  │Sensor2 │  │Relay   │
└────────┘  └────────┘  └────────┘
```

### **Sequence Diagram**

```
User (Telegram)
    │ "Turn on lights"
    ▼
Coral AI Agent
    │ Parse intent → "light_on"
    ▼
MQTT Publish: coral/commands/light → {"cmd": "ON"}
    │
    ▼
MQTT Broker
    │ Route message
    ▼
ESP32 (Light Controller)
    │ Receive & Execute
    ▼
Relay Switch → 220V Light ON
    │
    ▼
ESP32 Publish: coral/sensors/light → {"status": "ON"}
    │
    ▼
MQTT Broker
    │
    ▼
Coral AI Agent (Listen)
    │ Confirm to user
    ▼
Telegram: "Light turned ON ✅"
```

---

## 📦 Cách Setup Home Assistant (Optional Hub)

### **Why Home Assistant?**
- ✅ Central hub for all MQTT devices
- ✅ Beautiful UI + Automations
- ✅ Works with Coral AI Agent

### **Install & Configure**

```bash
# Option 1: Docker
docker run -d \
  --name homeassistant \
  -p 8123:8123 \
  -v /path/to/config:/config \
  homeassistant/home-assistant:latest

# Option 2: RPi / Synology
# Download from https://www.home-assistant.io/installation/
```

### **Add MQTT Integration**

```yaml
# config/configuration.yaml
mqtt:
  broker: localhost
  username: coral_user
  password: coral_pass

automation:
  - alias: "AC Auto-Control"
    trigger:
      platform: numeric_state
      entity_id: sensor.temperature
      above: 30
    action:
      service: mqtt.publish
      data:
        topic: coral/commands/ac
        payload: '{"cmd": "ON", "temp": 22}'
```

---

## 🚀 Roadmap Thực Hiện

### **Phase 1: Hardware Foundation** (Week 1-2)
- [ ] Mua ESP32 + DHT11 + Relay
- [ ] Lập trình & test MQTT publish/subscribe
- [ ] Setup Mosquitto broker locally
- [ ] Confirm data flow: ESP32 → MQTT → Coral

### **Phase 2: AI Integration** (Week 3-4)
- [ ] Viết Python bridge: MQTT ↔️ Coral AI
- [ ] Parse natural language commands → MQTT topics
- [ ] Test: "Turn on AC" → MQTT message → ESP32 relay ON

### **Phase 3: Telegram Integration** (Week 5-6)
- [ ] Connect Telegram Bot → Coral AI
- [ ] User commands via Telegram → MQTT → Device
- [ ] Device feedback → Telegram notification

### **Phase 4: Scale & Polish** (Week 7-8)
- [ ] Add Home Assistant UI
- [ ] Multi-device management
- [ ] Voice commands (TTS/ASR)
- [ ] Deploy to production

---

## 📝 Shopping List (Budget)

| Item | Qty | Price (USD) | Link |
|------|-----|------------|------|
| ESP32 Dev Board | 3 | $5 × 3 = $15 | AliExpress |
| DHT11 Sensor | 3 | $1.5 × 3 = $4.5 | AliExpress |
| 5V Relay | 3 | $0.8 × 3 = $2.4 | AliExpress |
| USB Cable | 3 | $0.5 × 3 = $1.5 | Local |
| **TOTAL** | | **~$23.4** | |

---

## 🔗 Tài Liệu Tham Khảo

- **Home Assistant MQTT**: https://www.home-assistant.io/integrations/mqtt
- **ESP32 + MCP Over MQTT**: https://emqx.medium.com/building-your-ai-companion-with-esp32-mcp-over-mqtt-part-4
- **MCP2MQTT Bridge**: https://github.com/mcp2everything/mcp2mqtt
- **ESPHome**: https://esphome.io/
- **Mosquitto Broker**: https://mosquitto.org/

---

## ✅ Kết Luận

**Coral có thể kiểm soát thiết bị thực bằng cách:**
1. **User** gửi command qua Telegram
2. **Coral AI** hiểu intent → generate MQTT message
3. **MQTT Broker** route message đến **ESP32**
4. **ESP32** điều khiển relay → bật/tắt thiết bị 220V
5. **Feedback** trở lại Coral → thông báo user

**Chi phí:** ~$23 cho 3 board đầu tiên  
**Timeline:** 8 tuần implement đầy đủ  
**Next Step:** Đặt hàng hardware & bắt đầu Phase 1 ✨



---
#iot #esp32 #mqtt #home-assistant #coral-integration #smart-home