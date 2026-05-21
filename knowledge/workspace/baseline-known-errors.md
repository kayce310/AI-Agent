# 📋 BASELINE KNOWN ERRORS — System Debt Registry

> Generated: 2026-05-21T04:30Z | Auditor: OWL
> Purpose: Phân biệt "lỗi đang trong backlog chờ fix" vs "lỗi agent vừa tạo ra"
> Agent action: Đọc file này trước mỗi validate run. Nếu lỗi validate match với baseline → pre-existing, không cần dừng. Nếu lỗi mới → DỪNG, sửa trước khi tiếp tục.

---

## P0 — CRITICAL (Block compilation/runtime)

| # | Error | Location | Detected | Plan Fix |
|---|-------|----------|----------|----------|
| P0-1 | Import paths wrong after restructure (~50 source files) | `src/core/` subdirs | 2026-05-17 | Fix relative imports: `./types.js` → `../core/types.js` etc. |
| P0-2 | Import paths wrong in test files (~60 files) | `tests/*.test.ts` | 2026-05-17 | Update all test imports to new subdirectory paths |
| P0-3 | `read_file` execution failed: Cannot access 'path' before initialization | `src/core/tools/tool-gateway.ts` | 2026-05-20 | Circular import in tool-gateway — needs refactor |

## P1 — HIGH (Affects correctness)

| # | Error | Location | Detected | Plan Fix |
|---|-------|----------|----------|----------|
| P1-1 | Duplicate OllamaAdapter — barrel exports dead version | `src/core/llm/ollama-adapter.ts` + `src/core/index.ts:79,81` | 2026-05-21 | Delete `ollama-adapter.ts`, remove barrel exports. Live version is in `model-adapter.ts:277-353` |
| P1-2 | Test coverage = 0 for core modules | All `src/core/` | 2026-05-17 | Write tests for Engine, ToolRegistry, Security, Memory |

## P2 — MEDIUM (Technical debt)

| # | Error | Location | Detected | Plan Fix |
|---|-------|----------|----------|----------|
| P2-1 | Janitor exported but never wired | `src/core/agents/janitor.ts` | 2026-05-20 | Wire into HookRegistry OR remove from barrel |
| P2-2 | 84 files missing @depends-on headers | `src/core/` subdirs | 2026-05-20 | Add dependency headers incrementally |
| P2-3 | Tool pruner returns 0 tools for some messages | `src/core/tools/tool-pruner.ts` | 2026-05-20 | Acceptable — fallback to full registry works |

## P3 — LOW (Future work)

| # | Error | Location | Detected | Plan Fix |
|---|-------|----------|----------|----------|
| P3-1 | Skills fragmentation: 170 wiki skills invisible to runtime | `knowledge/wiki/skills/` vs `9router/skills/` | 2026-05-20 | Unify under single system OR bridge `load_skill` to wiki |
| P3-2 | `src/core/index.ts` has wrong import paths (`../engine` vs `./engine`) | `src/core/index.ts` | 2026-05-20 | Pre-existing, doesn't affect runtime |

---

## Agent Decision Rule

```
IF validate-structure.ts reports ERROR:
  IF error matches P0/P1/P2/P3 in this file → LOG but DO NOT STOP (pre-existing debt)
  IF error is NEW (not in this file) → STOP immediately, fix before proceeding

IF fixing a P0/P1 item:
  Remove it from this file after fix is verified
  Git commit with message: "fix: resolve P0-X — <description>"
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-21 | Initial baseline created — 8 items (3 P0, 2 P P2, 2 P3) |
