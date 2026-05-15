# AutoSkill Conversion Plan & Architecture

> **Mục đích**: Plan riêng cho quá trình AutoSkills → Wiki Convert (Phase 2b).
> **Last updated**: 2026-05-15
> **Trạng thái**: ✅ Hoàn tất Phase 2b. Mở rộng cho Phase 2c.

---

## 1. Tổng Quan

### Nguồn
- **217 skills** từ `knowledge/references/autoskills/packages/autoskills/skills-registry/`
- Index: `skills-registry/index.json` (~1020 KB, 217 entries)
- Mỗi skill: `SKILL.md` + references (từ 1-50 files)

### Đích
- `knowledge/wiki/skills/{skill-name}/` format Kato wiki
- `knowledge/wiki/skills/_INDEX.md` — central navigation index

### Tool
- `scripts/convert-autoskill.mts` — converter engine

---

## 2. Priority Map & Execution Log

| Level | Planned | Actual | Notes |
|-------|---------|--------|-------|
| **P0** | 5 skills | 5/5 ✅ | shadcn, next-best-practices, accessibility, agents-sdk, typescript-advanced-types |
| **P1** | 5 skills | 5/5 ✅ | tailwind-css-patterns, react-best-practices, nodejs-best-practices, vitest, vue-best-practices |
| **P2** | 4 skills | 4/4 ✅ | astro, angular-developer (🔓 force-convert flagged), svelte5-best-practices, turborepo |
| **P3+** | ~204 skills | 204/204 ✅ | Batch --all --force |

### angular-developer flagged — Forensic Notes
- **Flag reason**: 37 files (SKILL.md + 36 references) — vượt threshold an toàn
- **Force-convert rationale**: Nội dung legitimate (Angular 18+ official patterns), không có mã độc
- **Impact**: ✅ Positive — thêm comprehensive Angular knowledge base
- **Mitigation**: Nên có lazy-load mechanism cho skills > 20 files (xem Phase 2c)

---

## 3. Architecture Decisions

### 3.1 Conversion Model
```
index.json → convert-autoskill.mts → /knowledge/wiki/skills/{name}/_INDEX.md + SKILL.md + refs
                                       ↓
                                  /knowledge/wiki/skills/_INDEX.md (append entry)
```

### 3.2 File Structure Per Skill
```
knowledge/wiki/skills/{name}/
├── _INDEX.md              ← Metadata + toc (generated)
├── SKILL.md               ← Main content (from registry)
└── references/            ← Reference files (from registry)
    └── *.md
```

### 3.3 File Thresholds
- **Small** (< 10 files): Direct convert an toàn
- **Medium** (10-20 files): Cần rate-limit
- **Large** (> 20 files): Cần force flag + review

---

## 4. Known Gaps (Phase 2c Targets)

| Gap | Priority | Impact | Proposed Fix |
|-----|----------|--------|--------------|
| **No lazy-load mechanism** | MEDIUM | Skills > 20 files gây token bloat nếu load đồng loạt | Trigger-bound loading: chỉ load SKILL.md, delay load references theo nhu cầu |
| **No generatedAt/stale check** | LOW | Không biết skill cũ hay mới | Add `generatedAt` field + cron check stale (90 days) |
| **No size-based trigger** | LOW | Không phân biệt small/medium/large | Add `loadMode: "eager" | "lazy" | "on-demand"` trong metadata |
| **No dependency graph** | LOW | Không biết skill nào liên quan nhau | Add `related: string[]` field |

---

## 5. Future Roadmap (Phase 2c → 3)

```
Phase 2b (DONE) → Phase 2c (NEXT) → Phase 3 (Agent System)
```

### Phase 2c Tasks
1. **md-archiver** + `search_archived_md` tool ✅ (Phase 2a)
2. **Formula Extractor** (`formula-extractor.ts`) ✅
3. **Lazy-load mechanism** cho large skills ✅
4. **Stale date tracking** cho skills ✅
5. **Fix 3 CLINE.md violations** ✅ — path `knowledge/wiki/skills/`, `getSkillContent()`, `**Generated:**` frontmatter

### Dependency
```
Phase 2c → Phase 3 (Agent cần search_archived_md + formula)
```

---

## 6. Verification Metrics

| Metric | Value | Method |
|--------|-------|--------|
| Total skills converted | 217/217 (100%) | `Get-ChildItem "knowledge/wiki/skiles/" -Directory \| Measure-Object` |
| Total files created | ~3,200+ | `Get-ChildItem "knowledge/wiki/skills/" -Recurse -File \| Measure-Object` |
| INDEX entries | 217 | `Select-String -Path "_INDEX.md" -Pattern "^- \["` |
| Failed conversions | 0 | Zero errors in batch output |
| Force-converted | 1 (angular-developer) | Flagged in index.json |

---

## 7. Rollback Procedure (nếu cần)

```powershell
# Xóa toàn bộ skills (nếu cần reset)
Remove-Item -Path "knowledge/wiki/skills/" -Recurse -Force
# Re-run với filtered list
node scripts/convert-autoskill.mts --accessibility --shadcn --next-best-practices