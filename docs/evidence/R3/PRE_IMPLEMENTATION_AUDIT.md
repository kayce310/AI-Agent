# R3 PRE-IMPLEMENTATION AUDIT

**Date:** 2026-08-26  
**git HEAD:** b7cc23e2  
**Scope:** Code inspection + contract audit (no implementation changes)  
**Model:** kiro (custom:9router)

---

## 1. Repository / Git State

```
Branch: r1-execution-safety
HEAD: b7cc23e2 (r2: add evidence SUMMARY — VERIFIED status)
Status: Clean (no uncommitted changes)
```

**Verified paths:**
- Engine entry: `src/core/engine/engine.ts` (1237 lines)
- EngineResponse type: `src/core/types.ts` (206 lines)
- Per-session invariant: `src/core/checkpoint.ts` (570 lines)
- Background queue: `src/core/task-queue.ts` (347 lines)
- Rate limiter: `src/core/security/rate-limiter.ts`
- Test foundation: `tests/request-context-isolation.test.ts` (concurrent AsyncLocalStorage verified)

---

## 2. Current R3-Relevant Architecture

### Concurrency Model (Foreground)

**Per-session:** Architecture invariant, max 1 active task/session
- Enforced at: `checkpoint.activeTaskBySession[sessionId]` (single entry)
- Enforcement point: `engine.ts:780-787` (Fix C pattern)
- Cleanup: `checkpoint.complete()` / `checkpoint.failed()` delete entry
- **Evidence:** checkpoint.ts lines 107, 149, 226-227, 244-245

**Cross-session (foreground):** UNGOVERNED
- Multiple sessions can have active requests simultaneously
- No global in-flight counter
- No admission control gate
- Only rate limiter acts (security layer, not capacity)

### Concurrency Model (Background)

**Sequential execution only**
- TaskQueue.tick() has single `private running` flag (line 80)
- `this.activeTaskId` tracks one task (line 82)
- One background task at a time, globally
- **Evidence:** task-queue.ts lines 80-82, 187-220

**Queue acceptance:** Unbounded (no maxQueue, no rejection)
- `this.tasks: Map` grows without limit
- `enqueue()` never rejects
- **Evidence:** task-queue.ts lines 79, 120-134

### Rate Limiting (Security Layer, NOT R3)

**Global:** 60 req/min (engine.ts:217)  
**Per-user:** 20 req/min (engine.ts:219)  
**Rejection:** Returns `{ content: '❌ Rate limit exceeded.', providerUsed: 'rate-limiter' }`

**Classification:** Security/anti-abuse, NOT resource capacity governance. Kept separate from R3.

---

## 3. Admission Rejection Contract

### Current Return Type

```typescript
// src/core/types.ts lines 96-100
export interface EngineResponse {
  content: string;
  modelUsed: string;
  providerUsed: string;
}
```

**3 fields only. No structured error classification.**

### Current Rejection Patterns (engine.ts)

| Scenario | `providerUsed` | `content` | Caller Intent |
|----------|---|---|---|
| Global rate limit exceeded | `'rate-limiter'` | '❌ Rate limit exceeded.' | security layer |
| Per-user rate limit exceeded | `'rate-limiter'` | '❌ Bạn đã gửi quá nhiều tin nhắn.' | security layer |
| Circuit breaker open | `'circuit-breaker'` | '⚠️ Hệ thống đang bận.' | provider health |
| Empty message | `'none'` | '❌ Tin nhắn trống.' | validation |
| Cache hit | `'cache'` | `[cached content]` | cache layer |
| Request cancelled | `'cancelled'` | '🛑 Đã hủy yêu cầu.' | cancellation |
| Request timeout | `'timeout'` | '⚠️ Yêu cầu xử lý quá lâu.' | timeout |
| Paused plan limit | `'paused_limit'` | `[contract text]` | plan state |
| Background task enqueued | `'task-queue'` | '✅ Nhiệm vụ nền đã được tạo' | routing |

**Observation:** `providerUsed` is currently a **free-form discriminator**, not a structured enum or tagged union.

### Gap: No Machine-Readable R3 Admission Rejection

**Current state:** If R3 rejects request N+1 due to capacity, what would differentiate it from rate-limiter rejection?

- Rate limiter: `providerUsed: 'rate-limiter'` (security anti-abuse)
- R3 admission: `providerUsed: ???` (capacity governance)

**Problem:** Caller (test harness, gateway, monitoring) cannot programmatically distinguish:
- "You hit security rate limit" → can retry after quota window
- "System at capacity" → can retry, but different SLA
- "Validation failed" → client error, don't retry

### Minimal Contract Recommendation

**Option A: Add enum to EngineResponse (breaking change, minimal)**

```typescript
export enum RejectionReason {
  RATE_LIMIT = 'rate_limit',
  R3_CAPACITY = 'r3_capacity',
  VALIDATION_ERROR = 'validation_error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  // ... etc
}

export interface EngineResponse {
  content: string;
  modelUsed: string;
  providerUsed: string;
  rejectionReason?: RejectionReason;  // NEW, optional for compatibility
}
```

