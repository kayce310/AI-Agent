# 🧬 System State — Living Manifest

> Auto-generated: 2026-05-20T13:05:00Z
> Session: session-2026-05-20T13-05-00-000Z
> Agent: Kato v5.3
> Checkpoint: operation-liposuction

---

## Bảng 1: Module Status Matrix

| Module | Path | Status | Last Verified | Technical Debt |
|--------|------|--------|---------------|----------------|
| Engine | `src/core/engine/engine.ts` | 🟢 ACTIVE | 2026-05-20 | No tests; barrel import missing for modules |
| Orchestrator | `src/core/engine/orchestrator.ts` | 🟢 ACTIVE | 2026-05-20 | No tests |
| Agent | `src/core/engine/agent.ts` | 🟢 ACTIVE | 2026-05-20 | No tests |
| ToolRegistry | `src/core/tools/tool-registry.ts` | 🟢 ACTIVE | 2026-05-20 | SAFE_PATHS fixed (root removed, tests added) |
| Security (all) | `src/core/security/*.ts` | 🟢 ACTIVE | 2026-05-20 | 6 files, 0 tests, no integration tests |
| Memory (all) | `src/core/memory/*.ts` | 🟢 ACTIVE | 2026-05-20 | 7 files, 0 tests |
| Patterns (all) | `src/core/patterns/*.ts` | 🟢 ACTIVE | 2026-05-20 | 20 files, 0 tests |
| Hooks | `src/core/hooks.ts` | 🟢 ACTIVE | 2026-05-20 | No tests |
| Evolution | `src/core/evolution.ts` | 🟡 UNKNOWN | — | Not verified in current session |
| **DiscordBridge** | `src/modules/discord/index.ts` | 🟡 FIXED | 2026-05-20 | @depends-on header added; still uses deep relative path (barrel exists now) |
| DocumentParser | `src/modules/document/*.ts` | 🟡 UNKNOWN | — | 5 files, not tested |
| KnowledgeArchiver | `src/modules/knowledge/md-archiver.ts` | 🟡 UNKNOWN | — | Single file, not tested |
| ReportGenerator | `src/modules/report/*.ts` | 🟡 UNKNOWN | — | 2 files, not tested |
| Modules Barrel | `src/modules/index.ts` | 🟢 NEW | 2026-05-20 | Created Phase 2 — barrel export for all modules |
| **Janitor** | `src/core/agents/janitor.ts` | 🔴 DEAD | 2026-05-20 | Exported from index.ts but NEVER imported; 0 wiring |
| CodeParser | `src/core/agents/code-parser.ts` | 🟡 EXISTS | 2026-05-20 | No tests; not wired into engine |
| RateLimiter | `src/core/security/rate-limiter.ts` | 🟢 ACTIVE | 2026-05-20 | Wired in Engine; no tests |
| SkillsIndexManager | `src/core/agents/skills-index-manager.ts` | 🟡 UNKNOWN | — | Not verified |
| PromptBuilder | `src/core/llm/prompt-builder.ts` | 🟡 UNKNOWN | — | Not verified |
| ProviderRegistry | `src/core/llm/provider-registry.ts` | 🟡 UNKNOWN | — | Not verified |
| LLM | `src/core/llm/llm.ts` | 🟡 UNKNOWN | — | Not verified |
| GNAP | `src/core/gnap/*.ts` | 🟡 UNKNOWN | — | 2 files, not verified |
| MCP | `src/core/mcp/*.ts` | 🟡 UNKNOWN | — | 2 files, not verified |
| SOP Engine | `src/core/sop/*.ts` | 🟡 UNKNOWN | — | 4 files, not verified |
| Observability | `src/core/observability/*.ts` | 🟡 UNKNOWN | — | 5 files, not verified |

**Summary:** 🟢 9 ACTIVE | 🟡 14 UNKNOWN/FIXED | 🔴 1 DEAD

---

## Bảng 2: Skills Inventory

| System | Location | Count | Format | Tool Integrated | Stale Check | Notes |
|--------|----------|-------|--------|-----------------|-------------|-------|
| **Wiki Skills** | `knowledge/wiki/skills/` | ~170 files .md | Markdown + wiki-links | ❌ No | ❌ No | Converted from autoskill Phase 2b; `_INDEX.md` exists but no runtime integration |
| **Wiki Skill Dirs** | `knowledge/wiki/skills/` | 25 directories | Subdirs with refs | ❌ No | ❌ No | Only 25 of 170 have subdirectories (converted with references) |
| **9router Skills** | `9router/skills/` | 9 directories | `.kto.md` proprietary | ✅ Yes (`load_skill` tool) | ✅ Yes (`check_stale_skills` tool) | Integrated via `src/core/tools/skills.ts` |
| **Core Platform Skills** | `knowledge/wiki/skills/` | 12 files | Markdown | ❌ No | ❌ No | Kato-specific: coding-standards, verification-protocol, state-management, etc. |

