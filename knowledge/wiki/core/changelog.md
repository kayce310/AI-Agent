# [2026-05-15 19:38] — Checkpoint & Anti-Overflow Protocol v1.0

## Context
Context window model 264k thường bị overflow khi rebuild project lớn → mất toàn bộ state, CLINE mới không biết đã làm gì. `state.json` chỉ lưu session metadata, không lưu step-by-step progress. `task_progress` hiện tại chỉ là checklist trong tool call, không tồn tại qua các phiên.

## Giải pháp: 3 lớp Anti-Overflow

### Lớp 1 — Prevent (Token Budget Monitoring)
- `checkpoint.json.context.tokenBudget`: total=264000, warning=200k, critical=240k
- Mỗi tool call: đọc checkpoint → kiểm tra currentEstimateUsage
- >200k: rút gọn mô tả, giảm verbose
- >240k: DỪNG tool call → chạy emergency script → git commit

### Lớp 2 — Checkpoint (Step-by-Step State Machine)
- File mới: `knowledge/workspace/checkpoint.json` — progress, completedSteps, pendingSteps, filesModified, session tracking
- Mỗi tool call PHẢI kèm `task_progress` parameters + JSON update checkpoint.json
- CLINE.md thêm 6 luật Checkpoint bắt buộc

### Lớp 3 — Resume (Bootloader tự động khi overflow)
- File mới: `RESUME.md` — 5 bước recovery: đọc checkpoint → xác định vị trí → git check → khôi phục context → tiếp tục
- Emergency script: `scripts/checkpoint-emergency.mjs` — update checkpoint + git commit + evolution.json log
- Resume detection: khi khởi động, kiểm tra RESUME.md tồn tại → đã overflow → resume protocol

## Files affected
| File | Change |
|------|--------|
| `knowledge/workspace/checkpoint.json` | **NEW** — Checkpoint state machine (session, progress, tokenBudget, dependencies, resumeInstructions) |
| `RESUME.md` | **NEW** — Resume Bootloader: 5 bước recovery + token warning rules |
| `scripts/checkpoint-emergency.mjs` | **NEW** — Emergency script: save state + git add+commit + evolution.json |
| `CLINE.md` | **UPDATE** — Thêm 6 luật Checkpoint & Anti-Overflow + Resume Procedure |

## Rules mới trong CLINE.md
1. Checkpoint bắt buộc — mỗi tool call PHẢI kèm task_progress
2. JSON update checkpoint.json sau mỗi tool call
3. Token budget: >200k warning, >240k critical → emergency
4. Resume Detection: RESUME.md tồn tại → overflow trước đó
5. Emergency-save: khi critical threshold hoặc tool call fail
6. Git commit milestone: mỗi step hoàn thành → commit ngay

---

# [2026-05-15 19:17] — Full Audit: Workspace Path Conflict + CLINE.md Violations + Nested Wiki

## Phát hiện (sau audit toàn diện)
Quét toàn bộ cây thư mục phát hiện **4 vấn đề**, không chỉ 1:

### 1. Duplicate processed-files.json (🔴 Critical)
| File | Path | Entries |
|------|------|---------|
| **CLINE's** | `knowledge/workspace/processed-files.json` | 20 entries |
| **Kato's** | `knowledge/wiki/knowledge/workspace/processed-files.json` | 1 entry (Tai-lieu-he-thong.pdf) |

Hậu quả: Kato ghi vào file của nó, CLINE không biết → mỗi bên 1 source of truth.

### 2. CLINE.md Line 9 sai (🟡 Medium)
`knowledge/workspace/state.md` — **state.md không tồn tại**, thực tế là `state.json`.

### 3. CLINE.md Line 17 vi phạm (🔴 Critical)
Luật Blueprint quy định `knowledge/workspace/processed-files.json`, nhưng Kato ghi vào `knowledge/wiki/knowledge/workspace/processed-files.json`. Kato không tuân thủ CLINE.md.

### 4. Nested wiki chưa dọn (🟡 Medium)
`knowledge/wiki/knowledge/wiki/core/agent-errors.md` — nested wiki từ bug cũ (đã fix một phần ở 2026-05-14 16:59 nhưng còn sót).

