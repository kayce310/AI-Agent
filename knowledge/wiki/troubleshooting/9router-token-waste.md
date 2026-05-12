# ⚡ Root Cause: Token Waste khi tích hợp 9router

## Hiện trạng

```
Cấp độ 1: Kato Engine Cascade (3-5 model tiers)
    ↓ Retry khi fail
Cấp độ 2: 9router Internal Failover (provider-level)
    ↓ Retry khi 429/timeout
Cấp độ 3: Provider API (Gemini, OpenRouter...)
```

## Định lượng Token Waste

| Nguồn | Token/request | Số lần nhân | Waste |
|-------|--------------|-------------|-------|
| System prompt 8 tầng | ~4K | × (3-5 cascade attempts) | **12K-20K** |
| Context files (nếu có) | ~3K | × (3-5 cascade) | **9K-15K** |
| 9router backup JSON full | ~8K | × 1 (nếu load) | **8K** |
| Provider retry trong 9router | ~7K | × 2-3 ẩn | **14K-21K** |
| **Tổng/request** | | | **~43K-64K** |

> Có request chỉ cần 1 response, nhưng tốn 50K+ token vì nested routing.

## Kiến trúc vấn đề

```
┌─────────────────────────────────────────┐
│ Kato Engine.process()                   │
│  ├─ buildSystem() → 8 tầng prompt ~4K   │
│  ├─ cascade loop (model 1 fail → 2→3)   │
│  │   MỖI LẦN: gửi LẠI full prompt       │
│  │                                       │
│  └─ provider.invoke(payload)             │
│       └─ 9router (proxy)                │
│            ├─ internal failover          │
│            └─ provider API call          │
└─────────────────────────────────────────┘
```

## 4 Root Causes

### 1. Nested Routing (double retry)
- Engine cascade: thử model A → fail → model B (gửi lại full context)
- 9router: thử Gemini → 429 → tự retry OpenRouter (gửi lại full context)
- **Giải pháp**: Engine cascade *hoặc* 9router failover, không cả hai.

### 2. Không cache system prompt
- `PromptBuilder.buildSystem()` tạo prompt mới mỗi request
- cascade fail → rebuild + retransmit
- **Giải pháp**: Cache theo hash của `(agentName + task + constraints)`

### 3. Context file overload
- `loadContextFiles()` đọc toàn bộ file → truncate 3K mỗi file
- Nếu file lớn/không liên quan → waste
- **Giải pháp**: Lazy load + content budget (chỉ load file nào thực sự cần cho câu hỏi hiện tại)

### 4. 9router backup JSON noise
- File 250 dòng chứa API key cũ, model lock disabled, connection config không active
- Chiếm ~8K tokens nếu load vào context
- **Giải pháp**: Pre-process: chỉ giữ provider connections active + priority > 0

## Giải pháp đề xuất

### Option A: 🏆 Unify Routing (recommended)
Chỉ một layer chịu trách nhiệm routing:
- **Khi có 9router**: Engine cascade OFF → gửi thẳng tới 9router, để nó xử lý failover
- **Khi không có 9router**: Engine cascade ON như hiện tại

```
Engine → 9router (single call, no cascade)
   → 9router handles: fallback, rate limit, retry
   → Engine chỉ nhận kết quả cuối cùng
```

### Option B: System Prompt Cache
```typescript
// PromptBuilder.ts
class PromptCache {
  private cache = new Map<string, string>();
  
  getKey(params: BuildParams): string {
    return hash(`${params.agentName}|${params.task}|${params.constraints}`);
  }
  
  buildCached(params: BuildParams): string {
    const key = this.getKey(params);
    if (this.cache.has(key)) return this.cache.get(key)!;
    const prompt = this.buildSystem(params);
    this.cache.set(key, prompt);
    return prompt;
  }
}
```

### Option C: Context Budget per Tier
| Tier | Context budget | Khi nào dùng |
|------|---------------|--------------|
| Tier 1 (mạnh) | Full 8 tầng + context files | Luôn |
| Tier 2 (trung bình) | 5 tầng, no context files | Cascade fallback |
| Tier 3 (yếu/rẻ) | 3 tầng, truncate 1K | Cascade cuối |

### Option D: Lazy Context Loading
- Không load `requiredContextFiles` ngay từ đầu
- Chỉ load khi tool call `read_context_file` được invoke
- Tiết kiệm 3K-8K token cho request không cần context

## Priority Implementation

```
Priority 1 (Immediate, 0 code change):
├─ Xóa file backup JSON khỏi context loading ❌ (config issue)
├─ Kiểm tra xem 9router có đang double-retry không 🔍

Priority 2 (Low effort, high impact):
├─ Unify routing: Engine cascade → OFF khi có 9router
├─ Tiết kiệm: ~15K-25K token/request (~50%)

Priority 3 (Medium effort):
├─ System prompt cache (hash-based)
├─ Tiết kiệm: ~4K token/cascade attempt

Priority 4 (High effort, nice to have):
├─ Context budget per tier
├─ Lazy context loading
├─ Tiết kiệm: ~5K-10K token/request
```

## Anti-Patterns Learned (ADD TO AGENTS.md)

| Anti-Pattern | Fix |
|-------------|-----|
| ❌ Double routing layer (Engine cascade + 9router failover) | ✅ Unify: chỉ 1 layer chịu trách nhiệm retry |
| ❌ Rebuild system prompt mỗi cascade attempt | ✅ Cache theo hash hoặc reuse object |
| ❌ Load toàn bộ context files cho mọi request | ✅ Lazy load: chỉ load khi tool call yêu cầu |
| ❌ Load raw 9router backup JSON (250 dòng) vào context | ✅ Pre-process: lọc chỉ active connections |

---

#routing #token-waste #performance #9router #optimization