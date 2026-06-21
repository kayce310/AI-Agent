# 🔧 Hướng Dẫn Thiết Bị IoT Giá Rẻ - Nghiên Cứu Toàn Diện

**Cập nhật:** 2026-06-21  
**Mục đích:** Nghiên cứu thiết bị IoT rẻ tiền, cách sử dụng và tích hợp cho Coral AI Agent

---

## 📌 PHẦN 1: THIẾT BỊ CHÍNH (Core Components)

### 1.1 **Microcontroller - ESP32**
**Giá:** 50K-200K VND (tùy loại)

#### Đặc điểm:
- Dual-core 240MHz processor
- WiFi + Bluetooth tích hợp
- 16+ GPIO pins
- ADC (Analog-to-Digital Converter) 12-bit
- PWM support
- Deep sleep mode (tiết kiệm pin từ 10μA)

#### Các variant phổ biến:
| Model | Giá (VND) | Tính năng |
|-------|-----------|----------|
| ESP32 DevKit | 120K-150K | Cơ bản, tốt cho học tập |
| ESP32-S3 | 150K-200K | Hiệu suất cao, nhiều pin |
| ESP32-C3 | 100K-130K | Tiết kiệm pin, compact |
| TTGO/LoLin | 150K-180K | Pre-soldered, ready-to-use |

#### Ứng dụng:
- Trung tâm điều khiển IoT
- Sensor data collection
- Web server hosting
- MQTT client

---

## 📌 PHẦN 2: CÁC SENSOR GIẢI PHÁP (Sensor Solutions)

### 2.1 **Cảm Biến Nhiệt Độ & Độ Ẩm**

#### **DHT22 (Recommended)**
- **Giá:** 30K-50K VND
- **Accuracy:** ±0.5°C, ±2% humidity
- **Interface:** 1-wire protocol
- **Range:** -40°C đến 80°C

**Wiring:**
```
DHT22 VCC → ESP32 3.3V
DHT22 GND → ESP32 GND
DHT22 DATA → ESP32 GPIO5
```

**Code Example:**
```cpp
#include "DHT.h"
#define DHTPIN 5
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

void setup() {
  dht.begin();
}

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  Serial.print("Temp: ");
  Serial.print(t);
  Serial.print(" | Humidity: ");
  Serial.println(h);
  delay(2000);
}
```

### 2.2 **Cảm Biến Ánh Sáng**

#### **BH1750 (16-bit Digital Light Sensor)**
- **Giá:** 40K-60K VND
- **Range:** 1-65535 lux
- **Interface:** I2C (SDA/SCL)
- **Độ chính xác:** ±20%

**Wiring:**
```
BH1750 VCC → ESP32 3.3V
BH1750 GND → ESP32 GND
BH1750 SDA → ESP32 GPIO21
BH1750 SCL → ESP32 GPIO22
```

### 2.3 **Cảm Biến Độ Ẩm Đất**

#### **Capacitive Soil Moisture Sensor**
- **Giá:** 25K-40K VND
- **Output:** Analog (0-4095 ADC value)
- **Độ bền:** Chống ăn mòn
- **Ứng dụng:** Tưới cây tự động

**Wiring:**
```
Sensor VCC → ESP32 3.3V
Sensor GND → ESP32 GND
Sensor AO → ESP32 GPIO35 (ADC)
```

### 2.4 **Cảm Biến Chuyển Động (PIR)**

#### **HC-SR501 Motion Sensor**
- **Giá:** 30K-50K VND
- **Range:** 5-7 meters
- **Output:** Digital (HIGH/LOW)
- **Delay time:** Configurable (5-300s)

**Wiring:**
```
HC-SR501 VCC → ESP32 3.3V
HC-SR501 GND → ESP32 GND
HC-SR501 OUT → ESP32 GPIO4
```

### 2.5 **Cảm Biến Áp Suất & Nhiệt Độ**

#### **BMP280 Atmospheric Pressure Sensor**
- **Giá:** 50K-80K VND
- **Measures:** Temperature, Pressure, Altitude
- **Interface:** I2C/SPI
- **Accuracy:** ±1hPa pressure, ±1°C temp