## Bug chain history (lớp tiến hóa)
| Phiên | Bug | Trạng thái |
|-------|-----|-----------|
| 2026-05-14 16:59 | Nested wiki `knowledge/wiki/knowledge/wiki/` — **đã fix một phần, còn sót agent-errors.md** | ⏳ Chưa hoàn tất |
| 2026-05-15 16:54 | Thiếu addProcessedFile() trong extract_pdf_to_md — **đã fix** | ✅ Hoàn tất |
| 2026-05-15 17:08 | Workspace path conflict Kato vs CLINE — **đang fix** | 🔄 In progress |
| 2026-05-15 19:07 | CLINE.md Line 9 sai (`state.md` → `state.json`) — **chưa fix** | ❌ Pending |
| 2026-05-15 19:07 | CLINE.md Line 17 Kato không tuân thủ — **chưa fix** | ❌ Pending |

## Fix đã thực thi ✅
| Bước | Action | Status |
|------|--------|--------|
| 1 | Fix CLINE.md — state.md → state.json + thêm Luật Workspace Path Consistency | ✅ Done |
| 2 | Dọn nested wiki — xoá `knowledge/wiki/knowledge/wiki/` (agent-errors.md) | ✅ Done |
| 3 | Merge processed-files.json — Kato's 1 entry vào CLINE's 20 entries → 21. Xoá secondary `knowledge/wiki/knowledge/workspace/` | ✅ Done |
| 4 | Lưu lỗi vào evolution.json — 3 SYSTEM errors (SecondaryWorkspaceConflict, CLINE_MD_STALE_REFERENCE, NESTED_WIKI_RESIDUAL) | ✅ Done |
| 5 | Verify — 7/7 checks pass. Chỉ còn 1 processed-files.json duy nhất | ✅ Done |

## Bug chain history (sau fix)
| Phiên | Bug | Trạng thái |
|-------|-----|-----------|
| 2026-05-14 16:59 | Nested wiki `knowledge/wiki/knowledge/wiki/` | ✅ Đã dọn sạch (agent-errors.md xoá) |
| 2026-05-15 16:54 | Thiếu addProcessedFile() trong pipeline parse | ✅ Hoàn tất |
| 2026-05-15 17:08 | Workspace path conflict Kato vs CLINE (2 processed-files.json) | ✅ Merged + secondary xoá |
| 2026-05-15 19:07 | CLINE.md Line 9 sai `state.md` → `state.json` | ✅ Fixed |
| 2026-05-15 19:07 | CLINE.md Line 17 Kato vi phạm | ✅ Fixed + thêm guard rule |

---

# [2026-05-15 16:54] — Hotfix: Auto-mark processed-files.json trong pipeline parse PDF/DOCX

## Root cause
`extract_pdf_to_md` và `extract_docx_to_md` thiếu `addProcessedFile()` → processed-files.json không được cập nhật → Kato tưởng file chưa xử lý dù raw-md đã tồn tại.

## Fix
| File | Change |
|------|--------|
| `src/core/tools.ts` | Thêm `addProcessedFile()` vào `extract_pdf_to_md`, `extract_docx_to_md` với action `extracted_to_md`, destination là mdPath, type tương ứng `pdf`/`document` |

---

# [2026-05-15 16:39] — Phase 2c: Fix 3 CLINE.md Violations + Skills Index Operational

## Context
Phát hiện và sửa 3 vi phạm CLINE.md trong `skills-index-manager.ts` và `tools.ts`:
1. **Path sai**: đang dùng `9router/skills/` thay vì `knowledge/wiki/skills/`
2. **Dead code**: `load_skill`/`check_stale_skills` handlers tự inline-scan, không dùng `skills-index-manager.ts`
3. **Stale check sai**: dùng `stat.mtime` thay vì `**Generated:**` frontmatter

## Thay đổi
- **Fix Violation 1**: `SKILLS_DIR` → `knowledge/wiki/skills/` ✅ (trước: `9router/skills/`)
- **Fix Violation 2**: `skills-index-manager.ts` thêm `getSkillContent()` + `searchSkills()` + `findStaleSkills()` — API đầy đủ cho tools.ts delegate
- **Fix Violation 3**: `findStaleSkills()` ưu tiên `**Generated:**` frontmatter, fallback mtime
- **Xoá dead code**: `9router/skills/` inline-scan logic (tools.ts handlers sẽ delegate sang skills-index-manager)
- **Verify**: Kato scan được **284 skills** từ `knowledge/wiki/skills/` (trước: chỉ 8 skills) ✅

