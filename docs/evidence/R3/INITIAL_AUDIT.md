# INITIAL AUDIT R3 — RESOURCE GOVERNANCE

**Status: UNDEFINED → DEBATE REQUIRED**

---

## 1. R3 Definition Status

**UNDEFINED.** Repo không chứa specification/acceptance criteria rõ ràng cho "R3 — Resource Governance". Không tìm thấy:
- Roadmap document định nghĩa R3 scope
- ADR hoặc architecture decision về resource governance
- Test specifications/acceptance criteria  
- Historical context hoặc design docs

Các reference tìm được chỉ là:
- Archived roadmap (kato-roadmap-phases-4-8.md) nói "Image lifecycle + resource quota" nhưng không định nghĩa R3 toàn bộ
- Commit fd9ea468 nói "R3 warnings" (dependency tracking, không resource limits)
- Commit 14c40f97 nói "governance" (architecture rules verification, không resource governance)

**Conclusion: R3 là placeholder tên, chưa có specification.**

---

## 2. Roadmap Sources

| Source | Content | Status |
|--------|---------|--------|
| knowledge/wiki/roadmap/archive/kato-roadmap-phases-4-8.md | "Phase 8.1b: Image lifecycle + resource quota" | Archived, vague |
| git commit fd9ea468 | R3 warnings (dependency checking) | Historical, unrelated |
| git commit 14c40f97 | Architecture rules governance tool | Unrelated (architecture contract) |
| PROGRESS_V1_FINAL.md | Silent on R3 | Not roadmap source |
| Current roadmap | Not found | **Missing** |

**No authoritative R3 spec found.**

---

## 3. Current Implementation — Resource Governance Capabilities

### A. Concurrency & Queue Management

| Capability | Current State | Evidence | Classification |
|------------|---------------|----------|-----------------|
| Task queue exists | EXISTS | `src/core/task-queue.ts` (BackgroundTask, enqueue, worker) | UNVERIFIED |
| Per-task execution | EXISTS | TaskQueue.tick() polls + executes one task at a time | UNVERIFIED |
| Backpressure | MISSING | No queue depth limit, no rejection on overflow | — |
| Concurrency limit (tasks) | MISSING | No global max concurrent task count | — |
| Concurrency limit (tools) | PARTIAL | `maxToolCycles: 10` per plan (engine.ts:284), NOT per parallel execution | UNVERIFIED |
| Queue backpressure | MISSING | No mechanism to reject/defer enqueue when queue is full | — |

### B. Rate Limiting

| Capability | Current State | Evidence | Classification |
|------------|---------------|----------|-----------------|
| Global rate limit | EXISTS | `engine.ts:577-581` — rate limiter check on processInner | UNVERIFIED |
| Per-user rate limit | EXISTS | 20 req/min per userId (engine.ts:587-593) | UNVERIFIED |
| Rate limiter impl | EXISTS | `src/core/security/rate-limiter.ts` (token-bucket) | UNVERIFIED |
| Token refill logic | EXISTS | tokensPerInterval, intervalMs config | UNVERIFIED |
| Burst allowance | EXISTS | maxBurst config (rate-limiter.ts) | UNVERIFIED |
| Rate limit enforcement | EXISTS | Returns rejection message when exceeded | UNVERIFIED |

**No test evidence of rate limiter behavior under load.**

### C. Process/Subprocess Resource Tracking

| Capability | Current State | Evidence | Classification |
|------------|---------------|----------|-----------------|
| Process spawn | EXISTS | R1-F: `src/core/tools/process.ts` | VERIFIED (R1) |
| Process lifecycle | EXISTS | R1-F: start/poll/kill/list | VERIFIED (R1) |
| Timeout handling | EXISTS | R1-F: SIGTERM → grace → escalation | VERIFIED (R1) |
| CPU measurement | MISSING | No process CPU tracking | — |
| RAM measurement | MISSING | No process memory tracking | — |
| Process count limit | MISSING | No limit on number of spawned processes | — |
| Runaway process protection | PARTIAL | R1-F: timeout-based kill, NOT resource-based | VERIFIED (R1 scope) |
| Orphan subprocess handling | MISSING | R2 limitation: orphan subprocess not reconciled | — |

