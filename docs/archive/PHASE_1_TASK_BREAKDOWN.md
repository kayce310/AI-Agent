# Phase 1: Stabilization — Task Breakdown

**Status:** Starting Phase 1  
**Deadline:** 3-4 weeks  
**Goal:** Fix bugs + wire memory + expand tests

---

## Task 1.1: Command Injection Audit ✅ VERIFIED
**Status:** ✅ SAFE — Already fixed
- system.ts: Uses `execFileSync` (parameterized, no shell)
- document.ts: Uses `execFileSync` with JSON.stringify (safe)
- **Conclusion:** Command injection is NOT an issue (contradicts CAMEL findings)

---

## Task 1.2: PDF Race Condition Audit ✅ VERIFIED
**Status:** ✅ SAFE — Already mitigated
- Uses `uniqueTmpDir()` (timestamp + random)
- Each call gets unique directory
- Cleanup in finally block
- **Conclusion:** Race condition mitigated (not critical)

---

## Task 1.3: Memory Wiring — CRITICAL 🔴
**Status:** ⚠️ BROKEN — Memory writes but doesn't read in ReAct loop

### Problem
- Tool results ARE written to memory (globalMemoryStore, agenticMemory)
- But LLM NEVER recalls them in next request
- Memory stays "cold" — not used for context building

### Current Flow (Broken)
```
User Query
  ↓
PromptBuilder.build()
  → Query memory store (line 446)
  → Returns blocks if found
  → Add to memoryContext
  ↓
LLM Call (with memory context)
  ↓
Tool execution
  ↓
Tool result → Store in memory (line 291-297)
  ✗ BUT: Next request doesn't use this stored result
```

### Solution Needed
1. **Add `sessionId` tracking** — Link memories to user session
2. **Modify prompt-builder** — Always recall before build
3. **Add tests** — Verify recall works end-to-end
4. **Add integration test** — Memory → Tool → Memory cycle

### Files to Modify
- `src/core/engine/engine.ts` — Pass sessionId through entire flow
- `src/core/llm/prompt-builder.ts` — Ensure recall on every build
- `src/core/memory/memory-store.ts` — Query by sessionId
- `tests/memory-integration.test.ts` — NEW: E2E memory test

---

## Task 1.4: Test Coverage Expansion 🟡
**Current:** 57% source untested (215/215 tests pass on known paths)  
**Target:** 75% coverage minimum

### High-Priority Coverage Gaps
1. **LLM Layer** (model-adapter.ts, provider-registry.ts)
   - Cascade logic (fallback between providers)
   - Tool call parsing edge cases
   - Error recovery

2. **Memory Layer** (memory-store.ts, memory-temporal.ts)
   - Query with multiple tags
   - TTL expiry
   - Concurrent adds

3. **Event System** (event-bus.ts, trace-builder.ts)
   - Out-of-order events
   - Corrupted payloads
   - Orphan tool calls

### New Tests (50+)
- `tests/memory-integration.test.ts` — Memory recall workflow
- `tests/llm-cascade.test.ts` — Provider fallback
- `tests/event-ordering.test.ts` — Out-of-order handling
- `tests/threat-model.test.ts` — Zero-trust validation

---

## Task 1.5: Threat Model Documentation 📝
**Status:** Pending

### Deliverable
- **File:** `docs/THREAT_MODEL.md`
- **Content:**
  1. Zero-trust assumptions (what's verified, what's not)
  2. Security boundaries (where untrusted data enters)
  3. Attack surface (each tool, each endpoint)
  4. Mitigations (current safeguards)
  5. Gaps (known risks)

---

## Git Commit Plan

**Commit 1:** Memory Integration
```bash
git add src/core/engine/engine.ts src/core/llm/prompt-builder.ts src/core/memory/
git commit -m "Phase 1.1: Wire memory recall into ReAct loop + sessionId tracking"
```

**Commit 2:** Test Coverage
```bash
git add tests/
git commit -m "Phase 1.2: Add 50+ tests for LLM/Memory/Event layers (57% → 75% coverage)"
```

**Commit 3:** Documentation
```bash
git add docs/THREAT_MODEL.md
git commit -m "Phase 1.3: Document threat model + security boundaries"
```

---

## Verification Checkpoints

### Checkpoint 1.1: Memory Recall Works
```
npm test -- memory-integration.test.ts
Expected: All tests pass
Verify: Tool result → Stored → Recalled in next request
```

### Checkpoint 1.2: Test Coverage ≥75%
```
npm test -- --coverage
Expected: src/ coverage ≥75%
Verify: No untested code paths in critical modules
```

### Checkpoint 1.3: All Tests Pass
```
npm test
Expected: 400+ tests pass (was 392)
Verify: New tests included in full suite
```

---

## CAMEL Debate After Phase 1

After completing all tasks:
1. Run CAMEL debate: "Evaluate Phase 1 completion"
2. Get specialist assessment: Security, Architecture, Learning, Viability
3. Confirm ready for Phase 2

---

## Timeline Estimate

| Task | Days | Effort |
|------|------|--------|
| 1.1 Memory Wiring | 2-3 | 4-6h |
| 1.2 Test Coverage | 3-4 | 6-8h |
| 1.3 Threat Model | 1-2 | 2-3h |
| Integration + Verification | 2-3 | 3-4h |
| **Total Phase 1** | **10-12 days** | **15-21h** |

---

**Start now with Task 1.3: Memory Wiring** ← Most critical