### 2.6 **Cảm Biến Khoảng Cách**

#### **HC-SR04 Ultrasonic Sensor**
- **Giá:** 35K-60K VND
- **Range:** 2cm - 400cm
- **Accuracy:** ±3mm
- **Interface:** 2 pins (TRIG, ECHO)

---

## 📌 PHẦN 3: THIẾT BỊ ĐIỀU KHIỂN (Control Devices)

### 3.1 **Relay Module**

#### **5V 2-Channel Relay Module (with Optocoupler)**
- **Giá:** 50K-100K VND
- **Load:** AC 220V / 10A max
- **Input Signal:** 3.3V-5V logic
- **Isolation:** Optocoupler protection

**Wiring (Normally Open Configuration):**
```
Relay VCC → ESP32 5V (VIN)
Relay GND → ESP32 GND
Relay JD-VCC → ESP32 5V (power the electromagnet)
Relay IN1 → ESP32 GPIO26
Relay IN2 → ESP32 GPIO27

// High voltage side:
Relay COM → Live wire (AC)
Relay NO → Device positive
Device negative → Neutral (direct)
```

**Code:**
```cpp
const int RELAY_PIN = 26;

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Relay OFF (normally open)
}

void loop() {
  digitalWrite(RELAY_PIN, LOW);  // Turn ON (current flows)
  delay(5000);
  digitalWrite(RELAY_PIN, HIGH); // Turn OFF
  delay(5000);
}
```

### 3.2 **OLED Display**

#### **0.96" SSD1306 I2C OLED Display (128x64)**
- **Giá:** 50K-80K VND
- **Interface:** I2C
- **Resolution:** 128x64 pixels
- **Colors:** Monochrome (white/black)

**Wiring:**
```
OLED VCC → ESP32 3.3V
OLED GND → ESP32 GND
OLED SDA → ESP32 GPIO21
OLED SCL → ESP32 GPIO22
```

**Quick Code:**
```cpp
#include <Adafruit_SSD1306.h>
#include <Adafruit_GFX.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.display();
  delay(2000);
  display.clearDisplay();
}

void loop() {
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Hello IoT!");
  display.display();
  delay(1000);
}
```

### 3.3 **Push Button & Switch**

#### **Tactile Push Button**
- **Giá:** 2K-5K VND
- **Debounce:** Required (100-200ms)
- **Interface:** GPIO digital input

---

## 📌 PHẦN 4: CÁCH TÍCH HỢP (Integration Architecture)

### 4.1 **Basic System Architecture**

```
┌─────────────────────────────────────────┐
│        Sensor Layer (Bottom)            │
│ DHT22 | BH1750 | Soil | PIR | BMP280    │
└──────────────┬──────────────────────────┘
               │ I2C / Analog / Digital
               ▼
┌─────────────────────────────────────────┐
│     ESP32 Microcontroller (Core)        │
│ - Read sensor data                      │
│ - Process & analyze                     │
│ - Store in memory/SD card               │
│ - WiFi/BLE communication                │
└──────────────┬──────────────────────────┘
               │ GPIO outputs
               ▼
┌─────────────────────────────────────────┐
│      Control Layer (Top)                │
│ Relay | LED | OLED | Motors | Buzzers  │
└─────────────────────────────────────────┘
```

### 4.2 **WiFi Setup (Arduino IDE)**

**Step 1: Install Board**
- Arduino IDE → Preferences
- Add URL: `https://dl.espressif.com/dl/package_esp32_index.json`
- Board Manager → Search ESP32 → Install

**Step 2: Select Board & Port**
- Tools → Board → ESP32 Dev Module
- Tools → Port → COM[X]
- Tools → Upload Speed → 921600

**Step 3: WiFi Connection Code**
```cpp
#include <WiFi.h>

const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");
  Serial.println(WiFi.localIP());
}

void loop() {}
```

### 4.3 **MQTT Integration**