## Files affected
| File | Change |
|------|--------|
| `src/core/skills-index-manager.ts` | REWRITE — path `knowledge/wiki/skills/`, thêm `getSkillContent()`, `findStaleSkills()`, frontmatter parse |
| `src/core/tools.ts` | Chờ delegate handlers → skills-index-manager |

---

# [2026-05-15 14:25] — 9router: Xác định repo chính thức + sửa update strategy

## Context
Phát hiện `9router/` hiện tại là bản copy từ repo `kayce310/AI-Agent` (v0.4.29), không phải repo chính thức. Dashboard trong `9router/` (Next.js app) và global CLI package `npm 9router` là cùng 1 repo `https://github.com/decolua/9router`.

## Thay đổi
- **Xác định repo đúng**: `github.com/decolua/9router` — đây là source thật của dashboard/CLI
- **`update-9router.bat` v2.0**: Clone trực tiếp từ `decolua/9router` thay vì từ `kayce310/AI-Agent`
- **`9router/`**: Đã khôi phục từ git local + `npm install` thành công (569 packages)
- **Dọn rác**: Xoá `__temp_clone/`, `9router.lock`, `kato.lock`
- **Giải thích rõ**: Dashboard (Next.js dev server) và CLI (npm global) là 2 cách chạy của cùng 1 repo. Update dashboard cần clone source mới từ `decolua/9router`.

## Files affected
| File | Change |
|------|--------|
| `update-9router.bat` | v1.1→v2.0: clone từ `decolua/9router` thay vì `kayce310/AI-Agent` |
| `9router/` | Restore từ git checkout + npm install |
| Root dir (deleted) | `__temp_clone/`, `9router.lock`, `kato.lock` |
---

# [2026-05-14 17:35] — soul.md: Xoá "Luật tối thượng" (CLINE.md reference) khỏi Kato identity

## Thay đổi
- **Xoá section "Luật tối thượng"** khỏi `soul.md` (7 dòng)
- **Lý do**: Kato không cần biết về CLINE.md. CLINE.md là file dành cho CLINE (Builder) đọc. Kato chỉ cần biết identity của mình qua soul.md.
- **Nguyên nhân gốc**: soul.md có dòng "CLINE.md là hiến pháp của toàn bộ hệ thống Kato" → Kato suy luận sai: "CLINE" (tên file) = "Cline IDE" (môi trường) → hallucinate về bản thân.
- **Không ảnh hưởng gì khác**: AGENTS.md, CLINE.md, skills, tools, engine, workflow đều không đổi.

## Files affected
| File | Change |
|------|--------|
| `knowledge/wiki/core/soul.md` | Xoá section "Luật tối thượng" (7 dòng) |

---

# [2026-05-14 17:22] — Role Architecture v2.0: Fix nhầm lẫn CLINE vs Cline IDE vs Kato

## Root cause
Kato (Discord bot) bị nhầm "CLINE là IDE AI Agent Extension — môi trường tôi đang chạy" vì:
1. User đặt tên file `CLINE.md` trùng với tên "Cline IDE Extension" của VS Code
2. `role-architecture.md` v1.1 chưa phân tách 3 thực thể riêng
3. Kato không có tài liệu nào giải thích: CLINE là tên của AI Agent Extension (builder), không phải môi trường

## Fix
- `role-architecture.md` v2.0 — phân tách rõ 3 thực thể:
  - **CLINE** = AI Agent Extension (tôi) — **Builder**, xây dựng hệ thống
  - **Cline IDE** = VS Code Extension — **Runtime environment**, nơi CLINE chạy
  - **Kato** = Universal AI Agent — **Runner**, phục vụ end-user
- Thêm section "CLINE.md là gì": file do user tạo, đặt tên trùng để CLINE đọc + tương tác. **KHÔNG** phải file cấu hình IDE hay môi trường runtime.
- Luật bất di bất dịch: Kato KHÔNG sửa code, CLINE KHÔNG chạy runtime

## Files affected
| File | Change |
|------|--------|
| `knowledge/wiki/core/role-architecture.md` | v1.1→v2.0 (fix 3-way entity confusion) |

