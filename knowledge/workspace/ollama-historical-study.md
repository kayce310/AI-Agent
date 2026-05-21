# 📜 BÁO CÁO KHẢO CỔ KIẾN TRÚC: OLLAMA ADAPTER

> Generated: 2026-05-21T04:08Z | Auditor: OWL (Archaeological Review)
> Scope: Full codebase scan per CLINE.md audit protocol — NO code changes made.

---

## 1. CHỨC NĂNG LỊCH SỬ XÁC ĐỊNH

### 1.1 Module: `src/core/llm/ollama-adapter.ts`

| Attribute | Value |
|-----------|-------|
| **File size** | 2,252 bytes (91 lines) |
| **Created** | Phase 6.5 (per JSDoc: `Phase 6.5: run local models (Llama, Mistral, Phi, etc.)`) |
| **Class** | `OllamaAdapter implements ModelAdapter` |
| **Purpose** | Local LLM inference via Ollama runtime — provides offline model execution without cloud API dependency |
| **Default model** | `llama3.2` |
| **Default endpoint** | `http://localhost:11434` |
| **Timeout** | 120,000ms |

### 1.2 Module: `src/core/llm/model-adapter.ts` (DUPLICATE OllamaAdapter)

| Attribute | Value |
|-----------|-------|
| **Lines** | 277–353 (second `OllamaAdapter` class) |
| **Created** | Phase 3.2 (per file header: `Phase 3.2 — cho phép fallback chain + multi-provider`) |
| **Class** | `OllamaAdapter implements ModelAdapter` (duplicate name) |
| **Default model** | `llama3.1:8b` |
| **Default endpoint** | `http://127.0.0.1:11434` |
| **Env vars** | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| **Integration** | Registered in `buildDefaultRouter()` at line 478 — **actively wired into ModelRouter** |

### 🔴 CRITICAL FINDING: DUPLICATE OllamaAdapter

There are **TWO** `OllamaAdapter` classes in the codebase:

1. **`src/core/llm/ollama-adapter.ts`** — standalone file, exported via `src/core/index.ts` (line 79, 81), but **NOT imported by any runtime engine file**. The JSDoc claims `@imported-by src/core/engine/engine.ts` but search confirms engine.ts has zero references to ollama.

2. **`src/core/llm/model-adapter.ts` (lines 277–353)** — inline definition, **actively registered** in `buildDefaultRouter()` and wired into the ModelRouter fallback chain.

**The standalone `ollama-adapter.ts` is DEAD CODE at runtime.** The live OllamaAdapter is the one inside `model-adapter.ts`.

---

## 2. CÁC CẤU PHẦN TỪNG LIÊN KẾT

### 2.1 Active Runtime References (model-adapter.ts version)

| Component | File | Relationship |
|-----------|------|-------------|
| **ModelRouter** | `src/core/llm/model-adapter.ts:478` | Registers OllamaAdapter via `buildDefaultRouter()` |
| **buildDefaultRouter()** | `src/core/llm/model-adapter.ts:457` | Factory function that creates router with Ollama fallback |
| **MemoryCompressor** | `src/core/memory/memory-compressor.ts:31` | Uses Ollama at `http://127.0.0.1:11434/v1` for context compression |
| **9router config** | `knowledge/blueprints/9router-backup-*.json` | Contains `ollama/` provider entries (gpt-oss:120b, minimax-m2.5, glm-4.7-flash, qwen3.5, kimi-k2.5, glm-5) |

### 2.2 Barrel Export References (ollama-adapter.ts — dead)

| Component | File | Relationship |
|-----------|------|-------------|
| **Core barrel** | `src/core/index.ts:79` | `export { OllamaAdapter, OllamaAdapterConfig } from '../llm/ollama-adapter.js'` |
| **Core barrel** | `src/core/index.ts:81` | `export * from '../llm/ollama-adapter.js'` |

> ⚠️ The barrel exports `OllamaAdapter` from `ollama-adapter.ts`, but `model-adapter.ts` ALSO exports an `OllamaAdapter`. The barrel import at line 79/81 may shadow the model-adapter version for any consumer importing from the barrel.

### 2.3 Documentation & Planning References

| Document | Reference |
|----------|-----------|
| `knowledge/blueprints/kato-roadmap-phases-4-8.md:61` | Phase 6.5 — `OllamaAdapter` — local model inference (120 lines, 🟢 LOW priority) |
| `knowledge/blueprints/phase-3-upgrade-plan.md:213` | "Dùng local models (Ollama) khi offline" |
| `knowledge/blueprints/phase-3-upgrade-plan.md:596` | Success criteria: "Model Adapter có fallback (9router → Ollama)" |
| `knowledge/blueprints/restructure-plan.md:73,188,260` | Planned move: `ollama-adapter.ts` → `src/core/llm/ollama-adapter.ts` (already there) |
| `knowledge/workspace/state.md:26,37,61-68` | MemoryCompressor depends on Local Ollama |
| `knowledge/wiki/core/llm-architecture.md:34` | Lists Ollama as supported proxy |
| `knowledge/wiki/core/architecture-decisions.md:156` | ADR-004: Ollama listed as one of 5 adapters |
| `knowledge/wiki/repos/ollama-analysis.md` | Full repo analysis — recommends Ollama as local-first fallback |
| `audit-report.md:13` | Lists ollama-adapter.ts as "pre-existing" (2252 bytes) |
| `deep-audit-report.md:31` | Phase 6 — ollama-adapter.ts "Created this session" |

### 2.4 9router Backup — Ollama Models Configured

The 9router backup configs contain these Ollama models:
- `ollama/gpt-oss:120b`
- `ollama/minimax-m2.5`
- `ollama/glm-4.7-flash`
- `ollama/qwen3.5`
- `ollama/kimi-k2.5`
- `ollama/glm-5`