**Broker Setup:**
- Use Mosquitto (free, open-source)
- Or cloud service: HiveMQ, Adafruit IO

**ESP32 MQTT Code:**
```cpp
#include <PubSubClient.h>
#include <WiFi.h>

WiFiClient espClient;
PubSubClient client(espClient);

const char* mqtt_server = "broker.hivemq.com";
const char* topic_pub = "home/esp32/temperature";
const char* topic_sub = "home/esp32/relay";

void reconnect() {
  while (!client.connected()) {
    if (client.connect("ESP32Client")) {
      client.subscribe(topic_sub);
    } else {
      delay(5000);
    }
  }
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  
  // Publish temperature
  float temp = dht.readTemperature();
  client.publish(topic_pub, String(temp).c_str());
  
  client.loop();
  delay(2000);
}
```

### 4.4 **Home Assistant Integration (ESPHome)**

**Setup Flow:**
1. Install ESPHome add-on
2. Create new device configuration (.yaml)
3. Compile & flash to ESP32
4. Auto-discovery in Home Assistant

**Example YAML:**
```yaml
esphome:
  name: esp32-living-room

esp32:
  board: esp32doit-devkit-v1

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

sensor:
  - platform: dht
    pin: GPIO5
    temperature:
      name: "Temperature"
    humidity:
      name: "Humidity"

switch:
  - platform: gpio
    pin: GPIO26
    name: "Relay 1"
```

---

## 📌 PHẦN 5: GIỐNG THỰC TẾ (Real-World Examples)

### 5.1 **Smart Home - Smart Watering System**

**Components:**
- ESP32 + DHT22 + Soil Moisture + Relay + Pump

**Logic:**
```
IF soil_moisture < 50% AND temperature > 25°C
  THEN enable relay → water pump ON
ELSE
  relay OFF
```

**Cost Breakdown (Vietnam 2026):**
| Item | Giá VND |
|------|---------|
| ESP32 | 150K |
| DHT22 | 40K |
| Soil Sensor | 35K |
| Relay Module | 80K |
| Water Pump | 150K |
| Wiring/Housing | 50K |
| **TOTAL** | **≈ 505K** |

### 5.2 **Smart Agriculture Monitoring**

**Setup:** 6 sensor nodes in farm, central hub
- **Range:** WiFi 100m line-of-sight
- **Update rate:** 5 min intervals
- **Data storage:** Local SD card + cloud

### 5.3 **Motion Detection Alert System**

**Components:**
- ESP32 + PIR + Relay + Buzzer + OLED

---

## 📌 PHẦN 6: WIRELESS PROTOCOLS - LỰA CHỌN

| Protocol | Range | Power | Cost | Latency | Ưu điểm |
|----------|-------|-------|------|---------|---------|
| **WiFi** | 100m | High | Low | <100ms | Rộng, internet access |
| **BLE** | 50m | Low | Low | <50ms | Tiết kiệm pin |
| **LoRaWAN** | 10km | Very low | Medium | 1-2s | Ultra long range |
| **Zigbee** | 100m | Very low | Medium | <250ms | Mesh capability |
| **ESP-NOW** | 250m | Low | Free | <50ms | Direct P2P (ESP only) |

**Recommendation for Coral:**
- **Primary:** WiFi (simplest setup)
- **Backup:** BLE (low power)
- **Advanced:** ESP-NOW (direct mesh)

---

## 📌 PHẦN 7: POWER MANAGEMENT

### 7.1 **Deep Sleep Mode**
```cpp
// Wake after 10 minutes
esp_sleep_enable_timer_wakeup(10 * 60 * 1000000);
esp_light_sleep_start();
```
**Current draw:** 10μA (vs 80mA active)

### 7.2 **Battery Life Calculation**
```
Example: 2000mAh battery
- Active mode (100ms): 80mA
- Sleep mode (99.9s): 10μA
- Cycle: 100s

Average current = (0.1 * 80 + 99.9 * 0.01) / 100 = 0.089mA
Battery life = 2000mAh / 0.089mA ≈ 22,500 hours ≈ 2.5 years
```

