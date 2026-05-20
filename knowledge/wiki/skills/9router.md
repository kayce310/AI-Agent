---
name: 9router
description: Local/remote AI gateway with OpenAI-compatible REST API. Routes requests to multiple providers (chat, image, TTS, STT, embeddings, web search, web fetch).
link: https://github.com/decolua/9router
---

# 9Router Integration

**9Router** là AI gateway local/remote với OpenAI-compatible REST API.

## Thiết lập nhanh

```bash
export NINEROUTER_URL="http://localhost:20128"      # local or VPS/tunnel URL
export NINEROUTER_KEY="sk-..."                      # từ Dashboard (nếu requireApiKey=true)
```

## Kiểm tra Health

```bash
curl $NINEROUTER_URL/api/health
```

## Discover Models

```bash
curl $NINEROUTER_URL/v1/models                  # chat/LLM
curl $NINEROUTER_URL/v1/models/image            # image-gen
curl $NINEROUTER_URL/v1/models/tts              # text-to-speech
curl $NINEROUTER_URL/v1/models/embedding        # embeddings
curl $NINEROUTER_URL/v1/models/web              # web search + fetch
curl $NINEROUTER_URL/v1/models/stt              # speech-to-text
```

## Capability Skills

- [[9router-chat]] — LLM chat, code generation
- [[9router-image]] — Image generation
- [[9router-tts]] — Text-to-speech
- [[9router-stt]] — Speech-to-text
- [[9router-embeddings]] — Text embeddings
- [[9router-web-search]] — Web search
- [[9router-web-fetch]] — URL → markdown

## Errors

| Code | Giải pháp |
|------|-----------|
| 401 | Refresh `NINEROUTER_KEY` ở Dashboard |
| 400 `Invalid model format` | Kiểm tra model tồn tại trong `/v1/models/<kind>` |
| 503 `All accounts unavailable` | Chờ retry-after hoặc thêm provider account |

#9router #gateway #ai
