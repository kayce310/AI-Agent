# 🎮 ISEKAI RPG - Pixel Art Adventure Game

> A lightweight, browser-based RPG with real-time combat, pixel art graphics, and online multiplayer support via Cloudflare Tunnel.

![Status](https://img.shields.io/badge/status-released-brightgreen) ![Version](https://img.shields.io/badge/version-1.0-blue) ![License](https://img.shields.io/badge/license-free-green)

---

## 🎯 Features

### 🎨 Graphics
- **Pixel Art Sprites**: Hand-drawn style characters
- **Canvas 2D Rendering**: Smooth 60 FPS gameplay
- **Dynamic Effects**: Damage numbers, particle effects
- **Responsive UI**: Desktop & mobile friendly

### 🎮 Gameplay
- **Real-time Combat**: SPACE to attack nearby enemies
- **Enemy AI**: Chase & patrol behavior
- **Ability System**: Q (Power Strike), W (Heal)
- **Loot System**: Drop potions & gold
- **Level Progression**: Infinite difficulty scaling

### 🌐 Multiplayer
- **Share Online**: Cloudflare Tunnel integration
- **No Installation**: Play directly in browser
- **Mobile Support**: Works on phones & tablets

---

## ⚡ Quick Start

### 1. Download Files
```bash
mkdir ~/isekai-game
cd ~/isekai-game
```

Copy these files to the folder:
- `server.py`
- `isekai-rpg-enhanced.html` (recommended) or `isekai-rpg-advanced.html`

### 2. Run Server
```bash
python3 server.py
```

### 3. Play!
```
Open: http://localhost:8777
```

### 4. Share Online (Optional)
```bash
# Terminal 2
cloudflared tunnel --url http://localhost:8777
```

Copy the URL to share with friends.

---

## 🎮 How to Play

### Controls
| Key | Action |
|-----|--------|
| ↑↓←→ / WASD | Move |
| **SPACE** | Attack (nearby enemies) |
| **Q** | Power Strike (ability) |
| **W** | Heal (ability) |
| **R** | Use Potion |

### Objective
1. **Move around** the map
2. **Attack enemies** (red characters)
3. **Collect loot** (potions, gold)
4. **Level up** → Get stronger
5. **Survive** as long as possible

### Tips
- 💡 Dodge multiple enemies
- 💡 Use Potion when HP < 40%
- 💡 Power Strike (Q) for tough fights
- 💡 Each level = more enemies = harder game

---

## 📊 Game Stats

| Stat | Effect |
|------|--------|
| **❤️ HP** | Health points (0 = Game Over) |
| **⭐ LV** | Level (1-∞) |
| **⚔️ ATK** | Attack damage (+3 per level) |
| **🛡️ DEF** | Defense (+1 per level) |
| **💨 SPD** | Move speed (fixed) |
| **✨ EXP** | Experience points |

---

## 📁 Files

```
isekai-game/
├── server.py                      # HTTP server (Python 3)
├── isekai-rpg-enhanced.html       # Game (HTML5 + Canvas)
└── isekai-rpg-advanced.html       # Alternative base version
```

**Size:** ~50 KB total (lightweight)

---

## 🛠️ Requirements

### Minimum
- Python 3.6+
- Modern browser (Chrome, Firefox, Safari, Edge)
- No GPU required (uses Canvas 2D)

### For Online Play
- Internet connection
- Cloudflared installed (free)

---

## 📖 Documentation

- **[QUICK-START.md](QUICK-START.md)** — 3-step setup guide
- **[DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md)** — Technical details
- **[RELEASE-NOTES.md](RELEASE-NOTES.md)** — Features & roadmap

---

## 🎨 Game Versions

### isekai-rpg-advanced.html (Base)
- Simple pixel art
- Basic combat
- Clean UI
- ~35 KB

### isekai-rpg-enhanced.html (Recommended)
- Enhanced graphics
- Ability system
- Particle effects
- Better animations
- ~42 KB

**→ Start with Enhanced version for best experience.**

---

## 🚀 Deploy Online

### Option 1: Cloudflare Tunnel (Easy)
```bash
cloudflared tunnel --url http://localhost:8777
```

### Option 2: ngrok
```bash
ngrok http 8777
```

### Option 3: VPS
```bash
ssh -R 8777:localhost:8777 user@vps.com
```

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| **FPS** | 60 |
| **Load Time** | <1s |
| **Memory** | <50MB |
| **Max Enemies** | 8+ |
| **Supported Browsers** | All modern |

---

## 🐛 Troubleshooting

### Game won't load
```
✓ Python installed? python3 --version
✓ Port 8777 free? lsof -i :8777
✓ HTML file in folder?
```

### Server won't start
```
✓ Try: python3 instead of python
✓ Change PORT in server.py if 8777 busy
✓ Check firewall settings
```

### Lag/Stuttering
```
✓ Close browser tabs
✓ Try Firefox instead of Chrome
✓ Reduce enemy count in code (optional)
```

See [QUICK-START.md](QUICK-START.md) for full troubleshooting.

---

## 🎯 Roadmap

### v1.0 ✅ (Current)
- Pixel art game
- Combat system
- Enemy AI
- Level progression

### v1.1 🔄 (Next)
- Sound effects
- Mobile touch controls
- Boss enemies
- Settings menu

### v2.0 🔮 (Future)
- Multiplayer PvP
- Database persistence
- Trading system
- Guilds

---

## 📞 Support

**Issues?** Check:
1. [QUICK-START.md](QUICK-START.md) → Troubleshooting
2. [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) → Technical FAQ
3. Verify all files in `~/isekai-game/`

---

## 📄 License

**Free to use, modify, and share.**

No strings attached. Make it your own! 🎉

---

## 🎉 Get Started Now

```bash
# Copy & paste:
mkdir ~/isekai-game && cd ~/isekai-game
# (Copy server.py + isekai-rpg-enhanced.html here)
python3 server.py
# Open: http://localhost:8777
```

**Enjoy your Isekai adventure!** 🗡️✨

---

**Made with ❤️ for pixel art lovers**  
v1.0 | 2026
