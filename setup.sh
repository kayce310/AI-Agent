#!/bin/bash
# =========================================================================
# Kato Agent v5.1 — Setup Script for NEW Machine
# =========================================================================
# Chạy: bash setup.sh
# Yêu cầu: Node.js 20+, npm, git

set -e

echo "🚀 Kato Agent v5.1 Setup - Bắt đầu cài đặt..."
echo "============================================"

# 1. Clone repo
echo ""
echo "[1/5] 📦 Cloning repository..."
if [ ! -d "AI-Agent" ]; then
  git clone https://github.com/kayce310/AI-Agent.git
  cd AI-Agent
else
  cd AI-Agent
  git pull
fi

# 2. Install dependencies
echo ""
echo "[2/5] 📥 Installing npm dependencies..."
npm install

# 3. Setup .env
echo ""
echo "[3/5] 🔐 Setting up .env..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "   ⚠️ Please edit .env and add your DISCORD_TOKEN"
else
  echo "   ✅ .env already exists"
fi

# 4. Install 9Router (Free AI Router — 40+ providers)
echo ""
echo "[4/5] 🌐 Installing 9Router..."
npm install -g 9router
echo "   ✅ 9Router installed"
echo "   ▶️  Run manually: npx 9router → Select 'Hide to Tray'"
echo "   ▶️  Open http://localhost:20128 → Connect Kiro AI for FREE Claude"

# 5. Build check
echo ""
echo "[5/5] 🔨 Verifying build..."
npx tsc --noEmit && echo "   ✅ Build OK — 0 errors"

echo ""
echo "============================================"
echo "✅ Kato Agent v5.1 Setup Complete!"
echo ""
echo "📋 Quick Start:"
echo "   1. npx 9router  (chọn Hide to Tray)"
echo "   2. Open http://localhost:20128 → kết nối Kiro AI (free Claude)"
echo "   3. Edit .env → thêm DISCORD_TOKEN"
echo "   4. npx tsx src/index.ts"
echo "   5. Trên Discord: /list models → /switch model: kr/claude-sonnet-4.5"
echo ""
echo "📋 Test không cần Discord:"
echo "   npx tsx scripts/test-engine-cli.ts"
echo "============================================"