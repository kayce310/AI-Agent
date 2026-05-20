# 📊 BÁO CÁO ĐỐI CHIẾU KIẾN TRÚC QUẢN TRỊ KATO V5.3

> Generated: 2026-05-20T08:21:00Z
> Baseline: current-architecture-snapshot.md
> External Review: Hội đồng Chuyên Gia Kiến trúc Cấp Cao
> Classification: TỐI MẬT — Chỉ Tech Lead

---

## 1. Phân tích Hiện trạng & Entropy Thực địa

### 1.1 Tình trạng Registry & Dependency

**Luận điểm Hội đồng:** *"Module Discord bị hỏng đường dẫn khi di chuyển file"*

**Thực địa từ code:**

File `src/modules/discord/index.ts` dòng 13-14:
```typescript
import Engine from '../../core/engine/engine.js';
import { EngineRequest } from '../../core/types.js';
```

Đây là **relative path cứng** — ràng buộc vật lý giữa module và core. Nếu bất kỳ file nào trong chuỗi bị di chuyển, import break.

**Nguyên nhân gốc:**

1. **Không có barrel export từ core.** File `src/core/index.ts` export `Engine` nhưng dùng path `../engine/engine.js` — Discord import trực tiếp từ `../../core/engine/engine.js` thay vì qua barrel. Nếu Discord dùng `import { Engine } from '../../core'`, di chuyển engine/ sang core/engine/ sẽ không ảnh hưởng.

2. **Không có dependency header.** Không file nào trong codebase chứa comment `@depends-on` hay `@layer` để cảnh báo AI khi sửa sẽ ảnh hưởng gì.

3. **Không có validation script.** Trong 11 file scripts/, **0 file** check import paths hay cross-layer violations. Chỉ có:
   - `checkpoint-emergency.mjs` — git commit khi overflow
   - `convert-autoskill.mts` — convert skills
   - `extract-full-pdf.mjs` — PDF extraction
   - `test-engine-cli.ts` — test engine
   - **KHÔNG CÓ** `validate-structure.ts` hay tương đương

**Kết luận:** Discord không "hỏng" — nó chưa bao giờ có cơ chế chống hỏng. Relative path + không barrel + không validation = **fragile by design**.

---

### 1.2 Tình trạng Kho Di sản Skills (Autoskill)

**Luận điểm Hội đồng:** *"Kato bị mù thông tin về kho skill đang có"*

**Thực địa từ code:**

Kho skill hiện tại chia **2 hệ thống song song** không liên kết:

| Hệ thống | Vị trí | Số lượng | Format | Quản lý bởi |
|----------|--------|----------|--------|-------------|
| **Wiki Skills** | `knowledge/wiki/skills/` | ~170 files .md | Markdown + wiki-links | `_INDEX.md` |
| **9router Skills** | `9router/skills/` | 25 directories | `.kto.md` proprietary | `skills.ts` tool plugin |

**Lỗ hổng "mù thông tin":**

1. **Tool `load_skill` (src/core/tools/skills.ts dòng 26) chỉ đọc từ `9router/skills/`:**
```typescript
const skillPath = path.join(BASE_PATH, '9router/skills', slug, `${slug}.kto.md`);
```
Tool này **không biết** `knowledge/wiki/skills/` tồn tại. 170 wiki skills = vô hình với tool.

2. **Tool `check_stale_skills` (skills.ts dòng 50) cũng chỉ scan `9router/skills/`:**
```typescript
const skillsDir = path.join(BASE_PATH, '9router/skills');
```
25 9router skills được track stale. 170 wiki skills = **không được track**.

3. **`knowledge/wiki/skills/_INDEX.md`** có 217 entries nhưng chỉ là markdown catalog — không có `generatedAt`, không có `loadMode`, không có `staleCheck`. Ghi chú trong `autoskill-conversion-plan.md`:
   > "No lazy-load mechanism, No generatedAt/stale check, No dependency graph"