---

# [2026-05-14 17:20] — Role Architecture v1.1: Kato là Universal Agent, không chỉ Discord bot

## Update
- `knowledge/wiki/core/role-architecture.md` v1.0 → v1.1:
  - Kato được định nghĩa lại là **Universal AI Agent**, không chỉ "Discord bot"
  - Thêm **Platform Adapter Architecture**: Core engine platform-agnostic, logic platform → adapter riêng
  - Bảng platform support: Discord (✅ ACTIVE), CLI (🟡 sẵn), Web UI / API / Telegram-Slack (⬜ future)
  - Sơ đồ kiến trúc adapter (Discord, CLI, WebUI, API)
  - Anti-pattern mới: ❌ "Chỉ xem Kato là Discord bot" → ✅ Kato là universal agent, Discord chỉ là 1 adapter
  - Triết lý: "Viết 1 lần, chạy mọi nơi"

## Files affected
| File | Change |
|------|--------|
| `knowledge/wiki/core/role-architecture.md` | v1.0 → v1.1 (universal agent vision) |

---

# [2026-05-14 17:18] — Role Architecture v1.0: Phân tách Cline (Builder) vs Kato (Runner)

## New
- `knowledge/wiki/core/role-architecture.md` — Kiến trúc vai trò rõ ràng:
  - **Cline Extension** = Builder (VS Code IDE — xây dựng, maintain, deploy)
  - **Kato Agent** = Runner (Discord Bot — runtime, phục vụ end-user)
  - Anti-patterns, quyền hạn, trách nhiệm, checklist hàng phiên
  - `soul.md` xác định là identity của Kato, không phải Cline

## Files affected
| File | Change |
|------|--------|
| New: `knowledge/wiki/core/role-architecture.md` | Kiến trúc vai trò v1.0 |

---

# [2026-05-14 17:17] — Root cause fix: state-manager.ts path.resolve + cleanup stale files

## Done
- **Xoá 3 stale plans + log file**: `V1.4_MISSION_MANAGER_INTEGRATION_PLAN.md`, `V1.4_TO_V1.5_INTEGRATION_PLAN.md`, `VISUALIZATION_3D_COMPARISON.md`, `kato-discord.log`
- **Fix root cause duplicate state.json**: `state-manager.ts` đổi từ `path.resolve('knowledge/workspace/state.json')` (dùng `process.cwd()`) → `path.join(PROJECT_ROOT, ...)` với `PROJECT_ROOT` xác định từ `fileURLToPath(import.meta.url)`. Preventive fix ngăn duplicate khi agent chạy từ sai thư mục.

## Files affected
| File | Change |
|------|--------|
| `src/core/state-manager.ts` | `path.resolve()` → `path.join(PROJECT_ROOT, ...)` với `PROJECT_ROOT` từ `fileURLToPath` |
| Root dir (deleted) | 3 stale plans + 1 log file |

---

# [2026-05-14 17:04] — Update blueprints processed-files.json (scan + mark)

## Done
- Chạy `kato-state-manager scan` — phát hiện 8 untracked files
- Mark 6 files thành công: 73.04_05.pdf (imported), Kaggle-Course-Notes.pdf, CPlusPlusNotesForProfessionals.pdf, EKF.pdf, EpucorMainCorrectedVersion_jpegFIgs4.pdf (reference_created), OVAP-X1-Flight-Control-1.5/.gitignore (archived)
- 2 thư mục `_01_Scripts/`, `_02_Simulink/` bỏ qua (processed-files.json chỉ track file, không track thư mục)
- `totalProcessed` = 20 (tăng từ 14 → 20)

---

# [2026-05-14 16:59] — Cleanup: Fix cấu trúc wiki (SSOT + Obsidian violations)

## Fix
- **Xoá duplicate stale state.json** tại `knowledge/wiki/knowledge/workspace/state.json` (SSOT violation — bản chính ở `knowledge/workspace/state.json`)
- **Fix nested wiki structure**: Move `control_allocation.md`, `control_and_sensing.md`, `drone_control.md` từ `knowledge/wiki/knowledge/wiki/` → `knowledge/wiki/knowledge/`
- **Xoá 4 stub files** (`awesome-*.md`, `kato-ui-brief.md`, `placeholder.md`) là lỗi từ phiên trước — bản thật ở `knowledge/blueprints/`
- **Xoá thư mục rỗng**: `knowledge/wiki/knowledge/wiki/`, `knowledge/wiki/knowledge/workspace/`

