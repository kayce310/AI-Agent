# Audit Findings: Sprint A (Recovery Plan)

> Generated: 2026-05-17 | Auditor: CLINE  
> Baseline: recovery-plan.md identifies 10 gaps across Sprint A (P0), Sprint B (P1), Sprint C (P2)

## Sprint A (P0) — "Complete" in checkpoint.json? **NO**

### CodeParser (src/core/code-parser.ts)
- **File exists:** ✅ 170 lines
- **Implementation:** ✅ Function/import extraction, brace validation, language detection
- **Wired:** N/A (standalone utility)
- **Tests:** ❌ **ZERO** — no test file exists
- **Exported from index.ts:** ✅
- **Issues found:** 
  - arrow regex may miss edge cases (single-line arrow without braces)
  - `parseFunctions` only matches JS/TS — returns empty for other languages silently
  - `checkSyntax` only checks brace balance, not actual JS syntax via `vm`/`acorn`

### RateLimiter (src/core/rate-limiter.ts)
- **File exists:** ✅ 191 lines
- **Implementation:** ✅ Token-bucket + RateLimiterGroup (composite)
- **Wired:** ✅ Engine.process() line 217 (tryAll gate before execution)
- **Tests:** ❌ **ZERO** — no test file exists
- **Exported from index.ts:** ✅
- **Issues found:**
  - `consume()` waits then potentially still returns -1 (timeout) — caller gets no token but also no exception
  - No back-pressure mechanism for ModelRouter calls inside Agent
  - `lastRefill` only updates on full interval boundary, not partial refills

### Janitor (src/core/janitor.ts)
- **File exists:** ✅ 150 lines
- **Implementation:** ✅ vitest/tsc execution + PII regex scan
- **Wired:** ❌ **UNUSED** — never imported, instantiated, or called anywhere
  - Not imported in agent.ts
  - Not imported in engine.ts  
  - Not imported in orchestrator.ts
  - Not registered as a hook listener
- **Tests:** ❌ **ZERO** — no test file exists
- **Exported from index.ts:** ✅
- **Issues found:**
  - PII scan only checks `result` object (test output) not the actual project source files
  - Uses `execSync` — blocks event loop, incompatible with ongoing ReAct loop
  - No integration with HookRegistry — should listen to `tool:result` events

## Sprint B (P1) — 0/3

| Component | Exists? | Details |
|-----------|---------|---------|
| CostTracker | ❌ | No file, no export |
| 5 patterns (chaining/routing/parallel/code-exec/reflection) | ❌ | `src/core/patterns/` dir absent |
| Cold start warmup | ❌ | No pre-warm hook in Engine.init() |

## Sprint C (P2) — 0/4

| Component | Exists? | Details |
|-----------|---------|---------|
| SandboxExecutor | ❌ | No file |
| AgentManager | ❌ | No file |
| PromptFooClient | ❌ | No file |
| DockerSandbox | ❌ | No file |

## Test File Inventory

```
tests/ (16 files) — NONE cover Sprint A components:
  ❌ tests/code-parser.test.ts — MISSING
  ❌ tests/janitor.test.ts — MISSING
  ❌ tests/rate-limiter.test.ts — MISSING
  ❌ tests/cost-tracker.test.ts — MISSING
  ❌ tests/patterns/ (dir absent)
```

## Real Completion Summary

| Sprint | Target Items | Done | Missing Items | Real % |
|--------|-------------|------|-------------|--------|
| A (P0) | 3 files + wiring + tests | 3 files created, 1 wired, 0 wired properly, 0 tests | Janitor wiring, all 3 test files | ~30% |
| B (P1) | 3 files | 0 | CostTracker, 5 patterns, cold start | 0% |
| C (P2) | 4 files | 0 | SandboxExecutor, AgentManager, PromptFooClient, DockerSandbox | 0% |
| **Total** | **16 items** | **3 partial** | **13 incomplete** | **~15%** |

## Conclusion

checkpoint.json's claim of "Sprint A complete" is **incorrect**. Correct status:
- CodeParser: exists + exports + tests MISSING
- RateLimiter: exists + wired + tests MISSING
- Janitor: exists + exported + **NOT wired** + tests MISSING
- Sprint B+C: 0/7 items started