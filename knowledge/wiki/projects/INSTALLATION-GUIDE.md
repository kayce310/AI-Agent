# 🚀 ISEKAI RPG - Installation & Setup Guide

**Last Updated:** 2026-07-07  
**Difficulty:** ⭐ Very Easy (5 minutes)

---

## 📋 What You Need

### Requirements
- **Python 3.6+** (any modern version)
- **Web Browser** (Chrome, Firefox, Safari, or Edge)
- **Internet** (for online play only)

### Optional
- **Cloudflared** (to share online)

---

## 🖥️ Step 1: Verify Python

### Check if Python is installed
```bash
python3 --version
```

**Expected output:**
```
Python 3.9.x (or higher)
```

### If Python not found

**macOS:**
```bash
brew install python3
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install python3
```

**Windows:**
- Download: https://www.python.org/downloads/
- Run installer, check "Add Python to PATH"
- Restart terminal

---

## 📁 Step 2: Create Game Folder

```bash
# Create directory
mkdir ~/isekai-game
cd ~/isekai-game

# Verify you're in the folder
pwd
# Output: /Users/yourname/isekai-game (or similar)
```

---

## 📥 Step 3: Download Game Files

From the wiki/project files, copy these 2 files to `~/isekai-game/`:

### File 1: server.py
- Size: ~2 KB
- Language: Python
- Purpose: HTTP server

### File 2: isekai-rpg-enhanced.html
- Size: ~42 KB
- Language: HTML5 + JavaScript
- Purpose: Game client
- Alternative: `isekai-rpg-advanced.html` (simpler version)

### Verify Files
```bash
ls -la ~/isekai-game/
# Should show:
# - server.py
# - isekai-rpg-enhanced.html
```

---

## ▶️ Step 4: Run Server

### Start the server
```bash
cd ~/isekai-game
python3 server.py
```

### Expected output:
```
╔════════════════════════════════════════════════════════╗
║       🎮 ISEKAI RPG SERVER - STARTED                   ║
║  🌐 Local:    http://localhost:8777                    ║
║  📦 File:     isekai-rpg-advanced.html                 ║
║  ⏹️  Stop:     Ctrl+C                                   ║
╚════════════════════════════════════════════════════════╝
```

### If error occurs, see **Troubleshooting** below.

---

## 🎮 Step 5: Play the Game

### Open in browser
```
http://localhost:8777
```

### In address bar, type:
```
localhost:8777
```

### You should see:
- Blue square (your character)
- Red squares (enemies)
- Game controls on right side
- HUD with stats

**Game started!** 🎉

---

## 🌐 Step 6: Share Online (Optional)

### Install Cloudflared

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
- Find `cloudflared-windows-amd64.exe`
- Add to PATH or run from folder

### Open tunnel (new terminal)
```bash
cloudflared tunnel --url http://localhost:8777
```

### Expected output:
```
2024-07-07T08:00:00Z INFO  Your quick tunnel has been created! Visit it at (until 8 hours from now):
https://example-abc123.trycloudflare.com
```

### Share URL
Copy the `https://example-abc123.trycloudflare.com` link and share with friends!

---

## 🎮 First Time Playing

### Controls
| Key | Action |
|-----|--------|
| ↑ ↓ ← → | Move |
| SPACE | Attack |
| Q | Power Strike |
| W | Heal |
| R | Use Potion |

### Quick Tips
1. **Move** with arrow keys
2. **Get close** to red enemies (<80px)
3. **Press SPACE** to attack
4. **Collect** potions (pink squares)
5. **Level up** when EXP bar fills
6. **Don't** let HP reach 0

---

## 🐛 Troubleshooting

### ❌ "python3: command not found"

**Solution:**
- Install Python 3 (see Step 1)
- Try `python` instead of `python3`
- Restart terminal after install

### ❌ "Address already in use" on port 8777

**Solution 1: Use different port**
Edit `server.py`, change line:
```python
PORT = 8777  # Change to 9999 or any free port
```

**Solution 2: Kill existing process**
```bash
# macOS/Linux
lsof -i :8777
kill -9 <PID>

# Windows
netstat -ano | findstr :8777
taskkill /PID <PID> /F
```

### ❌ "No such file or directory: isekai-rpg-advanced.html"

**Solution:**
- Check file is in `~/isekai-game/` folder
- Verify filename spelling exactly
- Try renaming file to match server.py expectation

### ❌ Game loads but shows blank screen

**Solution:**
- Refresh browser (F5)
- Check browser console (F12) for errors
- Try different browser (Chrome → Firefox)
- Clear browser cache

### ❌ Game is very laggy

**Solution:**
- Close other browser tabs
- Try Firefox (often faster)
- Reduce enemy count in HTML (optional)
- Restart server

### ❌ "ModuleNotFoundError: No module named 'http'"

**Solution:**
- Python version too old (need 3.6+)
- Upgrade Python to latest version

### ❌ Can't share online / Cloudflared error

**Solution:**
- Verify cloudflared installed: `cloudflared --version`
- Make sure server is running first
- Check internet connection
- Try different tunnel: `ngrok http 8777`

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Python 3 installed (`python3 --version`)
- [ ] Game folder created (`~/isekai-game/`)
- [ ] Files copied (2 files in folder)
- [ ] Server runs (`python3 server.py`)
- [ ] No error messages on startup
- [ ] Browser loads game (`localhost:8777`)
- [ ] Blue character visible
- [ ] Can move with arrow keys
- [ ] Can attack (SPACE key)
- [ ] Game is playable

**All checked?** You're ready to play! 🎮

---

## 📊 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Any (Mac/Linux/Windows) | Any |
| **Python** | 3.6+ | 3.9+ |
| **Browser** | Any modern | Chrome/Firefox |
| **RAM** | 512 MB | 2 GB |
| **Disk** | 100 MB | 1 GB |
| **CPU** | Any | Dual-core+ |
| **GPU** | Not needed | Any |

---

## 🎯 Common Questions

### Q: Do I need internet to play locally?
**A:** No. Local play (`localhost:8777`) works offline.

### Q: Can multiple people play at once?
**A:** On same network: Yes, use local IP (e.g., `192.168.1.100:8777`)  
Online: Use Cloudflare Tunnel URL (everyone sees same game)

### Q: Can I change the port?
**A:** Yes. Edit `server.py` line 8: `PORT = 8777` → any number (1000-65535)

### Q: Is it safe to share the Cloudflare URL?
**A:** Yes, completely safe. URL expires after 8 hours.

### Q: Can I run multiple servers?
**A:** Yes, use different ports (8777, 8778, 8779, etc.)

### Q: How do I stop the server?
**A:** Press `Ctrl+C` in terminal running the server.

---

## 🚀 Next Steps

1. ✅ **Play locally** → Get familiar with game
2. ✅ **Share with friends** → Use Cloudflare Tunnel
3. ✅ **Customize** → Edit HTML file if interested
4. ✅ **Enjoy!** → Have fun! 🎮

---

## 📞 Still Need Help?

Check these files:
- **QUICK-START.md** — Quick reference
- **DEPLOYMENT-GUIDE.md** — Advanced setup
- **RELEASE-NOTES.md** — Features & roadmap

---

**Happy gaming!** 🎉✨

**Isekai RPG v1.0 | 2026**
