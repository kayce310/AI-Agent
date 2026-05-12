#!/bin/bash
# =========================================================================
# free-claude-proxy — Setup Script
# =========================================================================
# Yêu cầu: Docker + Docker Compose, NVIDIA API Key hoặc OpenRouter API Key
#
# Cách dùng:
#   1. Export API Key:
#      export NVIDIA_API_KEY="nvapi-xxx..."
#      (hoặc export OPENROUTER_API_KEY="sk-or-xxx...")
#
#   2. Chạy script:
#      bash setup.sh
#
#   3. Kiểm tra:
#      curl http://localhost:8082/v1/chat/completions \
#        -H "Content-Type: application/json" \
#        -d '{"model":"claude-3-5-sonnet","messages":[{"role":"user","content":"hello"}]}'
#
# =========================================================================

set -e

echo "🚀 Setting up free-claude-proxy..."

# Kiểm tra API Key
if [ -z "$NVIDIA_API_KEY" ] && [ -z "$OPENROUTER_API_KEY" ]; then
  echo "❌ ERROR: Cần export ít nhất 1 API Key:"
  echo "   export NVIDIA_API_KEY=\"nvapi-...\""
  echo "   hoặc export OPENROUTER_API_KEY=\"sk-or-...\""
  exit 1
fi

# Clone repo nếu chưa có
if [ ! -d "free-claude-code" ]; then
  echo "📦 Cloning free-claude-code..."
  git clone https://github.com/Alishahryar1/free-claude-code.git
else
  echo "📦 free-claude-code already exists, pulling latest..."
  cd free-claude-code && git pull && cd ..
fi

# Tạo .env cho proxy
cat > free-claude-code/.env << EOF
NVIDIA_API_KEY=${NVIDIA_API_KEY:-}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
PORT=8082
EOF

# Build và chạy
echo "🐳 Starting Docker container..."
cd free-claude-code
docker build -t free-claude-proxy .
docker stop free-claude-proxy 2>/dev/null || true
docker rm free-claude-proxy 2>/dev/null || true
docker run -d \
  --name free-claude-proxy \
  -p 8082:8082 \
  --env-file .env \
  --restart unless-stopped \
  free-claude-proxy

echo "✅ free-claude-proxy started on port 8082"
echo ""
echo "📋 Test với lệnh:"
echo "curl http://localhost:8082/v1/chat/completions \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"model\":\"claude-3-5-sonnet\",\"messages\":[{\"role\":\"user\",\"content\":\"hello\"}]}'"