4. **Janitor (src/core/agents/janitor.ts)** — theo audit-findings-sprintA.md — **UNUSED**. Không import ở đâu. Không wired vào hook. Dù Janitor có khả năng scan PII và chạy tests, nó là **code chết**.

**Kết luận:** Kato không "mù" — Kato có **2 mắt nhưng chỉ dùng 1 mắt**. 9router skills được tool quản lý. Wiki skills chỉ là document tĩnh, không có runtime integration.

---

### 1.3 Tình trạng Cưỡng chế (Enforcement)

**Luận điểm Hội đồng:** *"Không có script chạy tự động để chặn đứng AI làm sai kiến trúc"*

**Thực địa từ code:**

| Cơ chế | Tồn tại? | Vị trí | Hiệu lực |
|--------|----------|--------|----------|
| **SAFE_PATHS** | ✅ | `tool-registry.ts` dòng 46-54 | Chỉ tool execution, không chặn tạo file |
| **InputGuard** | ✅ | `src/core/security/input-guard.ts` | Chỉ sanitize input |
| **OutputGuard** | ✅ | `src/core/security/output-guard.ts` | Chỉ sanitize output |
| **PrivilegeGuard** | ✅ | `src/core/security/privilege-guard.ts` | Chỉ RBAC |
| **RateLimiter** | ✅ | `src/core/security/rate-limiter.ts` | Chỉ rate limit |
| **SecurityScanner** | ✅ | `src/core/security/security-scanner.ts` | Chỉ scan content |
| **validate-structure.ts** | ❌ | **KHÔNG TỒN TẠI** | — |
| **pre-commit hook** | ❌ | **KHÔNG TỒN TẠI** | — |
| **@depends-on header check** | ❌ | **KHÔNG TỒN TẠI** | — |
| **folder ownership enforcement** | ❌ | **KHÔNG TỒN TẠI** | — |

**Phân tích SAFE_PATHS:**

```typescript
const SAFE_PATHS = [
  path.resolve(BASE_PATH),
  path.resolve(BASE_PATH, 'src'),
  path.resolve(BASE_PATH, 'knowledge'),
  path.resolve(BASE_PATH, 'config'),
  path.resolve(BASE_PATH, 'scripts'),
  path.resolve(BASE_PATH, 'docker'),
  path.resolve(BASE_PATH, '9router'),
];
```

SAFE_PATHS check `resolved.startsWith(safe)` — nhưng `BASE_PATH` (root repo) nằm trong danh sách. Điều này có nghĩa **mọi path đều safe** vì mọi path đều start từ root. Cơ chế nàu **vô hiệu** trong thực tế.

**Kết luận:** Security layer tồn tại nhưng chỉ bảo vệ **data flow** (input/output/tool execution). Không có gì bảo vệ **structural integrity** (folder structure, import paths, layer boundaries). AI có thể tạo file sai chỗ, import xuyên layer, xóa module — và không có script nào reject.

---

## 2. Đề xuất Thiết kế Kỹ thuật

### Lớp 1: Structure Map (~30 dòng, nhét cứng vào CLINE.md)

```markdown
## 🗺️ STRUCTURE MAP (Hardcoded — DO NOT MODIFY without Tech Lead approval)

### Folder Ownership
| Folder | Contains | Code Type | Import Rules |
|--------|----------|-----------|--------------|
| `src/core/` | Engine, agents, LLM, memory, security, tools, patterns | TS — Internal only | ❌ No import from modules/ |
| `src/modules/` | Discord, document, knowledge, report | TS — Peripheral | ✅ Import from core/ only |
| `src/scripts/` | Utility scripts | TS/JS — Standalone | ❌ No import from core/ |
| `knowledge/wiki/` | Architecture, skills, repos, troubleshooting | MD — Read-only | ❌ No code execution |
| `knowledge/blueprints/` | Raw assets, backups, queue | Mixed — Read-only | ❌ No code execution |
| `knowledge/workspace/` | State, checkpoint, evolution | JSON/MD — Runtime | ❌ No import by code |
| `9router/` | Router config, skills | JSON/KTO — External | ❌ No import by src/ |
| `tests/` | Test files | TS — Mirror src/ structure | ✅ Import from src/ only |

### Import Rules
1. modules/ → core/: ✅ ALLOWED
2. core/ → modules/: ❌ FORBIDDEN
3. scripts/ → core/: ❌ FORBIDDEN
4. core/ → core/: ✅ ALLOWED (same layer)
5. Any code → knowledge/: ❌ FORBIDDEN (read-only)

### Enforcement
- Violation = REJECT file creation / import
- Report to Tech Lead for exception
```