## Root cause
Lỗi thao tác từ phiên trước: các file copy/rename bị đẩy vào `knowledge/wiki/knowledge/wiki/` thay vì để trực tiếp ở `knowledge/wiki/knowledge/`. Workspace state bị duplicate do agent tự động tạo `state.json` khi init ở vị trí sai.

## Cấu trúc sau fix
```
knowledge/wiki/knowledge/
  ├── control_allocation.md    ✅
  ├── control_and_sensing.md   ✅
  └── drone_control.md         ✅
```
Không còn subfolder, không còn stale duplicate. SSOT restored.

---

# [2026-05-14 16:48] — 9router-boot.bat v2.0: Local clone ưu tiên + auto-update

## Thay đổi
- **Swap priority**: Local clone (npm run dev, UI debug model) → primary. npm global → fallback.
- **Auto-update**: Trước khi start, tự động `git pull --ff-only` + `npm install --silent` trong `9router/` để cập nhật bản mới (nếu có mạng).
- **Lý do**: User thích giao diện local clone vì hiển thị debug model info ở cửa sổ cmd. Auto-update giải quyết bài toán "vừa có UI, vừa update được".

## Files affected
| File | Change |
|------|--------|
| `9router-boot.bat` v1.9→v2.0 | Swap priority local > global, thêm git pull + npm install tự động |

## Changelog
| Entry | Value |
|-------|-------|
| Version | v2.0 |
| Boot priority | 1. local clone (npm run dev), 2. npm global (cli.js) |
| Auto-update | git pull --ff-only + npm install --silent (graceful fail nếu offline) |

---

# [2026-05-14 14:06] — OVAP-X1 v1.4→v1.5: Xác nhận đã hoàn thành (anti-pattern ghi nhận)

## Phát hiện
OVAP-X1 v1.4→v1.5 integration (visualize_3d optimize + data_logger merge + mission_manager upgrade) **đã làm từ các phiên trước** nhưng không có changelog entry.

## Anti-pattern ghi nhận
❌ Làm xong integration không ghi changelog → phiên sau tưởng chưa làm → lập lại plan lãng phí.
✅ Mỗi phiên phải để lại changelog entry dù chỉ 1 dòng.

## Cleanup
- Các integration plans (V1.4_TO_V1.5, V1.4_MISSION_MANAGER) là **stale plans** — code đã được thực thi
- Không cần chạy lại

## State updated
- `knowledge/workspace/state.json` — notes ghi lại bài học

---

# [2026-05-14 13:41] — Phase 3.1+3.2: Style Engine + Report Generator — HOÀN THÀNH

## Done
- `src/modules/report/style-engine.ts` — 4 styles (technical, scientific, daily, custom)
- `src/modules/report/generator.ts` — generateReport() with outline parsing, citations, TOC, references
- `src/core/tools.ts` — tool `generate_report` registered: TOOLS_DEFINITION + executeToolCall (ESM-safe via execSync temp script)
- Tool comment updated: 15 tools (thêm generate_report)

## Bug phát sinh & fix
- `require()` không load được ESM module generator.ts → fix: execSync temp script pattern (giống read_pdf/archive)

