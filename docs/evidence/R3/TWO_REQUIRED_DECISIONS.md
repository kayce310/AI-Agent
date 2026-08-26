# R3 ADMISSION CONTROL — TWO REQUIRED DECISIONS

**Status: READY FOR SPEC** (both questions answered from code audit)

---

## Question 1: Per-session Concurrency — ARCHITECTURE INVARIANT hay POLICY?

### Finding

**Per-session concurrency: ARCHITECTURE INVARIANT**

- **Mechanism:** `checkpoint.activeTaskBySession[sessionId]` — single Map entry per session
- **Enforcement point:** `engine.ts:780-787` (Fix C)
  ```
  const existingTaskId = this.checkpointStore.getActiveTaskForSession(sessionId);
  if (existingTaskId) {
    log.warn(`Session ${sessionId} already has active task ${existingTaskId}`);
  } else {
    this.checkpointStore.start(taskId, sessionId, ...);
  }
  ```
- **Invariant held by:** checkpoint.start() unconditionally sets `activeTaskBySession[sessionId] = requestId` (line 149)
- **Cleanup:** checkpoint.markCompleted() / markFailed() delete the entry (lines 226-227, 244-245)
- **Classification:** NOT configurable, enforced by checkpoint design
- **Evidence:** checkpoint.ts lines 107, 149, 226-227, 244-245; engine.ts lines 780-787

### Cross-session Concurrency: UNGOVERNED (foreground) + SEQUENTIAL (background)

- **Foreground requests:** Multiple sessions can process requests in parallel
  - No global in-flight counter
  - No per-session admission queue
  - Only rate limit (global + per-user), not capacity-based
- **Background tasks:** Sequential by design
  - TaskQueue.tick() has single `private running = false` flag (line 80)
  - One background task executes at a time, globally
  - Not an admission control design, just sequential execution
- **Evidence:** TaskQueue.ts lines 80-81, 195-220 (tick() logic)

### R3 Relevance

✓ Per-session invariant already enforced — NOT a resource governance policy decision  
✓ Cross-session: foreground UNGOVERNED, background SEQUENTIAL  
✗ R3 admission control would apply to cross-session foreground concurrency (if added)

---

## Question 2: Hard-limit Admission Semantics — REJECT hay QUEUE?

### Finding

**Current admission behavior:**

| Layer | Mechanism | Semantics | Lý do |
|-------|-----------|-----------|-------|
| **Rate limiter (foreground)** | `engine.ts:577-593` | REJECT | Token-bucket depleted → return error |
| **Background task enqueue** | `task-queue.ts:120` | ACCEPT (unbounded) | No rejection, Map is unbounded |
| **Queue depth limit** | MISSING | N/A | No maxQueue config |

### Evidence

**Rate Limiter:**
- `engine.ts:577-581` — Global rate limit: `if (!this.rateLimiter.tryAll(1)) return { content: '❌ Rate limit exceeded.' }`
- `engine.ts:587-593` — Per-user (20 req/min): `if (!this.perUserLimiter.tryConsume(actualUserId)) return { content: '❌ Bạn đã gửi quá nhiều tin nhắn.' }`
- Rate limiter in `core-security` layer, not capacity governance

**Background Queue:**
- `task-queue.ts:120-132` — `enqueue()` never rejects:
  ```
  const taskId = `bg-${Date.now()}-${Math.random()...}`;
  const task: BackgroundTask = { id: taskId, sessionId, status: 'queued', ... };
  this.tasks.set(taskId, task);  // unbounded Map
  ```
- No max queue depth check
- `tasks` Map grows unbounded

### Semantics Not Defined

**Admission-at-limit semantics: UNDEFINED in code**

- Rate limiter REJECTS (not R3 scope — security layer)
- TaskQueue ACCEPTS unbounded (no limit → no admission decision)
- R3 would need to define:
  - IF global foreground concurrency ceiling reached → REJECT or QUEUE?
  - IF background queue grows large → REJECT new or QUEUE?
  - Is there a max queue depth? (currently: no)

### R3 Relevance

✗ Rate limiting: belongs to `security` layer, lý do là anti-abuse/rate-protection, NOT resource capacity  
✓ Background queue: MISSING boundary condition (no maxQueue, no admission check)  
✓ R3 would define admission semantics IF resource ceiling is added (currently: no ceiling)

---

## Conclusion: READY FOR SPEC

Both audit questions answered from code:

1. **Per-session concurrency:** ARCHITECTURE INVARIANT (not a policy choice)
2. **Cross-session concurrency:** UNGOVERNED (foreground) / SEQUENTIAL (background, not by admission control)
3. **Admission semantics when limit reached:** Currently UNDEFINED (no limit exists yet)

### Spec v1 can now define:

- **Foreground concurrency ceiling:** (if needed) → REJECT or QUEUE semantics
- **Background task queue depth:** (if needed) → REJECT or QUEUE semantics  
- **Resource budget unit:** per-session, per-user, global, or mixed?
- **Measurement:** execution time, token count, process count, or none?

**No implementation blocker remains.**

---

**Audit date:** 2026-08-26  
**git HEAD:** b7cc23e2  
**Audit scope:** Code inspection only, no implementation  
**Evidence level:** 5-tier (code path traced, not verified at runtime)
