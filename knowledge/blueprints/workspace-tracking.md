# 🗺 Workspace Tracking & Session Persistence

> **Mục đích**: Lưu plan tổng thể, tiến độ real-time, và cơ chế resume khi mất kết nối.
> **Last updated**: 2026-05-21

---

## 📋 Quy tắc Tracking

1. **Mỗi tool call PHẢI ghi `task_progress`** — không được bỏ qua
2. **Mỗi phiên làm việc**: đọc `state.md` → thực hiện → cập nhật `state.md`
3. **Mất kết nối**: đọc lại 3 file này → biết ngay đang làm gì
4. **Không assume context cũ** — luôn verify bằng file system

---

## 🎯 Project Roadmap (Tổng thể)

| Phase | Status | Mô tả |
|-------|--------|--------|
| **Phase 0: Foundation** | ✅ Hoàn tất | Engine v5.3, Discord Bot, MemoryCompressor, 9router |
| **Phase 1: Document Processing** | ✅ Hoàn tất | PDF/DOCX parser, converter, CLI scripts |
| **Phase 2: Wiki Integration** | ✅ Hoàn tất | md-archiver, search_archived_md, Formula Extractor |
| **Phase 2b: AutoSkills → Wiki Convert** | ✅ Hoàn tất | 217 skills converted → `knowledge/wiki/skills/` |
| **Phase 3: Agent System** | ✅ Hoàn tất | Tool Registry (9 plugins), model-adapter, Agent, HookRegistry, evolution, tracer |
| **Phase 3b: Restructure** | ✅ Hoàn tất | Flat → layered architecture (10 subdirectories, 39 files moved) |
| **Phase 4-8: Core Features** | ✅ Hoàn tất | Memory, Orchestration, Observability, SOPs, Patterns, Security |
| **Remaining** | 🔴 IN PROGRESS | Fix imports, wire modules, tests |

---

## 📊 Phase 2b: AutoSkills Conversion — Task Board

### Mục tiêu
Convert 217 skills từ `knowledge/references/autoskills/packages/autoskills/skills-registry/` → `knowledge/wiki/skills/` với format Kato wiki.

### Priority Map
| Level | Skills | Trạng thái |
|-------|--------|------------|
| **P0** | typescript-advanced-types, shadcn, next-best-practices, accessibility, agents-sdk | ✅ 5/5 done |
| **P1** | tailwind-css-patterns, react-best-practices, nodejs-best-practices, vitest, vue-best-practices | ✅ 5/5 done |
| **P2** | astro, angular-developer, svelte5-best-practices, turborepo | ✅ 4/4 done |
| **P3+** | 204 skills còn lại | ✅ 204/204 done |

### Task Board

```
✅ = Done | 🟡 = In Progress | ⬜ = Todo | ❌ = Blocked
```

| # | Task | Priority | Status | Ghi chú |
|---|------|----------|--------|---------|
| 1 | Script `convert-autoskill.mts` | P0 | ✅ | Hoàn tất, test OK |
| 2 | typescript-advanced-types | P0 | ✅ | Converted + _INDEX.md updated |
| 3 | tailwind-css-patterns | P1 | ✅ | |
| 4 | react-best-practices | P1 | ✅ | +2 sub-files (AGENTS, README) |
| 5 | nodejs-best-practices | P1 | ✅ | |
| 6 | vitest | P1 | ✅ | +1 sub-file (GENERATION) |
| 7 | vue-best-practices | P1 | ✅ | +2 sub-files (LICENSE, SYNC) |
| 8 | shadcn | P0 | ✅ | +3 refs (cli, customization, mcp) |
| 9 | next-best-practices | P0 | ✅ | +19 refs |
| 10 | accessibility | P0 | ✅ | |
| 11 | agents-sdk | P0 | ✅ | |
| 12 | astro | P2 | ✅ | |
| 13 | angular-developer | P2 | ✅ | 🔓 force-convert (flagged) |
| 14 | svelte5-best-practices | P2 | ✅ | |
| 15 | turborepo | P2 | ✅ | |
| 16 | Batch P3 (204 skills) | P3 | ✅ | Dùng --all --force |

---

## 🔄 Session Lifecycle

```
[Start session]
     ↓
1. Đọc workspace/state.md ──────────────────────→ Biết phase hiện tại
     ↓
2. Đọc blueprints/workspace-tracking.md ───────→ Biết task board
     ↓
3. Verify filesystem state ────────────────────→ File thực tế ≠ state.md?
     ↓
4. Execute next task ──────────────────────────→ Có task_progress
     ↓
5. Cập nhật state.md + tracking.md ───────────→ Persist ngay
     ↓
[End session / Mất kết nối]
     ↓
─→ Resume: đọc lại state.md → verify → continue
```

### Resume Checklist (khi mất kết nối)
- [ ] `state.md` — phase hiện tại?
- [ ] `changelog.md` — commit cuối cùng?
- [ ] `blueprints/workspace-tracking.md` — task nào đang chạy?
- [ ] Filesystem verify — file đã được tạo chưa?

---

## 📁 Cấu trúc Workspace Tracking
`knowledge/blueprints/autoskill-conversion-plan.md` for autoskill-specific plan.
`knowledge/workspace/restructure-final-manifest.md` for restructure status.

```
knowledge/
├── blueprints/
│   ├── workspace-tracking.md    ← FILE NÀY: plan + task board
│   └── autoskill-conversion-plan.md ← AutoSkills-specific plan + forensic
├── workspace/
│   ├── state.md                  ← Session state + kiến trúc hiện tại
│   ├── restructure-final-manifest.md ← Restructure status (✅ 95%)
│   └── known-issues-fix-plan.md  ← Active issues (P0/P1/P2)
├── wiki/
│   ├── core/
│   │   ├── changelog.md         ← Lịch sử thay đổi (append-only)
│   │   ├── soul.md              ← Nguyên tắc cốt lõi
│   │   └── role-architecture.md ← Phân chia vai trò
│   └── skills/                  ← Output của autoskills conversion
└── references/
    └── autoskills/              ← Source: 217 skills registry
```

---

## ⚡ Quick Resume

Khi mất kết nối và quay lại, chạy lệnh sau để biết trạng thái:

```powershell
# Kiểm tra file system state
Get-ChildItem -Path "knowledge/wiki/skills/" -Recurse -File

# Xem task board
Get-Content -Path "knowledge/blueprints/workspace-tracking.md" | Select-Object -First 50

# Xem session state
Get-Content -Path "knowledge/workspace/state.md"
```