**Option B: Overload providerUsed with convention (non-breaking)**

Use `providerUsed` as structured discriminator:
- Existing: `'rate-limiter'`, `'circuit-breaker'`, `'cache'`, `'timeout'`
- New R3: `'r3-admission'` (obviously namespaced)

**Recommendation:** Option B (non-breaking, already using providerUsed as discriminator).

### In Scope for R3 v1

- Machine-readable `providerUsed: 'r3-admission'` when R3 rejects request N+1
- No new response fields needed
- No retry-after metadata (no evidence requirement yet)
- User-facing message in `content` is presentation, not acceptance criterion

### Out of Scope

- Retry-after header / metadata (no requirement found)
- New error types (use existing EngineResponse)
- API versioning (no scope creep)
- Per-rejection-reason metrics (observability = R6, not R3)

---

## 4. Concurrency Testability

### Existing Capability

**AsyncLocalStorage isolation (verified in tests):**
- `tests/request-context-isolation.test.ts` proves concurrent requests isolated
- Two Promise.all() branches with different sessionIds work independently
- No cross-contamination of `sessionId`, `taskId`, `evidenceLog`
- **Evidence:** tests/request-context-isolation.test.ts lines 33-64, 66-100

**Per-session invariant (code-verified, NOT runtime-tested for R3):**
- checkpoint.activeTaskBySession enforced
- engine.ts checks existingTaskId before starting new request
- **But:** no test verifies concurrent requests to SAME session are rejected
- **But:** no test verifies concurrent requests to DIFFERENT sessions both succeed

### Missing Capability: Concurrent Foreground Requests

**Current test scope:** No test creates N concurrent engine.process() calls to verify admission gate.

**Why it matters:** R3 v1 spec says:
```
active_foreground_count < N → ADMIT
active_foreground_count >= N → REJECT
```

But test must prove:
1. Request 1 admitted → remains active
2. Request 2 admitted → remains active
3. Request 3 admitted → remains active
4. Request 4 admitted → remains active
5. active_count == 4
6. Request 5 **rejected** (or queued, depending on admission semantics)
7. Request 1 released → active_count == 3
8. Request 6 **admitted**

### Why Sequential Calls Aren't Enough

```javascript
// ❌ WRONG: This tests queuing, not concurrency
engine.process(req1); // completes
engine.process(req2); // starts after req1 done
engine.process(req3); // starts after req2 done
```

**Correct:** Requests must be in-flight **simultaneously** when admission gate checks.

### Required Test Infrastructure

**Option 1: Delayed mock provider (simplest)**

Mock modelRouter.route() to suspend indefinitely until signalled:

```javascript
const barrier = new Barrier(4);  // or EventEmitter
mockRouter.route = async () => {
  await barrier.wait();
  return { content: 'ok', modelUsed: 'test', providerUsed: 'test' };
};

// Start 4 requests
const p1 = engine.process(req1);
const p2 = engine.process(req2);
const p3 = engine.process(req3);
const p4 = engine.process(req4);

// All in-flight simultaneously now
await delay(50);  // let them reach provider mock
assert(admissionCounter == 4);

// Start request 5, assert rejected
const p5 = engine.process(req5);
const r5 = await p5;
assert(r5.providerUsed == 'r3-admission');  // or rejected reason

// Release request 1
barrier.signal();
await p1;

// Request 6 admitted
const p6 = engine.process(req6);
// Request 6 succeeds
```

**Option 2: Multiple sessions (avoids per-session invariant)**

If N < ∞, use N+1 different sessionIds to avoid hitting per-session limit:

```javascript
const sessions = ['s1', 's2', 's3', 's4', 's5'];
const requests = sessions.map(sid => ({
  ...baseRequest,
  sessionId: sid,
}));
// Each session has max 1 active task → no per-session bottleneck
// Cross-session foreground concurrency tested
```

**Option 3: Test harness with instrumentation (best)**

Inject counter into engine.processInner():

```javascript
let activeCount = 0;
let peakCount = 0;

// Mock at entry
const originalProcessInner = engine.processInner;
engine.processInner = async (...args) => {
  activeCount++;
  peakCount = Math.max(peakCount, activeCount);
  try {
    return await originalProcessInner(...args);
  } finally {
    activeCount--;
  }
};
```

### Evidence Requirements

Test must record (for docs/evidence/R3/):
1. **Initial state:** activeCount == 0
2. **Request 1-4 admitted:** assert 4 activeCount > 0
3. **Request 5 rejected:** assert rejectionReason == 'r3-admission', assert activeCount still 4
4. **Request 1 released:** assert activeCount == 3
5. **Request 6 admitted:** assert activeCount == 4

No LLM dependency: all via mocked modelRouter, no network.

---

## 5. N=4 Test Value

### Can It Reach N+1 Rejection?

**Yes, with test infrastructure above.**