**Lý đặt ở CLINE.md:** CLINE.md là file **đầu tiên** AI đọc khi khởi động (dòng 7-8). Nếu Structure Map nằm ở file khác, AI sẽ quên khi token tăng. Hardcode vào CLINE.md = **always in context**.

---

### Lớp 2: Living Manifest (Template cho `knowledge/system-state.md`)

```markdown
# 🧬 System State — Living Manifest

> Auto-generated: {{TIMESTAMP}}
> Session: {{SESSION_ID}}

## Module Status

| Module | Path | Status | Last Verified | Notes |
|--------|------|--------|---------------|-------|
| DiscordBridge | src/modules/discord/index.ts | 🔴 BROKEN | 2026-05-20 | Import path fragile, no barrel |
| DocumentParser | src/modules/document/ | 🟡 UNKNOWN | — | Not tested |
| KnowledgeArchiver | src/modules/knowledge/ | 🟡 UNKNOWN | — | Not tested |
| ReportGenerator | src/modules/report/ | 🟡 UNKNOWN | — | Not tested |

## Core Components

| Component | Path | Status | Wired? | Tests? |
|-----------|------|--------|--------|--------|
| Engine | src/core/engine/engine.ts | 🟢 ACTIVE | ✅ | ❌ |
| ToolRegistry | src/core/tools/tool-registry.ts | 🟢 ACTIVE | ✅ | ❌ |
| Janitor | src/core/agents/janitor.ts | 🔴 DEAD | ❌ | ❌ |
| CodeParser | src/core/agents/code-parser.ts | 🟡 EXISTS | ❌ | ❌ |
| RateLimiter | src/core/security/rate-limiter.ts | 🟢 ACTIVE | ✅ | ❌ |

## Skills Inventory

| System | Location | Count | Stale Check | Tool Integrated |
|--------|----------|-------|-------------|-----------------|
| Wiki Skills | knowledge/wiki/skills/ | 170 | ❌ | ❌ |
| 9router Skills | 9router/skills/ | 25 | ✅ | ✅ |

## Governance Gaps

| Gap | Severity | Target Fix |
|-----|----------|------------|
| No folder ownership enforcement | HIGH | validate-structure.ts |
| No dependency headers | MEDIUM | @depends-on standard |
| No barrel exports for modules | MEDIUM | core/index.ts expansion |
| Janitor dead code | LOW | Wire or remove |
| SAFE_PATHS ineffective | HIGH | Fix root path inclusion |

## Last Updated
- By: {{AGENT}}
- Session: {{SESSION_ID}}
- Checkpoint: {{CHECKPOINT_ID}}
```

**Cơ cấu cập nhật:** Sau mỗi session, AI phải update file này thông qua `kato-state-manager`. File này là **single source of truth** cho trạng thái thực tế — khác với `state.json` (chỉ có metadata), khác với `checkpoint.json` (chỉ có progress).

---

### Lớp 3: Dependency Header (Quy chuẩn `@depends-on`)

Mỗi file TS/JS trong `src/` phải có header:

