# 🔧 Known Issues — Fix Plan

> **Created**: 2026-05-21T03:00:00Z
> **Priority**: HIGH

---

## Issue 1: `read_file` — "Cannot access 'path' before initialization"

### Root Cause
Circular import chain:
```
tool-gateway.ts → privilege-guard.js (isPathSafe)
privilege-guard.ts → tool-gateway.js (WORKSPACE_ROOT) [IMPLICIT via engine init]
```

Khi `tool-gateway.ts` import `isPathSafe` từ `privilege-guard.js`, nhưng `privilege-guard.ts` lại cần `path` module. Trong ESM, khi có circular dependency, module có thể chưa fully initialized khi được import.

### Fix Option A: Move `isPathSafe` to `_shared.ts` (RECOMMENDED)
- `_shared.ts` đã có `isPathSafe` implementation
- `tool-gateway.ts` nên import từ `_shared.js` thay vì `privilege-guard.js`
- `privilege-guard.ts` cũng import từ `_shared.js`
- **Pros**: Đơn giản, không phá vỡ architecture
- **Cons**: Duplicate logic (nhưng `_shared.ts` đã là single source of truth)

### Fix Option B: Inline `isPathSafe` trong `tool-gateway.ts`
- Copy logic từ `privilege-guard.ts` vào `tool-gateway.ts`
- **Pros**: Loại bỏ circular dependency hoàn toàn
- **Cons**: Code duplication

### Fix Option C: Tạo `path-utils.ts` riệt
- Tạo file mới `src/core/tools/path-utils.ts` chứa `isPathSafe`
- Cả `tool-gateway.ts` và `privilege-guard.ts` import từ đây
- **Pros**: Clean separation, no duplication
- **Cons**: Thêm file mới

### Recommended: Option A
```typescript
// tool-gateway.ts — line 14
// BEFORE:
import { isPathSafe } from '../security/privilege-guard.js';
// AFTER:
import { isPathSafe } from './_shared.js';
```

---

## Issue 2: Tool Pruner Returns 0 Tools

### Root Cause
`selectRelevantTools()` chỉ match keywords trong user message. Nếu user message không chứa keywords cụ thể (ví dụ: "hello", "help"), pruner trả về empty array.

### Current Behavior
- Empty result → caller fallback to full registry (18 tools)
- Hoạt động đúng như thiết kế

### Fix Option A: Always return core tools as minimum (RECOMMENDED)
```typescript
// selectRelevantTools() — sau khi check keywords
if (matchedToolNames.size === 0) {
  // Return core tools instead of empty
  return _allToolDefinitions.filter((t: any) => 
    CORE_TOOLS.includes(t.function?.name)
  );
}
```
- **Pros**: Luôn có tools available, giảm token waste
- **Cons**: Có thể trả về tools không cần thiết

### Fix Option B: Improve keyword matching
- Thêm nhiều keywords hơn
- Dùng fuzzy matching hoặc semantic similarity
- **Pros**: Chính xác hơn
- **Cons**: Phức tạp hơn

### Recommended: Option A
Luôn return core tools (list_directory, read_file, search_knowledge_graph, write_wiki_page, fetch_url) as minimum.

---

## Issue 3: 84 Files Missing @depends-on Headers

### Root Cause
Các files được tạo trước khi Luật Validate Structure được áp dụng.

### Fix Strategy
Batch update theo priority:

**Priority 1** (files thường xuyên sửa):
- `src/core/tools/tool-registry.ts`
- `src/core/tools/tool-gateway.ts`
- `src/core/tools/_shared.ts`
- `src/core/security/privilege-guard.ts`
- `src/core/engine/engine.ts`
- `src/core/engine/agent.ts`

**Priority 2** (files ít sửa):
- Các files khác trong `src/core/`

### Header Format
```typescript
/**
 * @file [filename] — [description]
 * @layer [core|modules|scripts]
 * @depends-on [dependency files]
 * @imported-by [files that import this]
 * @owner [owner]
 */
```

---

## Implementation Order

1. **Issue 1** (HIGH) — Fix circular import → bot hoạt động đúng
2. **Issue 2** (MEDIUM) — Improve tool pruner → giảm token waste
3. **Issue 3** (LOW) — Batch add headers → code quality

---

> 📌 **Next Action**: Implement Issue 1 Fix Option A (move isPathSafe import to _shared.js)
