# AI-Agent Workspace State

> Last updated: 2026-05-15 15:33
>
> ⚠️ **Session persistence note**: Xem `knowledge/blueprints/workspace-tracking.md` để biết task board + resume checklist khi mất kết nối.

## Current Session Context

### Phase: ENGINE DEVELOPMENT (Phase 1, 2, 3 — COMPLETED ✅✅✅)
| Phase | Status |
|-------|--------|
| **Phase 1: Core Decoupling** | ✅ COMPLETED |
| **Phase 2: Proxy Infrastructure** | ✅ COMPLETED |
| **Phase 3: Validation & Optimization** | ✅ COMPLETED |

Engine version: **v5.3**. Chi tiết tại changelog.

## Kiến trúc hiện tại

```
src/index.ts                    ← Entry: init Engine → Adapter
├── src/core/engine.ts          ← Core Engine v5.3 (platform-agnostic)
├── src/core/llm.ts             ← LLM abstraction (streaming, tool execution)
├── src/core/provider-registry.ts ← Provider + Model routing
├── src/core/types.ts           ← Interfaces chuẩn hóa
├── src/core/memory-compressor.ts  ← Local Ollama compression engine
├── src/scripts/kato-state-manager.ts ← Workspace state persistence
├── config/providers.json       ← Provider config (9router, OpenRouter...)
├── docker/9router/             ← 9router proxy Docker setup
└── docker/free-claude-proxy/   ← Free Claude proxy (legacy)
```

## V5.3 Engine Features — Active

| Feature | Status | Description |
|---------|--------|-------------|
| **MemoryCompressor** | ✅ ACTIVATED | Local Ollama nén history dài → ~500 tokens summary |
| **Safe Context Truncator** | ✅ ACTIVE | Hard cap 8k tokens, tool-call atomic pair safety |
| **ReAct Loop Guard** | ✅ ACTIVE | Max 5 iterations, chống tool loop vô hạn |
| **Multi-Tier Cascade** | ✅ ACTIVE | Auto-fallback model khi lỗi, cooldown tracking |
| **Evolution Engine** | ✅ ACTIVE | Ghi nhận lỗi, routing advice, skip model failure cao |
| **Context re-compression** | 🆕 ACTIVE | Tái nén trong ReAct loop khi history > 10 messages |

## v5.1 Fallback Strategy — Resolved via Infrastructure

- **Chiến lược tự động switch model (Multi-Tier Cascade) ĐÃ ĐƯỢC GIẢI QUYẾT TẬN GỐC** ở tầng hạ tầng thông qua 9router.
- Engine v5.3 giữ cascade logic như lớp dự phòng cuối (last resort).
- **Không code thêm logic switch model vào Engine.** 9router là primary resolver.

## 📊 Phase Active: Phase 2 — Wiki Integration (IN PROGRESS)

| Sub-phase | Status |
|-----------|--------|
| Phase 2b: AutoSkills → Wiki Convert | ✅ HOÀN TẤT (217 skills) |
| md-archiver + search_archived_md | ⬜ TODO |
| Formula Extractor | ⬜ TODO |
| Phase 2c: Wiki Integration completion | ⬜ TODO |

## Vấn đề đang xử lý / Ưu tiên cao nhất

### [🔥 CRITICAL] Kích hoạt MemoryCompressor (Local Ollama)
- **Root cause token bloat**: engine.ts không gọi `compressHistory()` → context raw 50k tokens
- **Đã fix v5.3**: 
  - ✅ Initial request: gọi compressor trước khi build messages (lines 209-220)
  - 🆕 ReAct loop: tái nén khi `currentMessages` > 10 messages
- **Kỳ vọng**: 50k tokens → ~1,500 tokens/request (tương đương v4.0)
- **Phụ thuộc**: Local Ollama phải chạy trên máy
- **Status**: Cần verify compressor đang hoạt động, kiểm tra gọi `compressHistory()` trong ReAct loop

### Phase 1: Document Processing — ĐANG HOẠT ĐỘNG
- ✅ `document/` module: pdf-parser, docx-parser, parser factory, converter
- ✅ 3 tools mới: `read_docx`, `extract_pdf_to_md`, `extract_docx_to_md`
- ✅ CLI script: `scripts/convert-doc-to-md.mjs`
- ✅ `knowledge/raw-md/` archive directory
- ✅ Prompt builder updated (9 bước)
- ✅ Changelog cập nhật

### Các mục khác đang tracked
1. ⬜ Engine test suite chính thức (không chỉ CLI)
2. ⬜ Provider config validation at boot
3. ⬜ Token management optimization (9router waste)
4. ⬜ Error handling improvements (circuit breaker, retry logic)
5. ⬜ Health check monitor cho Cache Efficiency
6. ⬜ OpenRouter credits để dùng Claude model
7. ⬜ Phase 2: Wiki Integration (md-archiver, search_archived_md)
8. ⬜ Phase 2: Formula Extractor (formula-extractor.ts riêng)
9. ⬜ Phase 3-5: Report Generator + DOCX Builder + Deploy

## Task Queue Status

### Phase 2: ENGINE (✅ COMPLETED)
1. ✅ Integrate 9router into AI-Agent token management pipeline
2. ✅ Build core engine (`src/core/engine.ts`)
3. ✅ Core LLM module (`src/core/llm.ts`)
4. ✅ Kato Runtime Creation & Test-Engine CLI
5. ✅ Discord Integration
6. ⬜ Engine testing complete — Pending proper test suite
7. ⬜ Provider configuration validation — Pending
8. ⬜ Token management optimization — Pending
9. ⬜ Error handling & resilience — Pending

### Phase 3: AGENT (not started)
### Phase 4: KNOWLEDGE (not started)
### Phase 5: DEPLOY (not started)

## Active Files
| File | Purpose |
|------|---------|
| `src/core/engine.ts` | Core Engine v5.3 — MemoryCompressor active, truncator, loop guard |
| `src/core/llm.ts` | LLM abstraction with streaming, tool execution |
| `src/core/memory-compressor.ts` | Local Ollama compression engine |
| `src/scripts/kato-state-manager.ts` | Workspace state persistence |
| `src/scripts/start-discord.ts` | Discord bot bridge for Kato |
| `src/index.ts` | Application entry point |
| `config/providers.json` | Provider configuration (9router, OpenRouter, etc.) |
| `docker/9router/docker-compose.yml` | 9router proxy Docker setup |

## Cách khởi động bot (cho reference phiên sau)
```cmd
npm run start:discord
:: hoặc double-click kato-boot.bat
```
File entry: `src/scripts/start-discord.ts` — KHÔNG chạy thủ công `npx tsx src/modules/discord/index.ts`

## Next Actions (ưu tiên)
1. [🔥 CRITICAL] **BẬT LẠI MemoryCompressor** trong engine.ts — nén context trước khi gửi
2. Complete engine test suite
3. Provider config validation at boot
4. Token management optimization (address 9router waste)
5. Error handling improvements (circuit breaker, retry logic)