### D. Execution Budget / Timeout

| Capability | Current State | Evidence | Classification |
|------------|---------------|----------|-----------------|
| Request-level timeout | EXISTS | `engine.ts:650` "withTimeout" wrapper | UNVERIFIED |
| Tool cycle limit | EXISTS | `maxToolCycles: 10` | UNVERIFIED |
| Plan timeout | PARTIAL | checkpoint.ts has `paused_limit` status for plans | UNVERIFIED |
| Token budget | EXISTS | `context-compression.ts:105` — compress when approaching token limit | UNVERIFIED |
| Graceful timeout handling | PARTIAL | Timeout triggers graceful shutdown (not crash) | UNVERIFIED |

### E. Admission Control / Resource-Aware Scheduling

| Capability | Current State | Evidence | Classification |
|------------|---------------|----------|-----------------|
| Task admission | MISSING | No check before enqueue (first-come-first-served) | — |
| Resource-aware dispatch | MISSING | No scheduler aware of available resources | — |
| Starvation prevention | MISSING | No fairness/priority queue | — |
| Load shedding | MISSING | No rejection/defer when system overloaded | — |

### F. Resource Exhaustion Handling

| Capability | Current State | Evidence | Classification |
|------------|---------------|----------|-----------------|
| Exhaustion detection | PARTIAL | Rate limit hit → reject (not exhaustion detection) | UNVERIFIED |
| Fail behavior | EXISTS | Rate limit returns error message | UNVERIFIED |
| Recovery behavior | MISSING | No recovery from resource exhaustion | — |
| Circuit breaker | EXISTS | `src/core/circuit-breaker.ts` (for LLM provider failover) | VERIFIED (different scope) |

---

## 4. Gap Matrix

| Area | Existing | Gap | Verification Status |
|------|----------|-----|-------------------|
| **Concurrency** | Per-plan tool cycles (10), sequential task queue | Global task concurrency limit, tool parallelism limit, backpressure | UNVERIFIED code, MISSING mechanism |
| **Rate Limiting** | Token-bucket (global + per-user) | Per-endpoint rate limits, adaptive rate limiting, quota resetting | UNVERIFIED behavior |
| **Process Resources** | Timeout-based kill (R1), timeout handling | CPU/RAM measurement, process count limit, resource-based escalation | MISSING |
| **Execution Budget** | Token limit (soft), cycle limit, timeout wrapper | Hard execution budget per request, budget accounting, budget enforcement | PARTIAL |
| **Admission Control** | First-come-first-served queue | Resource-aware dispatch, priority queuing, load shedding | MISSING |
| **Exhaustion Handling** | Rate limit reject | Exhaustion detection, recovery orchestration, circuit breaking per resource | PARTIAL |

---

## 5. R1 / R2 / R3 Boundary

### R1 — Execution Safety (VERIFIED)
Owns:
- Process start/stop/kill/list
- Timeout enforcement
- Signal handling (SIGTERM → grace → escalation)
- Subprocess lifecycle
- Tree-kill Windows
- Cancellation semantics

**NOT included in R1:** resource measurement, concurrency limits, admission control, rate limiting.

### R2 — Recovery / Resume (VERIFIED)
Owns:
- Crash recovery + checkpoint flush
- Task resumption + resume semantics
- Proven-completed protection
- Interrupted task detection
- In-memory limitation (orphan subprocess)

**NOT included in R2:** resource governance, scheduling, concurrency.

### R3 — Resource Governance (UNDEFINED)
**Candidate ownership** (NOT confirmed):
- Concurrency limits (global, per-user, per-endpoint, per-task)
- Rate limiting enforcement + policy
- Resource measurement (CPU, RAM, process count)
- Execution budget + accounting
- Admission control / scheduling
- Load shedding / backpressure
- Resource exhaustion recovery

