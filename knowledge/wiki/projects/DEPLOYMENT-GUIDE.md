# 🎮 ISEKAI RPG - Deployment Guide

## 🚀 Quick Start (5 phút)

### Bước 1: Download Files

```bash
# Tạo thư mục game
mkdir -p ~/isekai-game
cd ~/isekai-game
```

**Copy 2 files từ wiki:**
1. `server.py`
2. `isekai-rpg-advanced.html`

Lưu vào thư mục `~/isekai-game/`

### Bước 2: Chạy Server

```bash
python3 server.py
```

Output:
```
╔════════════════════════════════════════════════════════╗
║       🎮 ISEKAI RPG SERVER - STARTED                   ║
║  🌐 Local:    http://localhost:8777                    ║
║  📦 File:     isekai-rpg-advanced.html                 ║
║  ⏹️  Stop:     Ctrl+C                                   ║
╚════════════════════════════════════════════════════════╝
```

### Bước 3: Mở Game

**Cùng máy:**
```
http://localhost:8777
```

**Chia sẻ online (Terminal 2):**
```bash
cloudflared tunnel --url http://localhost:8777
```

---

## 🎮 Game Features

### ✨ Graphics
- **Pixel Art**: Canvas 2D với ASCII-style sprites
- **Character**: Xanh lam (player) vs Đỏ (enemy)
- **Grid Background**: Lưới tiêu chuẩn RPG
- **HP Bars**: Thanh máu trên đầu mỗi nhân vật

### 🎯 Gameplay
- **Real-time Combat**: Tấn công khi gần quái
- **Enemy AI**: Quái tự động tìm + tấn công player
- **Loot System**: Item drop (Potion, Gold)
- **Level Up**: EXP → Level → Tăng Stats
- **Difficulty Scaling**: Càng level cao, quái càng nhiều + mạnh

### 📊 Stats System
| Stat | Effect | Increase |
|------|--------|----------|
| **HP** | Máu tối đa | +10 per level |
| **ATK** | Sát thương tấn công | +2 per level |
| **DEF** | Giảm sát thương | +1 per level |
| **SPD** | Tốc độ di chuyển | Fixed (3) |

### 🏆 Progression
- **Level 1**: 3 quái, EXP needed: 100
- **Level 2+**: 4+ quái, EXP multiplier: 1.2x

---

## 📋 Game Mechanics

### Combat
```
Player Attack = 10 + Random(-3, 0)
Enemy Defense = reduces damage
```
- Gần nhất: 80px
- Cooldown: 20 frames (~0.33s)

### Enemy AI
```
if distance < 150px → Chase player
else → Random patrol
```

### Item Drop
- **Potion (30% chance)**: Phục hồi 30 HP
- **Gold (70% chance)**: +10 points
- **Spawn Rate**: 2% per frame (~30/s)

### Experience
- Giết 1 quái: +50 EXP
- Level Up: Reset EXP, tăng expNeeded 20%

---

## 🛠️ Technical Stack

| Component | Tech |
|-----------|------|
| **Frontend** | HTML5 + Canvas 2D |
| **Rendering** | Pixel art via canvas |
| **Game Loop** | requestAnimationFrame (60 FPS) |
| **Backend** | Python 3 SimpleHTTPServer |
| **Port** | 8777 |
| **Sharing** | Cloudflare Tunnel |

---

## 📁 Project Structure

```
isekai-game/
├── server.py                    # HTTP server
└── isekai-rpg-advanced.html     # Game (HTML + CSS + JS)
```

---

## ⚙️ Configuration

### Thay đổi Port

**server.py** (dòng 8):
```python
PORT = 8777  # Thay số này
```

### Thay đổi Game Settings

**isekai-rpg-advanced.html** - trong `<script>` section:

```javascript
// Tốc độ player
this.speed = 2;  // ← Tăng = nhanh hơn

// Tấn công
this.attack = 10;  // ← Tăng = sát thương cao hơn

// Máu
this.maxHp = 100;  // ← Tăng = khỏe hơn

// Quái
const damage = Math.max(1, this.attack - Math.floor(Math.random() * 3));
// ← Thay 3 = dễ hơn/khó hơn
```

---

## 🌐 Share Online

### Option 1: Cloudflare Tunnel (Dễ nhất)

```bash
# Install (macOS)
brew install cloudflare/cloudflare/cloudflared

# Run
cloudflared tunnel --url http://localhost:8777
```

Share URL từ output.

### Option 2: ngrok

```bash
# Install
brew install ngrok

# Run
ngrok http 8777
```

### Option 3: SSH Tunnel + VPS

```bash
# Từ VPS
ssh -R 8777:localhost:8777 user@vps.com
```

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| **Canvas Size** | 800x600 |
| **Target FPS** | 60 |
| **Max Enemies** | 3 + level |
| **Draw Calls** | ~100 per frame |
| **Memory** | <50MB |

---

## 🐛 Known Issues

- [ ] Enemies can overlap
- [ ] No sound effects (planned)
- [ ] Mobile touch controls (planned)
- [ ] Multiplayer (planned for v2)

---

## 🔄 Updates

### v1.0 (Current)
- ✅ Pixel art graphics
- ✅ Real-time combat
- ✅ Enemy AI
- ✅ Loot system
- ✅ Level progression

### v1.1 (Planned)
- 🔄 Sound effects
- 🔄 Mobile support
- 🔄 Boss enemies
- 🔄 Special abilities

### v2.0 (Future)
- 🔄 Multiplayer (WebSocket)
- 🔄 Database persistence
- 🔄 Trading system
- 🔄 Guild wars

---

## 📞 Support

**Lỗi?** Xem [QUICK-START.md](QUICK-START.md) → Troubleshooting

**Câu hỏi?** Kiểm tra `server.py` + `isekai-rpg-advanced.html` comments

---

## 📄 License

Free to use & modify 🎉

Enjoy your Isekai adventure! 🗡️✨
