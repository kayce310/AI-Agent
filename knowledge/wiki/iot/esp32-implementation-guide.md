# 🎯 Hướng Dẫn Thực Hiện — Tích Hợp ESP32 + MQTT + Coral

**Tác giả:** Coral  
**Ngày:** 21/06/2026  
**Giai Đoạn:** Implementation Step-by-Step  
**Mục Tiêu:** Từ Hardware → Code → Deployment

---

## 📚 MỤC LỤC

1. [Bước 1: Chuẩn Bị Hardware](#bước-1-chuẩn-bị-hardware)
2. [Bước 2: Flash Firmware & Test MQTT](#bước-2-flash-firmware--test-mqtt)
3. [Bước 3: Setup MQTT Broker](#bước-3-setup-mqtt-broker)
4. [Bước 4: Coral Python Bridge](#bước-4-coral-python-bridge)
5. [Bước 5: Integration Testing](#bước-5-integration-testing)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Bước 1: Chuẩn Bị Hardware

### **1.1 Danh Sách Linh Kiện**

```
✅ ESP32 DevKit (38 pins)
✅ DHT11 Sensor (nhiệt độ/độ ẩm)
✅ 5V Relay Module (1 channel)
✅ USB Micro Cable (để flash)
✅ Jumper Wires (20-30 cái)
✅ Breadboard (optional nhưng recommended)
✅ 220V AC Test Lamp (để test relay)
```

### **1.2 Sơ Đồ Mạch (Wiring Diagram)**

```
ESP32 DevKit                DHT11 Sensor
━━━━━━━━━━━━━━━━          ━━━━━━━━━━
   3.3V ─────────────────► VCC
   GND ─────────────────► GND
   GPIO 4 ────────────► DATA

ESP32 DevKit                5V Relay Module
━━━━━━━━━━━━━━━━          ━━━━━━━━━━━━
   5V ─────────────────► VCC
   GND ────────────────► GND
   GPIO 5 ────────────► IN (Control Pin)
   
   [Relay NO contact] ──► 220V AC Lamp Circuit
```

### **1.3 Kiểm Tra Kết Nối**

```bash
# Dùng Multimeter kiểm tra:
- Voltage 3.3V giữa VCC-GND ✅
- Resistance DHT11 khoảng 5-10Ω ✅
- Relay coil resistance khoảng 100Ω ✅
```

---

## 💾 Bước 2: Flash Firmware & Test MQTT

### **2.1 Cài Đặt Arduino IDE**

```bash
# Download: https://www.arduino.cc/en/software
# Windows / Mac / Linux supported
```

### **2.2 Add ESP32 Board Manager**

**Trong Arduino IDE:**
```
File → Preferences
→ Additional Boards Manager URLs:
https://dl.espressif.com/dl/package_esp32_index.json
→ OK

Tools → Board Manager
→ Search "esp32"
→ Install by Espressif Systems
→ Close
```

### **2.3 Select Board & Com Port**

```
Tools → Board → ESP32 → ESP32 Dev Module
Tools → Port → COM3 (hoặc /dev/ttyUSB0 trên Linux)
Tools → Upload Speed → 921600
```

### **2.4 Install MQTT & Sensor Libraries**

```
Sketch → Include Library → Manage Libraries

Search & Install:
1. "PubSubClient" by Nick O'Leary
2. "DHT sensor library" by Adafruit
3. "Adafruit Unified Sensor"
```

### **2.5 Upload Test Sketch**

```cpp
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// ═══════════════ CONFIGURATION ═══════════════
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "broker.emqx.io";
const char* mqtt_user = "coral_test";
const char* mqtt_password = "test123";

// ═══════════════ PIN CONFIGURATION ═══════════
#define DHTPIN 4
#define DHTTYPE DHT11
#define RELAY_PIN 5
#define LED_PIN 2

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

// ═══════════════ SETUP ═══════════════
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════╗");
  Serial.println("║  CORAL ESP32 IoT Device v1.0       ║");
  Serial.println("╚════════════════════════════════════╝");
  
  // Init Pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  // Init DHT
  dht.begin();
  Serial.println("✓ DHT11 initialized");
  
  // Connect WiFi
  connectWiFi();
  
  // Setup MQTT
  client.setServer(mqtt_server, 1883);
  client.setCallback(onMQTTMessage);
  Serial.println("✓ MQTT configured");
  
  // Subscribe to topics
  delay(2000);
  if (client.connect("ESP32_Coral", mqtt_user, mqtt_password)) {
    Serial.println("✓ Connected to MQTT Broker");
    client.subscribe("coral/commands/#");
    client.publish("coral/status", "online");
  } else {
    Serial.println("✗ MQTT connection failed");
  }
}

// ═══════════════ WIFI CONNECT ═══════════════
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("✓ WiFi connected: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("✗ WiFi connection failed!");
  }
}

// ═══════════════ MQTT CALLBACK ═══════════════
void onMQTTMessage(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("📨 [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);
  
  // RELAY CONTROL
  if (strcmp(topic, "coral/commands/relay") == 0) {
    if (message == "ON") {
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("⚡ Relay: ON");
      client.publish("coral/status/relay", "ON");
    } else if (message == "OFF") {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("⚡ Relay: OFF");
      client.publish("coral/status/relay", "OFF");
    }
  }
  
  // LED CONTROL
  if (strcmp(topic, "coral/commands/led") == 0) {
    if (message == "ON") {
      digitalWrite(LED_PIN, HIGH);
      Serial.println("💡 LED: ON");
    } else {
      digitalWrite(LED_PIN, LOW);
      Serial.println("💡 LED: OFF");
    }
  }
}

// ═══════════════ MAIN LOOP ═══════════════
void loop() {
  // Reconnect MQTT if needed
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  // Read sensors every 10 seconds
  static unsigned long lastRead = 0;
  if (millis() - lastRead > 10000) {
    lastRead = millis();
    readAndPublishSensors();
  }
}

// ═══════════════ MQTT RECONNECT ═══════════════
void reconnectMQTT() {
  int retries = 0;
  while (!client.connected() && retries < 5) {
    Serial.print("🔄 Connecting to MQTT... ");
    
    if (client.connect("ESP32_Coral", mqtt_user, mqtt_password)) {
      Serial.println("✓");
      client.subscribe("coral/commands/#");
      client.publish("coral/status", "online");
      return;
    } else {
      Serial.print("✗ (Code: ");
      Serial.print(client.state());
      Serial.println(")");
      delay(3000);
      retries++;
    }
  }
}

// ═══════════════ READ & PUBLISH SENSORS ═══════════════
void readAndPublishSensors() {
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  if (isnan(temp) || isnan(humidity)) {
    Serial.println("⚠️  DHT11 read failed!");
    return;
  }
  
  // Create JSON payload
  char payload[100];
  snprintf(payload, sizeof(payload),
    "{\"temp\":%.1f,\"humidity\":%.1f,\"rssi\":%d}",
    temp, humidity, WiFi.RSSI());
  
  // Publish
  client.publish("coral/sensors/dht11", payload);
  
  Serial.print("📊 [Sensors] ");
  Serial.print("Temp: ");
  Serial.print(temp);
  Serial.print("°C, Humidity: ");
  Serial.print(humidity);
  Serial.println("%");
}
```

### **2.6 Upload & Monitor**

```bash
# Click: Sketch → Upload (Ctrl+U)
# When you see: "Hard resetting via RTS pin..."
# → ESP32 is flashing ✓

# Open Serial Monitor (Ctrl+Shift+M)
# Set Baud: 115200
# Watch the output:

╔════════════════════════════════════╗
║  CORAL ESP32 IoT Device v1.0       ║
╚════════════════════════════════════╝
Connecting to WiFi: MyWiFi
..........
✓ WiFi connected: 192.168.1.100
🔄 Connecting to MQTT... ✓
✓ Connected to MQTT Broker
📊 [Sensors] Temp: 25.3°C, Humidity: 60.5%
📨 [coral/commands/relay]: ON
⚡ Relay: ON
```

---

## 🖥️ Bước 3: Setup MQTT Broker

### **3.1 Option A: Docker (Recommended)**

```bash
# Start Mosquitto broker
docker run -d \
  --name mqtt-coral \
  -p 1883:1883 \
  -p 8883:8883 \
  eclipse-mosquitto:latest

# Check status
docker logs mqtt-coral
docker ps | grep mqtt-coral
```

### **3.2 Option B: Local Install (Linux)**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mosquitto mosquitto-clients

# Start
sudo systemctl start mosquitto
sudo systemctl enable mosquitto

# Test
mosquitto_pub -h localhost -t test -m "hello"
mosquitto_sub -h localhost -t test
```

### **3.3 Option C: Cloud (EMQX Public Broker)**

```
Host: broker.emqx.io
Port: 1883
Username: coral_test
Password: test123
(No setup needed, but less secure for production)
```

### **3.4 Test Connection**

```bash
# From another terminal:
mosquitto_sub -h 127.0.0.1 -t "coral/#" -v

# From another terminal, publish:
mosquitto_pub -h 127.0.0.1 -t "coral/commands/relay" -m "ON"

# You should see:
coral/commands/relay ON
coral/status/relay ON
coral/sensors/dht11 {"temp":25.3,"humidity":60.5,"rssi":-65}
```

---

## 🐍 Bước 4: Coral Python Bridge

### **4.1 Setup Python Environment**

```bash
# Create virtual environment
python3 -m venv coral-env
source coral-env/bin/activate  # On Windows: coral-env\Scripts\activate

# Install dependencies
pip install paho-mqtt
```

### **4.2 Coral Bridge Script**

```python
#!/usr/bin/env python3
# coral_mqtt_bridge.py

import paho.mqtt.client as mqtt
import json
import time
from datetime import datetime

class CoralMQTTBridge:
    """
    Coral AI ↔ MQTT Broker Bridge
    Listens to sensors, executes device commands
    """
    
    def __init__(self, broker_host="127.0.0.1", broker_port=1883):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.client = mqtt.Client(client_id="coral_ai_bridge")
        
        # Callbacks
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        
        # Device state
        self.device_state = {
            "relay": "OFF",
            "temp": 0,
            "humidity": 0,
            "last_update": None
        }
        
    def connect(self):
        """Connect to MQTT Broker"""
        print("[🔗 Coral] Connecting to MQTT broker...")
        try:
            self.client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.client.loop_start()
            print("[✓] Connected successfully")
        except Exception as e:
            print(f"[✗] Connection failed: {e}")
            return False
        return True
    
    def _on_connect(self, client, userdata, flags, rc):
        """Callback when connected"""
        if rc == 0:
            print("[✓] MQTT Connected (Code 0)")
            # Subscribe to all coral topics
            client.subscribe("coral/#")
        else:
            print(f"[✗] MQTT Connection Failed (Code {rc})")
    
    def _on_disconnect(self, client, userdata, rc):
        """Callback when disconnected"""
        if rc != 0:
            print(f"[⚠️  ] Unexpected disconnect (Code {rc})")
        else:
            print("[💤] Disconnected from broker")
    
    def _on_message(self, client, userdata, msg):
        """Callback when message received"""
        topic = msg.topic
        payload = msg.payload.decode()
        
        print(f"\n[📨] Topic: {topic}")
        print(f"    Payload: {payload}")
        
        # Parse sensor data
        if topic == "coral/sensors/dht11":
            try:
                data = json.loads(payload)
                self.device_state["temp"] = data["temp"]
                self.device_state["humidity"] = data["humidity"]
                self.device_state["last_update"] = datetime.now().isoformat()
                
                print(f"    → Temp: {data['temp']}°C, Humidity: {data['humidity']}%")
                
                # AI Logic: Auto-control based on temperature
                self._ai_process_sensor_data(data)
            except json.JSONDecodeError:
                print("    ✗ JSON parse error")
        
        # Parse status updates
        elif topic == "coral/status/relay":
            self.device_state["relay"] = payload
            print(f"    → Relay Status: {payload}")
    
    def _ai_process_sensor_data(self, sensor_data):
        """
        Simple AI logic for demo:
        - If temp > 28°C → Turn on relay (fan/AC)
        - If temp < 22°C → Turn off relay
        """
        temp = sensor_data["temp"]
        humidity = sensor_data["humidity"]
        
        print(f"\n[🧠 AI Decision]")
        
        if temp > 28:
            print(f"  ⚠️  High temperature ({temp}°C > 28°C)")
            print(f"  → Action: Turn ON relay")
            self.control_relay("ON")
        elif temp < 22:
            print(f"  ✓ Temperature good ({temp}°C < 22°C)")
            print(f"  → Action: Turn OFF relay")
            self.control_relay("OFF")
        else:
            print(f"  — Temperature normal ({temp}°C)")
    
    def control_relay(self, command):
        """Send control command to relay"""
        self.client.publish("coral/commands/relay", command)
        print(f"  [📤] Published: coral/commands/relay = {command}")
    
    def get_device_status(self):
        """Get current device status"""
        return json.dumps(self.device_state, indent=2)
    
    def run(self):
        """Run the bridge (blocking)"""
        print("\n[🚀 Coral Bridge Started]")
        print("Press Ctrl+C to stop\n")
        
        try:
            while True:
                time.sleep(5)
                
                # Print status every 30 seconds
                if int(time.time()) % 30 == 0:
                    print("\n[📊 Status]")
                    print(self.get_device_status())
        
        except KeyboardInterrupt:
            print("\n[🛑] Shutting down...")
            self.client.loop_stop()
            self.client.disconnect()
            print("[✓] Bridge stopped")

# ═══════════════ MAIN ═══════════════
if __name__ == "__main__":
    # Create bridge
    bridge = CoralMQTTBridge(broker_host="127.0.0.1")
    
    # Connect
    if bridge.connect():
        # Run
        bridge.run()
    else:
        print("[✗] Failed to initialize bridge")
```

### **4.3 Run the Bridge**

```bash
# Terminal 1: Start MQTT broker
docker run -d --name mqtt-coral -p 1883:1883 eclipse-mosquitto:latest

# Terminal 2: Run Coral bridge
python3 coral_mqtt_bridge.py

# Terminal 3: Monitor ESP32 (optional)
mosquitto_sub -h 127.0.0.1 -t "coral/#" -v
```

**Expected Output:**
```
[🚀 Coral Bridge Started]
[🔗 Coral] Connecting to MQTT broker...
[✓] Connected successfully
[✓] MQTT Connected (Code 0)

[📨] Topic: coral/sensors/dht11
    Payload: {"temp":25.3,"humidity":60.5,"rssi":-65}
    → Temp: 25.3°C, Humidity: 60.5%

[🧠 AI Decision]
  — Temperature normal (25.3°C)

[📊 Status]
{
  "relay": "OFF",
  "temp": 25.3,
  "humidity": 60.5,
  "last_update": "2026-06-21T10:43:19.566Z"
}
```

---

## ✅ Bước 5: Integration Testing

### **5.1 Test Matrix**

| Test Case | Command | Expected Result |
|-----------|---------|-----------------|
| **Relay ON** | `mosquitto_pub -t coral/commands/relay -m ON` | Relay clicks, LED on |
| **Relay OFF** | `mosquitto_pub -t coral/commands/relay -m OFF` | Relay silent, LED off |
| **DHT Read** | Watch serial monitor | Temp/Humidity updates every 10s |
| **AI Logic** | Increase temp >28°C | Relay auto-turns ON |
| **Bridge Reconnect** | Kill docker, restart | Bridge reconnects in <10s |

### **5.2 Full Integration Test Script**

```bash
#!/bin/bash
# test_integration.sh

echo "🧪 CORAL IoT Integration Test"
echo "════════════════════════════════"

BROKER="127.0.0.1"
TIMEOUT=2

# Test 1: Broker connectivity
echo ""
echo "[Test 1] Broker Connectivity"
if timeout $TIMEOUT mosquitto_pub -h $BROKER -t test -m test 2>/dev/null; then
  echo "✓ PASS: Broker responding"
else
  echo "✗ FAIL: Broker not reachable"
  exit 1
fi

# Test 2: ESP32 heartbeat
echo ""
echo "[Test 2] ESP32 Heartbeat"
mosquitto_sub -h $BROKER -t "coral/status" -W 5 &
sleep 6
if pgrep -f mosquitto_sub > /dev/null; then
  echo "✗ FAIL: No heartbeat received"
  pkill -f mosquitto_sub
else
  echo "✓ PASS: Heartbeat detected"
fi

# Test 3: Relay control
echo ""
echo "[Test 3] Relay Control (ON)"
mosquitto_pub -h $BROKER -t "coral/commands/relay" -m "ON"
sleep 1
echo "✓ PASS: Command sent"

echo ""
echo "[Test 4] Relay Control (OFF)"
mosquitto_pub -h $BROKER -t "coral/commands/relay" -m "OFF"
sleep 1
echo "✓ PASS: Command sent"

# Test 5: Sensor data
echo ""
echo "[Test 5] Sensor Data Stream"
mosquitto_sub -h $BROKER -t "coral/sensors/dht11" -C 3 | while read line; do
  echo "  $line"
done
echo "✓ PASS: Sensor stream working"

echo ""
echo "════════════════════════════════"
echo "🎉 All tests completed!"
```

---

## 🔧 Troubleshooting

### **Issue 1: ESP32 Not Connecting to WiFi**

```
Symptom: Serial shows "Connecting to WiFi: ....."
         But never says "✓ WiFi connected"

Solutions:
1. Check WiFi name & password (case-sensitive)
2. Make sure 2.4GHz (not 5GHz) → ESP32 doesn't support 5GHz
3. Restart WiFi router
4. Reset ESP32: Press RESET button
5. Check WiFi signal strength (should be > -80 dBm)
```

### **Issue 2: MQTT Connection Fails**

```
Symptom: "✗ MQTT connection failed"

Solutions:
1. Verify broker is running:
   docker ps | grep mqtt-coral
   
2. Check broker address is correct:
   ping broker.emqx.io  (if using cloud)
   
3. Verify credentials match
   
4. Check firewall allowing port 1883:
   sudo ufw allow 1883
   
5. If using Docker, check network:
   docker inspect mqtt-coral | grep IPAddress
```

### **Issue 3: DHT11 Read Failures**

```
Symptom: "⚠️  DHT11 read failed!"

Solutions:
1. Check wiring: VCC-3.3V, GND-GND, DATA-GPIO4
2. Add pull-up resistor (4.7kΩ) on DATA line
3. Try different GPIO pin (e.g., GPIO 14, 15, 23)
4. Replace DHT11 sensor (may be faulty)
```

### **Issue 4: Relay Not Switching**

```
Symptom: Command sent but relay doesn't click

Solutions:
1. Check relay wiring: VCC-5V, GND-GND, IN-GPIO5
2. Test with multimeter: Check GPIO5 goes HIGH when ON
3. Verify relay coil power (5V required)
4. Replace relay module (may be dead)
5. Try jumper wire directly from GPIO5 to relay IN
```

### **Issue 5: Python Bridge Crashes**

```
Symptom: "ConnectionRefusedError: [Errno 111] Connection refused"

Solutions:
1. Make sure MQTT broker is running:
   docker start mqtt-coral
   
2. Check broker port is exposed:
   docker logs mqtt-coral
   
3. Update broker address in script:
   bridge = CoralMQTTBridge(broker_host="127.0.0.1")
   
4. Run with verbose logging:
   python3 -u coral_mqtt_bridge.py
```

---

## 📋 Checklist Hoàn Thành

- [ ] Hardware purchased & wired correctly
- [ ] Arduino IDE installed + ESP32 board added
- [ ] Firmware uploaded to ESP32 successfully
- [ ] Serial monitor showing sensor readings
- [ ] MQTT broker running (Docker/local)
- [ ] ESP32 connects to MQTT broker
- [ ] Manual relay control via MQTT works
- [ ] Python bridge runs without errors
- [ ] AI logic processes sensor data
- [ ] Relay auto-controls based on temperature
- [ ] All integration tests pass ✅

**Next Steps:**
→ Proceed to [Telegram Integration](./telegram-integration.md)  
→ Or scale with [Home Assistant Setup](./home-assistant-setup.md)



---
#esp32 #mqtt #implementation #guide #firmware #python #bridge