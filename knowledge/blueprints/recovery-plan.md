# Recovery Plan — Gap Closure After Audit

> **Audit date:** 2026-05-17
> **Baseline:** 363/363 tests passing, 35 core files exist
> **Problem:** RESUME.md overstates completion — phases 5-8 claimed "done" but 10 sub-components missing

## Gap Inventory

| # | Missing Component | Phase | Est. Lines | Priority | Depends On |
|---|-------------------|-------|-----------|----------|-----------|
| 1 | `CodeParser` — parse LLM-generated code, extract functions/imports | 5.2a | 120 | 🟡 MED | Decomposer ✓ |
| 2 | `SandboxExecutor` — Docker/E2B sandbox for code execution | 5.2b | 180 | 🟢 LOW | CodeParser |
| 3 | `AgentManager` — sub-agent lifecycle (spawn/kill/timeout) | 5.3a | 150 | 🟢 LOW | Orchestrator ✓ |
| 4 | `Janitor` — verify step: tests, lint, PII scan after changes | 5.4 | 120 | 🟢 LOW | CodeParser |
| 5 | `CostTracker` — per-span token cost tracking | 6.4a | 80 | 🟢 LOW | LangfuseClient ✓ |
| 6 | `RateLimiter` — token/minute, request/minute limits | 6.4b | 80 | 🟢 LOW | — |
| 7 | `PromptFooClient` — dedicated client (eval-engine exists but no client) | 6.2 | 150 | 🟢 LOW | EvalEngine ✓ |
| 8 | 5 pattern implementations (chaining, routing, parallel, code-exec, reflection) | 7.2c | 250 | 🟢 LOW | PatternRegistry ✓ |
| 9 | `DockerSandbox` — isolated execution + image lifecycle + quota | 8.1a | 300 | 🟢 LOW | — |
| 10 | Cold start warmup — pre-warm models on boot | 8.3b | 80 | 🟢 LOW | Engine ✓ |

## Execution Order (P0 → P2)

### Sprint A: P0 🟡 (1-2 days)
```
[ ] CodeParser — phaser 1: function/import extraction from LLM output
[ ] Janitor — run tests + lint after tool execution
[ ] RateLimiter — simple token-bucket, wire into engine.ts
```

### Sprint B: P1 🟢 (2-3 days)
```
[ ] CostTracker — read Langfuse spans, compute token cost
[ ] 5 patterns — implement in src/core/patterns/ directory
[ ] Cold start warmup — engine boot hook
```

### Sprint C: P2 🟢 (later)
```
[ ] SandboxExecutor — Docker execution wrapper
[ ] AgentManager — sub-agent spawn/monitor
[ ] PromptFooClient — if eval-engine needs dedicated client
[ ] DockerSandbox — full isolated execution
```

## File Impact

### New files to create:
```
src/core/code-parser.ts
src/core/janitor.ts
src/core/cost-tracker.ts
src/core/rate-limiter.ts
src/core/patterns/chaining.ts
src/core/patterns/routing.ts
src/core/patterns/parallel.ts
src/core/patterns/code-exec.ts
src/core/patterns/reflection.ts
src/core/docker-sandbox.ts
src/core/agent-manager.ts
src/core/sandbox-executor.ts
```

### Files to modify:
```
src/core/types.ts           — add 'world' block type
src/core/engine.ts          — wire RateLimiter, CostTracker, cold start
src/core/index.ts           — export new modules
```

## Success Criteria

- All 10 missing files created with real implementations
- No stubs or `throw new Error('not implemented')`
- Tests pass: maintain 363+ baseline
- `RESUME.md` updated to reflect actual completion
- `checkpoint.json.pendingSteps` cleared

---

*Generated: 2026-05-17 | Recovery Plan v1.0*