---

## 📌 PHẦN 8: SECURITY BEST PRACTICES

### 8.1 **WiFi Security**
```cpp
WiFi.begin(ssid, password, 6, NULL, true); // WPA2
// Enable Protected Management Frames (PMF)
```

### 8.2 **MQTT Security**
- Use credentials (username/password)
- Enable TLS/SSL encryption
- Avoid hardcoding in code (use config file)

### 8.3 **OTA (Over-The-Air) Updates**
```cpp
#include <ArduinoOTA.h>

ArduinoOTA.begin();
// In loop:
ArduinoOTA.handle();
```

---

## 📌 PHẦN 9: COMMON ISSUES & SOLUTIONS

| Problem | Cause | Solution |
|---------|-------|----------|
| WiFi not connecting | Poor cable / Wrong password | Use quality USB cable, verify WiFi details |
| Sensor reading 0 | Wiring issue | Check I2C address (I2C scanner), SDA/SCL |
| Relay not triggering | Logic reversed | Swap HIGH/LOW, or change NO→NC config |
| Frequent resets | Memory leak / Power issue | Check stack usage, upgrade power supply |
| GPIO25 toggling fast | WiFi interference | Use GPIO outside WiFi conflict range |

---

## 📌 PHẦN 10: RECOMMENDED STARTER KIT

**Cấu hình tối ưu cho học tập IoT:**

```
┌─────────────────────────────────────────┐
│   CORAL IoT STARTER KIT (≈ 700K VND)    │
├─────────────────────────────────────────┤
│ 1. ESP32 Dev Module              150K   │
│ 2. DHT22 Sensor                   40K   │
│ 3. BH1750 Light Sensor            50K   │
│ 4. PIR Motion Sensor              40K   │
│ 5. HC-SR04 Ultrasonic             50K   │
│ 6. 2-Channel Relay Module        100K   │
│ 7. SSD1306 OLED Display           70K   │
│ 8. Jumper Wires + Breadboard      50K   │
│ 9. USB Cable + Adapter            40K   │
│ 10. Resistors/Caps Assortment     30K   │
│ 11. 5V Power Supply              100K   │
│ 12. Documentation/Samples         FREE  │
├─────────────────────────────────────────┤
│ TOTAL:                          ≈ 720K │
└─────────────────────────────────────────┘
```

---

## 📌 PHẦN 11: NEXT STEPS FOR CORAL

### Phase 1: Foundation
- [ ] Source components (order from Shopee/Tiki)
- [ ] Setup Arduino IDE + ESP32 board
- [ ] Test basic LED blink & serial communication

### Phase 2: Sensors
- [ ] DHT22 temperature reading
- [ ] BH1750 light level monitoring
- [ ] Combine multiple sensors into one sketch

### Phase 3: Control
- [ ] Relay module control
- [ ] Web server to control relay
- [ ] OLED display integration

### Phase 4: Integration
- [ ] WiFi + MQTT setup
- [ ] Home Assistant / ESPHome
- [ ] Mobile app control (Blynk or custom)

### Phase 5: Advanced
- [ ] Mesh networking (ESP-NOW)
- [ ] OTA firmware updates
- [ ] Data logging to cloud/SD card

---

## 📚 REFERENCES & RESOURCES

### Documentation
- [Arduino ESP32 Official](https://docs.espressif.com/projects/arduino-esp32/en/latest/)
- [Random Nerd Tutorials](https://randomnerdtutorials.com)
- [ESPHome Official](https://esphome.io)

### Shopping Links (Vietnam)
- Shopee: Search "ESP32", "DHT22", "Relay module"
- Tiki: IoT component listings
- Local electronics shops: HCMC, Hanoi

### Community
- ESP32 Forum: esp32.com
- Home Assistant Community: community.home-assistant.io
- Reddit: r/esp32, r/homeautomation

---

**Status:** ✅ Research Complete  
**Last Updated:** 2026-06-21  
**Next Review:** 2026-07-21



---
#iot #esp32 #sensors #relay #integration #homeautomation #beginner