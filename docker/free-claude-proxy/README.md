# free-claude-proxy

Proxy trung chuyển để gọi Claude model qua NVIDIA/OpenRouter API.
Tích hợp với Kato Agent v5.0 qua `config/providers.json`.

## Yêu cầu

- Docker + Docker Compose
- NVIDIA API Key: https://build.nvidia.com/explore/discover
- Hoặc OpenRouter API Key: https://openrouter.ai/keys

## Cài đặt

### 1. Export API Key

```bash
export NVIDIA_API_KEY="nvapi-votre-cle-ici"
```

Hoặc:

```bash
export OPENROUTER_API_KEY="sk-or-votre-cle-ici"
```

### 2. Chạy setup script

```bash
cd docker/free-claude-proxy
bash setup.sh
```

### 3. Kiểm tra

```bash
curl http://localhost:8082/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet","messages":[{"role":"user","content":"hello"}]}'
```

## Cấu hình Kato Agent

Sau khi proxy chạy, `config/providers.json` đã có sẵn block:

```json
{
  "name": "custom_anthropic_proxy",
  "baseUrl": "http://localhost:8082/v1",
  "apiKey": "",
  "models": ["claude-3-5-sonnet", "claude-3-opus"]
}
```

Trên Discord, gõ lệnh để chuyển model:

```
/switch model: claude-3-5-sonnet
```

## Cấu trúc thư mục

```
docker/free-claude-proxy/
├── docker-compose.yml    # Docker Compose config
├── Dockerfile            # Build image
├── setup.sh              # Setup script (clone + build + run)
└── README.md             # File này