# Phase 4: CoralAgentLoop — Multi-step Task Decomposition (Phase 1)
**Date:** 2026-06-21  
**CAMEL Score:** 8.5/10 (recommended: Hybrid approach)  
**Status:** ✅ Phase 1 Complete (Start Phase 1 of 3)

---

## Summary

Implemented CoralAgentLoop — a multi-step task orchestration layer that decomposes complex user requests into sequential sub-steps and executes each through Coral's existing ReAct loop engine.

## Architecture

```
User Request (complex)
        │
        ▼
┌─────────────────────────────────┐
│ TelegramMessageHandler          │
│  ├─ isComplexTask()? → detect   │
│  └─ YES → route to              │
│         ┌───────────────────────┐
│         │ CoralAgentLoop        │
│         │  ├─ decomposeTask()   │ → LLM generates plan
│         │  ├─ execute steps     │ → Each step → engine.process()
│         │  └─ synthesizeFinal() │ → Combine all results
│         └───────────────────────┘
│
│  Single-step tasks → Engine directly (unchanged)
└─────────────────────────────────┘
```

## Key Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Decomposition method | LLM-based (taskRunner) | Leverages Coral's existing engine |
| Step execution | Sequential via engine.process() | Clean separation, no state pollution |
| Fallback | Direct single-turn execution | Safe degradation if decomposition fails |
| Max steps | 5 | Limits latency for complex tasks |
| Step delimiting | Vietnamese markers | Natural for Coral's primary language |

## Files Created/Modified

| File | Status | Lines | Purpose |
|------|--------|-------|---------|
| `src/core/agent/agent-loop.ts` | NEW | 285 | CoralAgentLoop implementation |
| `tests/agent-loop.test.ts` | NEW | 168 | 16 test cases |
| `src/platform/telegram/message-handler.ts` | MODIFIED | +10 | Integration with CoralAgentLoop |

## Test Results

```
Tests  627 passed (627)
Files  43 passed (43)
```

All prior tests pass with 0 regression.

## How It Works

1. **Detection**: `isComplexTask()` checks for multiple action verbs, sequential indicators, or long requests
2. **Decomposition**: Sends a structured prompt to Coral's LLM asking for step breakdown
3. **Execution**: Each step submitted as a separate engine request with context from prior steps
4. **Failure handling**: If a step fails, the loop continues with the remaining steps
5. **Synthesis**: All step results combined into a coherent final response

## Comparison with Alternatives (from CAMEL Debate)

| Approach | Recommended | Reason |
|----------|-------------|--------|
| ❌ CrewAI directly | No | Python subprocess overhead (>1s) |
| ❌ Wait for OpenAI Agents SDK JS | No | Months away, unstable API |
| ❌ LangGraph from scratch | No | Beta TypeScript, high maintenance |
| ✅ **Phase 1: CoralAgentLoop** | **Yes** | **Proven, immediate, 0 regression** |
| ✅ Phase 2: Custom ReAct loop | Next week | Streaming UX, sub-500ms |

## Next Steps (Phase 2 — Next Week)

1. Build proper ReAct loop in TypeScript (200 lines core + 300 hardening)
2. Add streaming progress updates (better UX)
3. Implement timeout/retry/circuit-breaker
4. In-place tool execution (no delegation overhead)
5. Replace CoralAgentLoop when Phase 2 ready

## Caveats

- Phase 1 uses LLM-based task decomposition (adds latency, uses tokens)
- Decomposition quality depends on the LLM model used
- For simple requests, the direct executor is faster (no overhead)
- Phase 1 is designed as temporary — Phase 2 will provide native loop support
