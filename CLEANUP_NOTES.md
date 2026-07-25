# CLEANUP_NOTES.md — Items Requiring Human Decision

> Generated during `cleanup/dead-code-audit` branch work on 2026-07-21.
> These items were investigated but NOT deleted/modified — they need your decision.

---

## 1. Sentiment Module (Task 7) — ORPHAN (Revised 2026-07-21)

**Status:** Orphan — zero imports from outside `src/core/sentiment/`
**Files:** `src/core/sentiment/sentiment-analyzer.ts`, `src/core/sentiment/sentiment-api.ts`
**Evidence:** `grep -rn "core/sentiment" src/ --include='*.ts' | grep -v "src/core/sentiment/"` → 0 results
**Note:** `proactive-engine.ts` references `'sentiment'` as a string type (line 33, 170-187) but does NOT import from the sentiment module
**Git log:** No evidence of intentional disabling. Last meaningful commit: `5f595c20 fix: Update sentiment analyzer threshold and toxic detection`
**Recommendation:** Delete if sentiment analysis feature is not planned. Or keep if future integration planned.

---

## 2. `report.ts` TODO Placeholder (Task 8) — BUG, Not Dead Code

**Status:** Bug — tool returns hardcoded "TODO" instead of actual report content
**File:** `src/core/tools/report.ts` lines 43, 47
**Evidence:**
```typescript
// Line 43: daily report template
return `# Daily Report - ${now}\\n\\n## Overview\\n${params.overview || 'No overview provided'}\\n\\n## Progress\\n- TODO\\n...`;

// Line 47: weekly report template
return `# Weekly Report - ${now}\\n\\n## Summary\\n${params.summary || 'No summary provided'}\\n\\n## Work Done\\n- TODO\\n...`;
```
**Recommendation:** Fix the tool to generate actual reports from session data, or remove the tool from the registry if reports are generated elsewhere.

---

## 3. `delegation-orchestrator.ts` (Task 10) — Intentionally Unhooked

**Status:** Orphaned but intentionally disconnected
**File:** `src/core/orchestrator/delegation-orchestrator.ts`
**Evidence:**
- Git log: `65afeb3b` added it, then it was removed from `message-handler.ts` imports
- Current code comments in `message-handler.ts` (lines 104, 111): "No longer used — DelegationOrchestrator handles streaming progress natively"
- `delegate.ts` line 19: `export { AgentRegistry }; // re-export cho DelegationOrchestrator`
**Recommendation:** Either fully remove (delete file + clean comments in delegate.ts and message-handler.ts) or restore if delegation feature is planned. Currently dead weight.

---

## 4. `hitl-manager.ts` + `entity-approval-queue.ts` — Orphan Chain

**Status:** Both orphaned. `hitl-manager.ts` was deleted in Task 6 fix (broken import). `entity-approval-queue.ts` kept per Task 5 instructions but is now truly orphan.
**Files:**
- `src/core/knowledge/hitl-manager.ts` — DELETED (broken import after risk-scorer removal)
- `src/core/knowledge/entity-approval-queue.ts` — Still exists, zero imports
**Recommendation:** Delete `entity-approval-queue.ts` too, or restore the HITL (Human-in-the-Loop) system if needed for production.

---

## 5. `core/security/` Modules — Potential Orphans (Do NOT Auto-Delete)

**Status:** Some modules may be unused but security-related — requires manual verification
**Files to verify:**
- `src/core/security/secret-rotation.ts` — Zero imports found via grep
- `src/core/security/consent.ts` — Zero imports found via grep
**Recommendation:** Manual audit needed. These could be activated via config, events, or future use. Do NOT delete without thorough review.

---

## 6. `core/memory/memory-retrieval-gate.ts` — Potential Orphan

**Status:** Zero imports found in initial audit
**File:** `src/core/memory/memory-retrieval-gate.ts`
**Recommendation:** Verify if it's used via dynamic import or config before deleting.

---

## Summary

| Item | Action Taken | Needs Decision? |
|------|-------------|-----------------|
| Sentiment module | Orphan (revised) | Yes — delete or keep for future |
| report.ts TODO | Documented | Yes — fix or remove tool |
| delegation-orchestrator | Documented | Yes — delete or restore |
| entity-approval-queue | Kept (orphan) | Yes — delete or restore HITL |
| security/secret-rotation | Not touched | Yes — manual audit |
| security/consent | Not touched | Yes — manual audit |
| memory/memory-retrieval-gate | Not touched | Yes — verify usage |

---

## 7. `entity-approval-queue.ts` — Orphaned by Cascading Deletion (Task 6)

**Status:** Zero imports across entire codebase (src/ + tests/)
**File:** `src/core/knowledge/entity-approval-queue.ts`
**Evidence:** `grep -rn "entity-approval-queue" src/ tests/ --include='*.ts'` → 0 results
**Cause:** Was only imported by `hitl-manager.ts`, which was deleted in Task 6 fix (broken import after risk-scorer removal)
**Recommendation:** Delete this file too — it's dead code with no consumers. Or restore the full HITL system if needed.