**Boundary hazards (must avoid scope creep):**
- Process lifecycle = R1, not R3
- Timeout + crash recovery = R1 + R2, not R3
- Circuit breaker for LLM providers = different scope, not R3
- Token budget for LLM = language model specific, may belong to LLM layer not governance
- Orphan subprocess cleanup = out of scope per R2 limitation

---

## 6. Existing Evidence

No R3-specific evidence directory exists.

Related evidence from other phases:
- `docs/evidence/R1-F1/`, `R1-D1/`, `R1-E1/`, `R1-F2/` — Process lifecycle, but not resource governance
- `docs/evidence/R2/` — Recovery/resume, rate limiter NOT tested
- No rate limiter behavior tests found (rate-limiter.ts exists, no test file `tests/rate-limiter.test.ts`)
- No concurrency/backpressure test suite

---

## 7. Ambiguities / Blockers

1. **What is "resource governance" in this context?**
   - Concurrency limits only?
   - CPU/RAM/process measurement?
   - Budget tracking?
   - Admission control?
   - All of the above?

2. **Is rate limiting part of resource governance or security?**
   - Currently in `security/rate-limiter.ts`
   - Could be resource-aware rate limiting (R3) or just API rate protection (security)

3. **Per-user vs global vs per-endpoint limits?**
   - Currently: global + per-userId (20 req/min)
   - No per-endpoint, per-agent, per-plan limit

4. **Subprocess resource measurement?**
   - Should R3 measure process CPU/RAM?
   - Should R3 implement hard limits?
   - Or is that future "resource monitoring" phase?

5. **Token budget for LLM calls?**
   - Is this "resource governance" or "LLM cost control"?
   - Context-compression.ts exists, but no budget enforcement

6. **Concurrency model?**
   - Sequential per-session?
   - Parallel tasks with limit?
   - Priority-based?

---

## 8. Implementation Readiness

**NOT READY. R3 cannot be implemented until spec answers blocker questions above.**

Current code foundation:
- ✓ Rate limiter exists (needs test evidence)
- ✓ Task queue exists (sequential, no concurrency limit)
- ✓ Timeout wrapper exists
- ✗ No concurrency limit mechanism
- ✗ No admission control
- ✗ No resource measurement (CPU/RAM)
- ✗ No budget accounting
- ✗ No load shedding

---

## 9. Git State

```
Branch: r1-execution-safety [ahead 19 from main]
HEAD: b7cc23e2 (r2: add evidence SUMMARY — VERIFIED status)
Dirty: data/*.db*, knowledge/*, docs/adr/ADR-003, src/core/tools/process.ts, tests/consequence-*.ts
Staged: tests/continuity-blockers.test.ts
Untracked: PROGRESS_V1_FINAL.md, R1_*.md, docs/evidence/R1-*, process-cli.ts, progress-v1-plan-continuity.test.ts
```

---

## 10. Recommendation

**DEBATE REQUIRED before any R3 implementation.**

Essential questions for Kayce / reviewer:

1. **Is R3 "Resource Governance" or just "Rate Limiting"?**
   - If rate limiting only → scope is narrow, can verify existing code
   - If full resource governance → need concurrency + admission + measurement

2. **Concurrency model:**
   - How many tasks can run in parallel? (currently: 1 sequential)
   - How many tools can run in parallel per plan? (currently: hard stop at cycle 10)
   - Should there be global/per-user/per-endpoint limits?

3. **Measurement scope:**
   - CPU/RAM per process?
   - Token usage per request?
   - Wall-clock time per task?

4. **Admission control:**
   - First-come-first-served (current)?
   - Priority queue?
   - Backpressure / load shedding?

5. **Hard vs soft limits:**
   - Rate limit = soft (reject excess)
   - Timeout = hard (kill after deadline)
   - Budget = soft or hard?

**Once scope is confirmed, baseline R3 spec from answers + re-audit to classify gaps as MISSING vs PARTIAL vs UNVERIFIED.**

---

**Date:** 2026-08-26  
**git HEAD:** b7cc23e2  
**Audit by:** Initial scan (no implementation changes)