Plus a 403 error log: `"this model requires a subscription, upgrade for access: https://ollama.com/upgrade"` — indicating Ollama was actively used but hit model access limits.

---

## 3. GIÁ TRỊ SỬ DỤNG TRONG TƯƠNG LAI

### 3.1 Fallback Chain Value

The OllamaAdapter serves as the **last-resort fallback** in the ModelRouter cascade:
```
9router (primary) → LiteLLM (optional) → Ollama (local fallback)
```

Per `buildDefaultRouter()` at `model-adapter.ts:457-485`:
- 9router is the default adapter
- Ollama is registered only if `OLLAMA_BASE_URL` or `OLLAMA_MODEL` env vars are set
- If all cloud providers fail, Ollama provides offline inference

### 3.2 MemoryCompressor Dependency

`memory-compressor.ts` directly depends on a local LLM endpoint at `http://127.0.0.1:11434/v1` for context compression. This is functionally an Ollama consumer, though it uses the OpenAI SDK directly rather than going through the OllamaAdapter class.

### 3.3 Self-Dev Router Value

Per `knowledge/wiki/repos/ollama-analysis.md:33`:
> "Local-first fallback — Kato should support Ollama as a local fallback for routine tasks, reserving Claude for complex reasoning"

This aligns with the system's architectural vision of:
- **Privacy**: Local inference for sensitive data
- **Cost reduction**: Free local models for routine tasks
- **Resilience**: Offline capability when cloud providers are unreachable
- **9router integration**: 6 Ollama models already configured in 9router backups

### 3.4 Duplicate Code Risk

The existence of TWO `OllamaAdapter` classes creates:
- **Confusion**: Barrel exports the dead one, runtime uses the live one
- **Maintenance drift**: Changes to one won't propagate to the other
- **Audit false positive**: The standalone file appears "alive" due to barrel exports but is never instantiated at runtime

---

## 4. KHUYẾN NGHỊ TRẠNG THÁI

### 🔴 ĐỀ XUẤT: CÁCH LY + CONSOLIDATE (Không xóa)

**Rationale:**

| Factor | Assessment |
|--------|-----------|
| Runtime usage | ❌ Standalone `ollama-adapter.ts` is NOT imported by engine.ts or any runtime path |
| Duplicate exists | ✅ Live `OllamaAdapter` exists in `model-adapter.ts` with full ModelRouter integration |
| Architectural value | 🟡 Ollama as fallback is architecturally important (ADR-004, Phase 6.5) |
| MemoryCompressor | 🟡 Uses Ollama endpoint directly, not through either adapter class |
| 9router config | 🟢 6 Ollama models configured in backup — proven operational history |
| Export conflict | 🔴 Barrel exports dead version, potentially shadowing live version |

**Recommended Actions (for Tech Lead approval):**

1. **DO NOT DELETE** `src/core/llm/ollama-adapter.ts` — it represents the Phase 6.5 standalone adapter design
2. **DO NOT DELETE** the `OllamaAdapter` inside `src/core/llm/model-adapter.ts` — it is the runtime-active adapter
3. **CONSIDER**: Remove barrel exports of `ollama-adapter.ts` from `src/core/index.ts` (lines 79, 81) to eliminate the shadowing conflict — the model-adapter barrel already exports the live version
4. **CONSIDER**: Add a `// @deprecated` JSDoc tag to `ollama-adapter.ts` noting the live version is in `model-adapter.ts`
5. **CONSIDER**: Move `ollama-adapter.ts` to `knowledge/references/` as architectural reference if cleanup is desired, preserving it as documentation of the Phase 6.5 design intent

**Khuyến nghị trạng thái: XÓA DEAD CODE + FIX BARREL EXPORT**

Dead code trong `src/` không phải archive — nó là noise. Git history đã là archive tốt nhất. Giữ dead file trong source tree gây confusion cho agent đọc codebase và tạo barrel shadowing.

**Actions (theo thứ tự ưu tiên P1):**

1. **XÓA** `src/core/llm/ollama-adapter.ts` — file này không bao giờ được import tại runtime
2. **XÓA** barrel exports từ `src/core/index.ts` lines 79, 81 — đang export dead version, shadowing live version trong `model-adapter.ts`
3. **GIỮ** `OllamaAdapter` class trong `src/core/llm/model-adapter.ts` (lines 277-353) — đây là version thực sự hoạt động

---

## 5. EVIDENCE SUMMARY

| Evidence Source | Finding |
|----------------|---------|
| `src/core/llm/ollama-adapter.ts` | Standalone adapter, 91 lines, NOT imported at runtime |
| `src/core/llm/model-adapter.ts:277-353` | Live adapter, registered in `buildDefaultRouter()` |
| `src/core/index.ts:79,81` | Barrel exports dead version (shadowing risk) |
| `src/core/engine/*.ts` | Zero imports of ollama-adapter.ts |
| `src/core/memory/memory-compressor.ts:31` | Direct Ollama consumer (not via adapter) |
| `knowledge/blueprints/9router-backup-*.json` | 6 Ollama models configured, 403 error logged |
| `knowledge/blueprints/kato-roadmap-phases-4-8.md:61` | Phase 6.5 — planned as LOW priority |
| `knowledge/wiki/repos/ollama-analysis.md` | Recommends Ollama as local-first fallback |
| `knowledge/wiki/core/architecture-decisions.md:156` | ADR-004 lists Ollama as 1 of 5 adapters |
| `audit-report.md:13` | Lists as "pre-existing" |
| `deep-audit-report.md:31` | Lists as "Created this session" |

---

*End of archaeological report. No files were modified, moved, or deleted during this review.*
