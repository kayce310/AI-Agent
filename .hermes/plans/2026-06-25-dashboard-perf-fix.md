# Coral Dashboard Performance Fix Plan

> **Goal:** Fix 5 critical rendering/API performance issues từ CAMEL debate, mỗi task nhỏ độc lập, commit + verify từng bước
>
> **Architecture:** Server (`http-server.ts`) serve files directly from `src/dashboard/` — mỗi request đọc file mới → **không cần restart server**
>
> **Verification per task:** `node --check` syntax → `curl` server response (200) → git commit
>
> **Git:** Commit sau mỗi task. No exceptions.

---

## Task 1: RAF Debounce cho `renderAllFromState()`
- **What:** Thêm `requestAnimationFrame` debounce — thay `renderAllFromState()` trong `ws.onmessage` bằng `scheduleRender()`
- **Why:** 300+ DOM render passes/sec → ~60 passes/sec (RAF frame rate)
- **Lines changed:** +1 var, +8 lines
- **Risk:** Rendering có delay 1 frame (~16ms) nhưng không ảnh hưởng UX vì RAF chạy trước paint

## Task 2: Tab-Aware Rendering
- **What:** `switch(currentTab)` trong `renderAllFromState()` — chỉ render sections của tab active
- **Why:** 50% calls là vô ích (vd: renderTrace khi đang ở Mission tab)
- **Lines changed:** ~15 lines restructured
- **Risk:** Cần đảm bảo tab switch vẫn render đúng (đã có `switchTab()` riêng)

## Task 3: API Response Cache 5s TTL
- **What:** Thêm `_cachedFetch(url, ttlMs)` wrapper, áp dụng cho 8 fetch() calls trong renderTrace/renderMcpTrace/renderCost/renderControl
- **Why:** 400+ API req/sec khi ở trace tab → ~1.6 req/sec với cache 5s
- **Lines changed:** ~20 lines (+1 util, ~9 fetch calls)
- **Risk:** Stale data tối đa 5s — chấp nhận được cho trace/cost/health

## Task 4: Timeline — trim xuống 50 items + use DocumentFragment
- **What:** Giảm timeline max items 100→50, dùng DocumentFragment cho batch DOM insert
- **Why:** Timeline chiếm 50% DOM operations, 100 items rebuild mỗi lần
- **Lines changed:** ~10 lines
- **Risk:** User mất 50 items cũ nhất — timeline luôn hiển thị mới nhất

## Task 5: Object.assign whitelist + graph cache
- **What:** Clone state từ backend với whitelist keys, cache graph data theo taskId
- **Why:** Tránh ghi đè frontend-only fields + giảm graph API calls
- **Lines changed:** ~30 lines
- **Risk:** Backend thêm field mới → frontend không nhận được → cần update whitelist