```typescript
/**
 * @file Brief description
 * @layer core|modules|scripts
 * @depends-on path/to/dep1.ts, path/to/dep2.ts
 * @imported-by path/to/consumer1.ts, path/to/consumer2.ts
 * @owner module-name
 * @stale-check 90d
 */
```

**Ví dụ cho DiscordBridge:**

```typescript
/**
 * @file Kato Discord Bridge — Message adapter
 * @layer modules
 * @depends-on src/core/engine/engine.ts, src/core/types.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner discord-module
 */
```

**Mục đích:**
- Khi AI muốn di chuyển/sửa file, đọc `@imported-by` → biết cái gì sẽ break
- Khi AI muốn xóa dependency, đọc `@depends-on` → biết cần update những gì
- Validation script có thể parse headers để build dependency graph

---

### Lớp 4: Validation Engine (Logic cho `validate-structure.ts`)

Script `scripts/validate-structure.ts` sẽ check **4 quy tắc thép:**

```typescript
// Rule 1: Folder Ownership
// - Files in src/core/ must NOT import from src/modules/
// - Files in src/modules/ must NOT import from other modules
// - Files in src/scripts/ must NOT import from src/core/
// - Files in knowledge/ must NOT contain executable code

// Rule 2: Import Path Integrity
// - All imports must resolve to existing files
// - No relative paths crossing layer boundaries (../../core from modules is OK, reverse is NOT)
// - Barrel imports preferred over deep relative paths

// Rule 3: Dependency Header Presence
// - All .ts/.js files in src/ must have @depends-on header
// - @depends-on paths must resolve
// - @imported-by paths must resolve (warn if stale)

// Rule 4: Dead Code Detection
// - Files exported from index.ts but never imported elsewhere = potential dead code
// - Files with 0 imports from other src/ files = potential orphan
// - Flag for Tech Lead review
```

**Output format:**
```
🔍 Structure Validation Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Folder Ownership: 0 violations
❌ Import Paths: 3 violations
   - src/modules/discord/index.ts:13 → ../../core/engine/engine.js (use barrel)
   - src/core/tools/skills.ts:26 → hardcoded 9router path (not configurable)
   - src/core/index.ts:8 → ../engine (should be ./engine)
⚠️ Dependency Headers: 65 files missing @depends-on
❌ Dead Code: 1 file
   - src/core/agents/janitor.ts (exported but never imported)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Result: 4 FAIL, 1 WARN — REJECT commit
```

**Integration:**
- Chạy trước mỗi `git commit` (pre-commit hook)
- Chạy trong `checkpoint-emergency.mjs` trước khi save
- Chạy khi AI tạo/sửa file trong `src/`

---

## Kết Luận Đối Chiếu

| Luận điểm Hội đồng | Verdict | Evidence |
|---------------------|---------|----------|
| "Mất trí nhúc cấu trúc giữa các phiên" | **XÁC NHẬN** | CLINE.md không có Structure Map. AI phải đọc AGENTS.md + index.md + snapshot.md để biết cấu trúc — khi token đầy, những file này bị evict. |
| "Module Discord bị hỏng" | **XÁC NHẬN** | Relative path cứng, không barrel, không dependency header. Di chuyển engine.ts = break. |
| "Kho autoskill bị lãng quên" | **XÁC NHẬN** | 2 hệ thống song song (wiki + 9router). Tool chỉ biết 9router. Wiki skills = document tĩnh, không runtime. |
| "Thiếu Living Manifest" | **XÁC NHẬN** | `state.json` chỉ có metadata + priorities. Không có module status, không có component health, không có dead code tracking. |
| "Thiếu cưỡng chế" | **XÁC NHẬN** | Security layer chỉ bảo vệ data flow. SAFE_PATHS vô hiệu (root trong danh sách). 0 validation scripts. 0 pre-commit hooks. |

---

Báo cáo kiểm toán hoàn tất. Hệ thống hiện trạng đang **Lỏng lẻo**, đề xuất kích hoạt Chiến dịch Đổ bê tông Kiến trúc Quản trị.
