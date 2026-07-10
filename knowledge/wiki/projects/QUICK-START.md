# 🚀 ISEKAI RPG - QUICK START

## ⚡ 3 Bước để Chơi Online

### 1️⃣ Terminal 1: Chạy Server
```bash
cd ~/isekai-game
python3 server.py
```

✅ Output:
```
╔════════════════════════════════════════════════════════╗
║       🎮 ISEKAI RPG SERVER - STARTED                   ║
║  🌐 Local:    http://localhost:8777                    ║
║  📦 File:     isekai-rpg-advanced.html                 ║
║  ⏹️  Stop:     Ctrl+C                                   ║
╚════════════════════════════════════════════════════════╝
```

### 2️⃣ Terminal 2: Setup Tunnel (Share Online)

**Cài Cloudflared (lần đầu):**

**macOS:**
```bash
brew install cloudflare/cloudflare/cloudflared
```

**Linux:**
```bash
wget https://github.com/cloudflare/cloudflared/releases/download/2024.1.0/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
```

**Windows:**
- Download: https://github.com/cloudflare/cloudflared/releases
- Chọn `cloudflared-windows-amd64.exe`
- Thêm vào PATH hoặc chạy từ thư mục

**Chạy Tunnel:**
```bash
cloudflared tunnel --url http://localhost:8777
```

✅ Output:
```
2024-07-07T08:00:00Z INFO  Your quick tunnel has been created! Visit it at (until 8 hours from now):
https://example-abc123.trycloudflare.com
```

### 3️⃣ Mở trò chơi

**Local (cùng máy):**
```
http://localhost:8777
```

**Online (chia sẻ bạn bè):**
```
https://example-abc123.trycloudflare.com
```

---

## 🎮 Hướng Dẫn Chơi

### ⌨️ Controls
- **↑↓←→** hoặc **WASD**: Di chuyển nhân vật (xanh lam)
- **SPACE**: Tấn công quái gần đó (đỏ)
- **R**: Sử dụng Potion (phục hồi 30 HP)

### 🎯 Mục tiêu
1. **Tiêu diệt quái** → Nhận EXP
2. **Lên level** → Tăng Attack, Defense, HP
3. **Nhặt item** → Potion (phục hồi) & Gold (điểm)
4. **Sống sót** → Tránh HP về 0

### 📊 Stats
- **HP**: Máu. Hết máu = Game Over
- **ATK**: Sát thương tấn công
- **DEF**: Giảm sát thương nhận
- **SPD**: Tốc độ di chuyển
- **LV**: Level hiện tại
- **EXP**: Kinh nghiệm. Đầy = Level Up

### 🏆 Tips
- Tránh nhiều quái cùng lúc
- Dùng Potion khi HP < 40%
- Quái càng nhiều càng mạnh → Làm game khó hơn khi level cao

---

## 🐛 Troubleshooting

### ❌ "Module not found: http.server"
→ Python 3 không cài. Cài từ python.org

### ❌ "Port 8777 already in use"
→ Cổng bị chiếm. Sửa `server.py` dòng `PORT = 8777` → `PORT = 9999`

### ❌ "Cloudflared not found"
→ Cài lại theo hướng dẫn ở trên

### ❌ Game lag/chậm
→ Bình thường trên browser yếu. Thử Firefox thay Chrome

---

## 📦 Files cần có

```
~/isekai-game/
├── server.py
└── isekai-rpg-advanced.html
```

**Tải từ wiki:**
1. Copy nội dung `server.py`
2. Tạo file `~/isekai-game/server.py`
3. Copy nội dung `isekai-rpg-advanced.html`
4. Tạo file `~/isekai-game/isekai-rpg-advanced.html`

---

## 🎉 Chơi thử

```bash
# Setup (lần đầu)
mkdir -p ~/isekai-game
cd ~/isekai-game
# Copy 2 files vào đây

# Chạy
python3 server.py
# Mở browser: http://localhost:8777
```

**Vui chơi!** 🎮✨