**Fragmentation Issue:**
- `load_skill` tool (skills.ts dòng 26) hardcodes path to `9router/skills/` — **cannot see wiki skills**
- `check_stale_skills` tool (skills.ts dòng 50) also only scans `9router/skills/`
- 170 wiki skills = **invisible to runtime tools**
- 9 9router skills = fully integrated

---

## Bảng 3: Known Governance Gaps

| # | Gap | Severity | Target Fix | Phase |
|---|-----|----------|------------|-------|
| G1 | **Structure Map missing from CLINE.md** | HIGH | Hardcode ~30 dòng map → CLINE.md | ✅ DONE Phase 1 |
| G2 | **No Living Manifest** | HIGH | Create `knowledge/system-state.md` | ✅ DONE Phase 1 |
| G3 | **SAFE_PATHS ineffective** | HIGH | Remove root repo from safe list | ✅ DONE Phase 1 |
| G4 | **DiscordBridge broken import path** | HIGH | Use barrel import; @depends-on header added | 🟡 PARTIAL Phase 2 |
| G5 | **Janitor dead code** | MEDIUM | Wire into HookRegistry OR remove from index.ts | ⏳ Phase 3+ |
| G6 | **Skills fragmentation (wiki vs 9router)** | MEDIUM | Unify under single system OR bridge `load_skill` to wiki | ⏳ Phase 3+ |
| G7 | **No dependency headers (@depends-on)** | MEDIUM | Add header standard to all src/ files | 🟡 PARTIAL Phase 2 (DiscordBridge done) |
| G8 | **No validation script** | HIGH | Create `scripts/validate-structure.ts` | ✅ DONE Phase 2 |
| G9 | **No pre-commit hooks** | MEDIUM | Add .husky/pre-commit + CI workflow | ✅ DONE Phase 3 |
| G10 | **No barrel exports for modules** | MEDIUM | Create `src/modules/index.ts` barrel | ✅ DONE Phase 2 |
| G11 | **CodeParser not wired** | LOW | Integrate into engine or document as standalone | ⏳ Phase 3+ |
| G12 | **0 test coverage for core** | HIGH | Add tests for Engine, ToolRegistry, Security | ⏳ Phase 3+ |
| G13 | **No validate script in CLINE.md law** | MEDIUM | Add luật chạy validate trước mỗi commit | ✅ DONE Phase 3 |
| V1 | **isPathSafe() Windows bypass** | CRITICAL | 6-layer Zero-Trust path filter | ✅ DONE Phase 4 |
| V2 | **Tool raw fs/child_process import** | CRITICAL | Tool Gateway pattern + R5 scan | ✅ DONE Phase 4 |
| V3 | **tool-registry re-export execSync/fs** | CRITICAL | Removed — replaced with secureRuntime | ✅ DONE Phase 4 |
| G14 | **Orphan files (tool-pruner, extract_worker, repos/, .obsidian/, queue/)** | LOW | Purged — 6 candidates, ~50MB+ freed | ✅ DONE Phase 5 |

---

## Changelog

| Date | Session | Change |
|------|---------|--------|
| 2026-05-20 | gov-phase-1 | Created Living Manifest; Structure Map hardcoded to CLINE.md; SAFE_PATHS tightened |
| 2026-05-20 | gov-phase-2 | Created validate-structure.ts; Added @depends-on to DiscordBridge; Created modules/index.ts barrel |
| 2026-05-20 | gov-phase-3 | Created .husky/pre-commit hook; Created .github/workflows/structure-check.yml CI |
| 2026-05-20 | gov-phase-4 | Operation IMMOBILIZE: Rebuilt isPathSafe() 6-layer Zero-Trust; Created tool-gateway.ts; Removed execSync/fs re-export from registry; Added R5 Static Security Scan |
| 2026-05-20 | gov-phase-5 | Operation Clean Slate: Purged 6 orphan candidates — ~50MB+ freed |
| 2026-05-20 | gov-phase-6 | Operation Liposuction: Moved 52 PDFs to .external-assets/, purged 9router rác (node_modules/.next/gitbook/tests/docs/tester/.vscode), git gc aggressive — ~891MB freed, 41,534 files removed |

---

**Storage After Liposuction:**
| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Total repo | 2,320 MB | 1,429 MB | **-891 MB** |
| Total files | 61,300 | 19,766 | **-41,534** |
| .git | 556 MB | 517 MB | -39 MB |
| 9router | 859 MB | ~5 MB | **-854 MB** |
| knowledge/raw | 497 MB | 0 MB | **-497 MB** |

> 📌 **Next Action:** Phase 3+ — Wire Janitor, unify skills system, add dependency headers to ALL src/ files, add core tests.