Using delayed mock provider:
- Start 4 requests with different sessionIds
- Suspend all at mock entry point
- Verify all 4 `activeCount >= 4`
- Start request 5
- Assert rejected by R3 admission gate
- Assert `rejectionReason == 'r3-admission'`

**Blocker check:**
- Per-session invariant: Avoided by using 5 different sessions ✓
- Rate limiter: Uses token-bucket, can bypass in test by setting high limit or freezing time ✓
- Circuit breaker: Mock as healthy ✓

### Why This Works

- Foreground concurrency currently **ungoverned** → no existing ceiling
- R3 v1 introduces ceiling N = 4 (test-only value)
- Test infrastructure can hold 4 requests active
- Request 5 hits ceiling, rejected
- Proves admission gate functional

### If Runtime Blocker Appears

**Risk:** If engine.process() has hidden sequential bottleneck (e.g., global lock not found in audit), test may fail.

**Mitigation:** Run simple 2-request concurrent test first:
```javascript
const [r1, r2] = await Promise.all([
  engine.process(req_s1),
  engine.process(req_s2),
]);
```
If both succeed with different sessionIds, concurrent foreground is confirmed.

---

## 6. Remaining Decisions

### A. Rejection Contract

**Decision needed:** Use Option A (new enum field) or Option B (providerUsed: 'r3-admission')?

**Recommendation:** Option B (non-breaking, already using providerUsed as layer discriminator).

**Action:** Update engine.ts admission gate to return:
```javascript
{ content: '❌ System at capacity...', modelUsed: 'none', providerUsed: 'r3-admission' }
```

### B. Admission Semantics (REJECT vs QUEUE)

**Decision needed:** When foreground ceiling reached, should request be:
1. **REJECT** (immediately return error) — current spec says this
2. **QUEUE** (wait for slot) — requires queue infrastructure, not in R3 v1 scope

**Recommendation:** REJECT (matches spec, simpler, no queue needed).

**Action:** Implement check at engine.process() entry, reject immediately if `active_count >= N`.

### C. N Value (Test vs Production)

**Test:** N = 4 (sufficient to verify N+1 rejection)

**Production:** TBD after benchmarking / product decision
- Current memory? Network capacity? Model provider limits?
- Provisional: start at 4, adjust based on operational experience
- **Not production decision in R3 v1** — call it `globalForegroundConcurrencyLimit` config

**Action:** Make N configurable:
```typescript
const N = config.get('concurrency.foregroundLimit', 4);  // default test value
```

### D. Test Value Determinism

**Question:** Can N=4 test be deterministic without flakiness?

**Answer:** Yes, with delayed mock provider (Option 1 above).
- Mock suspends all 4 requests at the same point
- No timing race conditions
- Request 5 deterministically hits ceiling

**If using Option 2 (multiple sessions):** Yes, per-session invariant guarantees isolation.

**If using Option 3 (instrumentation):** Depends on barrier/latch reliability — should be solid.

---

## 7. Verdict

**Status: IMPLEMENTATION READY**

### What's Ready

✅ **Rejection contract:** Can use non-breaking `providerUsed: 'r3-admission'` pattern  
✅ **Per-session invariant:** Already enforced by checkpoint, no changes needed  
✅ **Test infrastructure:** Mock delayed provider sufficient, no LLM dependency  
✅ **Deterministic N+1:** Yes, barrier/latch prevents race conditions  
✅ **Scope clarity:** R3 v1 narrowly scoped to global foreground concurrency only  
✅ **Code paths:** No blocking architectural issues found  

### What's NOT Blocking

❌ N production value: Not needed for v1, use config default  
❌ Per-user admission: Out of scope (R3 v1 = global only)  
❌ Background queue depth: Out of scope (sequential by design)  
❌ Resource measurement: Out of scope (no CPU/RAM in v1)  
❌ Observability: Out of scope (R6, not R3)  

### Implementation Checklist

Before starting implementation:

1. **Confirm rejection contract:** Use `providerUsed: 'r3-admission'`? (Yes/No)
2. **Confirm admission semantics:** REJECT on ceiling? (Yes/No)
3. **Confirm test value:** N = 4 sufficient? (Yes/No)
4. **Confirm scope adherence:** Global foreground only, no background/per-user? (Yes/No)

Once confirmed, implementation path is clear:
1. Add global counter: `private activeForegroundCount: number = 0`
2. Increment at engine.process() entry
3. Check: `if (activeForegroundCount >= N) return R3_REJECTION`
4. Decrement at engine.process() finally (after processInner completes)
5. Wire test with delayed mock provider
6. Verify N+1 rejection

**Estimated implementation scope:** <200 lines (engine.ts + 1 test file)

---

## Evidence Artifacts

**No pre-implementation artifacts needed.** Spec is now concrete enough that evidence will be generated during implementation:

- Implementation PR: admission gate code
- Test file: concurrent engine.process() harness
- Evidence summary: runtime proof of N+1 rejection
- Checkpoint: git commit hash + evidence directory

---

**Audit complete. Ready for implementation.**