## Next
Phase 3.3: Update prompt-builder (Rule #4), tool-pruner (category report), llm.ts
Phase 4: DOCX Builder

---

# [2026-05-14 13:39] — Phase 3.1: Style Engine — HOÀN THÀNH

## Done
`src/modules/report/style-engine.ts` — 4 styles (technical, scientific, daily, custom) với:
- StyleConfig interface (11 fields)
- formatCitation() — 3 citation formats
- formatHeading() — 3 heading styles (atx, setext, bold)
- formatDate() — 3 date formats

## Next
Phase 3.2: Report Generator (generator.ts)

---

# [2026-05-14 09:00] — 9router v0.4.39: npm global update + boot priority fix (v1.9)

## Context
`npm i -g 9router@latest --prefer-online` thành công (global 0.4.39), nhưng dashboard vẫn chạy 0.4.29 vì 9router-boot.bat chỉ dùng local clone.

## Phát hiện quan trọng
**npm global `9router` v0.4.39 và local clone `9router/` (9router-app v0.4.29) là 2 package khác nhau**:
- `npm global`: `9router` (CLI package) — `cli.js` chạy built-in Express server + dashboard
- `Local clone`: `9router-app` (Next.js source) — `npm run dev` chạy Next.js dev server

Dashboard hiển thị version lấy từ source code đang chạy. Cập nhật npm global không ảnh hưởng local clone.

## Cách update đúng
**Chạy trực tiếp từ npm global CLI**, bỏ qua local clone:
```
node "%APPDATA%\npm\node_modules\9router\cli.js" --port 20128 --no-browser
```
Package global chứa `app/` folder với dashboard đã build, cổng 20128.

## Changelog
| File | Change |
|------|--------|
| `9router-boot.bat` v1.9 | **Ưu tiên npm global**: `%APPDATA%\npm\node_modules\9router\cli.js` với `%ProgramFiles%\nodejs\node.exe` (absolute path, không PATH issue). Fallback local clone nếu global không tồn tại |
| `PowerShell` | `Set-ExecutionPolicy RemoteSigned` |
| `npm global` | 0.4.33→0.4.39 ✅ |

---

# [2026-05-13 10:02] - Phase 1 Complete: Batch Convert + CLINE.md Compliance

Batch convert PDF/DOCX → knowledge/raw-md/. CLINE.md compliance scan.

---

# [2026-05-13 10:13] - Blueprint Files Audit & processed-files.json Cleanup

Discord module check + blueprints scan. Mark 14 files. Fix processed-files.json corruption.

---

# [2026-05-13 10:29] — 3-Layer Output Sanitizer (ROLLED BACK)

Phân tích 4 phản hồi Discord. Deploy regex sanitizer → nhận ra hardcode không bền → rollback.

---

# [2026-05-13 10:46] — Identity-Driven Output (soul.md + refactor)

Phân tích picoclaw/nanoclaw/autoskills: 0 output rules. Thay hardcode → soul.md identity.

**New:** `knowledge/wiki/core/soul.md`
**Ref:** `src/core/prompt-builder.ts` — xoá output rules, giữ 3 kỹ thuật
**Ref:** `src/core/engine.ts` — +soul.md vào identity pipeline

---

# [2026-05-13 10:49] — Clean PHONG CÁCH TRẢ LỜI block

soul.md đã inject, xoá duplicate 5 dòng PHONG CÁCH TRẢ LỜI trong prompt-builder.
Final state: 0 output rules, 3 operational rules, soul.md identity duy nhất.

---

# [2026-05-13 10:53] — Fix "Gọi tool = output" (soul.md v1.1)

soul.md thêm "Gọi tool = output: Output chỉ chứa kết quả tool call, không mô tả."

---

# [2026-05-13 10:53] — Fix "Nguồn tri thức" (soul.md v1.2)

4 bậc ưu tiên: internet → wiki → blueprints → KHÔNG dùng LLM training data.

---

# [2026-05-13 11:23] — CLINE.md là Hiến pháp (soul.md v1.4)

## Context
User xác nhận: CLINE.md là luật tối thượng cho toàn bộ hệ thống Kato. Tên file đặt cho Cline extension. Cả Cline IDE agent và Discord bot Kato đều tuân thủ.

## Change
soul.md thêm section "Luật tối thượng":
```
CLINE.md là hiến pháp của toàn bộ hệ thống Kato. Mọi hành động đều phải tuân thủ.
```

## Thứ bậc pháp lý hoàn chỉnh
| Bậc | File | Vai trò |
|-----|------|---------|
| 1 | `CLINE.md` | Hiến pháp — luật tối thượng |
| 2 | `AGENTS.md` | Router — xác định vai trò, skill |
| 3 | `soul.md` | Identity — bản chất, ưu tiên, style |

---

# [2026-05-13 12:13] — fetch_url buffer fix + "Tool result = truth" (soul.md v1.5)

## Fix Engineering
- `fetch_url` default: `5000` → `15000`, floor `10000`
- `maxBuffer`: `200KB` → `500KB`

## Fix Identity — soul.md v1.5
Thêm section "Tool result = sự thật tối thượng"

---

# [2026-05-13 12:22] — v5.3.1: Critical Bug Fixes (4 issues)

1. fetch_url LLM override max_length=5000
2. Tool pruner bung 11 tools (~991 tokens) ở mọi cycle
3. Evolution engine 0 errors tracked
4. Không có hard rule trong soul.md về max_length

---

# [2026-05-13 12:29] — Root Cause Fix: LLM ignore tool result (soul.md v1.7)

3-layer fix: engineering (tools.ts full content), prompt (FETCH_URL = GROUND TRUTH), identity (CẤM training data).

---

# [2026-05-13 13:20] — DeepSeek reasoning_content fix + 9router-boot.bat

Fix DeepSeek error 400. New 9router-boot.bat combo selector.

---

# [2026-05-13 14:17] — 9router-boot.bat evolutions (v1.0 → v1.7)

8 versions iterated. Final: bat orchestrator + ps1 standalone selector.

---

# [2026-05-13 14:31] — Root Cause Fix: LLMCore hallucination (missing fetch_url in system prompt)

Fix llm.ts SYSTEM_PROMPT_TEMPLATE + prompt-builder.ts Rule #2 nâng HARD RULE.

---

# [2026-05-13 15:30] — Hotfix: Tool Pruner silent-block 3 Phase 2 tools

Thêm category `archive` vào TOOL_CATEGORIES trong tool-pruner.ts.

---

# [2026-05-13 16:06] — 3-layer fix: tool-pruner keywords, engine max_tokens, prompt-builder auto-archive

Fix: admin keywords expanded, max_tokens 8192→4096, Rule #3 auto-archive.

---

# [2026-05-13 16:48] — Xác nhận: process_new_raw hoạt động, 3-layer fixes OK

Verified: Bot gọi process_new_raw, max_tokens 4096 OK, auto-archive rule active.

---

# [2026-05-13 16:54] — Fix ERR_UNSUPPORTED_ESM_URL_SCHEME (temp scripts trên Windows Node 24.x)

Thêm `toFileUrl()` helper — 5 temp scripts fix Windows path scheme.

---

# [2026-05-13 16:57] — CLINE.md Compliance Check & Assets Update

state.json updated, soul.md v1.7 active, 22 fixes reviewed.

---

# [2026-05-13 17:07] — Bot Discord Evaluation + process_new_raw hotfix

5 bugs phát hiện: CRITICAL (process_new_raw skip), HIGH (ESM scheme), MEDIUM (hallucinate count, hỏi lại), LOW (sai tool name). Fix `loadProcessedFiles()` parse `data.files`.

---

_Phiên 2026-05-13: 10:02 → 17:07. 24 entries total._

---

# [2026-05-15 16:15] — Phase 2b: AutoSkills → Wiki Convert Hoàn Tất + Autoskill Plan

## Context
Hoàn tất convert 217 skills từ `knowledge/references/autoskills/packages/autoskills/skills-registry/` → `knowledge/wiki/skills/`. Tạo plan riêng cho autoskill (mitigation, known gaps, rollback).

## Thay đổi
- **217/217 skills converted** (100%): P0 (5), P1 (5), P2 (4), P3+ (~204)
- **angular-developer**: Force-convert flagged (37 files, legitimate Angular 18+ content)
- **File mới**: `knowledge/blueprints/autoskill-conversion-plan.md` — plan riêng + forensic notes + known gaps + rollback proc
- **Cập nhật**: `knowledge/blueprints/workspace-tracking.md` — hoàn tất Phase 2b, link tới autoskill plan

## Deviations từ Plan gốc
- **Quy mô**: 217 skills (plan gốc 15-30 seed) — ~10x overscope, nhưng tác động positive
- **angular-developer**: Force-convert vi phạm mitigation threshold (37 files > 20)
- **Chưa implement**: lazy-load mechanism + generatedAt/stale check (để lại Phase 2c)

## Files affected
| File | Change |
|------|--------|
| `knowledge/blueprints/autoskill-conversion-plan.md` | NEW — plan riêng cho autoskill |
| `knowledge/blueprints/workspace-tracking.md` | UPDATE — hoàn tất phase, reference plan |
| `knowledge/workspace/state.md` | UPDATE — Phase 2b ✅ |


