# ARCHITECTURE DECISION: PLAN / EXECUTION / CHECKPOINT CONTRACT

## 1. EXECUTIVE DECISION

**Model B is the baseline architecture.**

Source evidence supports Model B as the natural contract of the current codebase:

- `taskId` is already ephemeral (`engine.ts:761`: `\`task-${Date.now()}\``)
- `RequestContext` is already ephemeral (`request-context.ts:53`: `AsyncLocalStorage.run()`)
- Plans are already separately stored by `sessionId` (`checkpoint.ts:105`: `this.plans = Map<sessionId, TaskPlan>`)
- Snapshot plan copy is explicitly non-authoritative for Plan state — `getPlan()` has a fallback chain proving Plans have their own source of truth (`checkpoint.ts:290-292`)

The current bug (silent checkpoint loss after restart) is a **violation of Fix C's intent**, not a flaw in Model B. Fix C said "don't create duplicate checkpoint" — but the implementation skips start() while passing a new taskId downstream, breaking the checkpoint write contract.

---

## 2. PROVEN FACTS

### From forensic traces

| # | Fact | Source | Kind |
|---|------|--------|------|
| 1 | `taskId = \`task-${Date.now()}\`` fresh per `processInner()` | `engine.ts:761` | SOURCE |
| 2 | `RequestContext` created per `processInner()`, destroyed on return | `engine.ts:773-784`, `request-context.ts:53` | SOURCE |
| 3 | `checkpointStore.start()` sets snapshot key = `taskId` | `checkpoint.ts:140-149` | SOURCE |
| 4 | `agent.run()` receives `checkpointRequestId = taskId` | `engine.ts:1040` | SOURCE |
| 5 | `checkpointStore.cycle()` looks up by `request.checkpointRequestId` | `agent.ts:1169-1170` | SOURCE |
| 6 | `checkpointStore.complete()`/`.failed()` look up by same param | `engine.ts:1083-1088` | SOURCE |
| 7 | `activeTaskBySession` rebuilt from disk on load | `checkpoint.ts:406-413` | SOURCE |
| 8 | `checkpointStore.start()` SKIPPED when `activeTaskBySession` has entry | `engine.ts:806-809` | SOURCE |
| 9 | `EvidenceLog` is in-memory (`new Map()` per processInner) | `engine.ts:779` | SOURCE |
| 10 | `EvidenceLog` NOT persisted to checkpoint or disk | `agent.ts:1100-1120` (only writes to in-memory map) | SOURCE |
| 11 | `this.plans` Map NOT rebuilt from disk | `checkpoint.ts:348-417` (only snapshots rebuilt) | SOURCE |
| 12 | `getPlan(sessionId)` falls back to `getLatestForSession()?.plan` | `checkpoint.ts:290-292` | SOURCE |

### From ADR-000 / Fix C

| # | Fact | Source | Kind |
|---|------|--------|------|
| 13 | ADR-000 §1: "Một state, một nguồn sự thật" — all readers use same source | `ADR-000:22-26` | CONTRACT |
| 14 | ADR-000 §3: per-request state in AsyncLocalStorage, not on shared objects | `ADR-000:33` | CONTRACT |
| 15 | Fix C intent: "single source of truth — active requestId per session" | commit `31c40588` | INTENT |
| 16 | Fix C intent: "session with active task no longer creates duplicate checkpoint" | commit `31c40588` | INTENT |
| 17 | Fix C guard: `checkpointStore.start()` skipped if `activeTaskBySession` has entry | `engine.ts:806-809` | SOURCE |
| 18 | `activeTaskBySession` cleared on complete/failed | `checkpoint.ts:226-227,244-245` | SOURCE |

---

## 3. ADR-000 / FIX C INTENT

### ADR-000 intent

ADR-000 was created after 3 bugs all caused by the same root cause: state stored in multiple places with no single source of truth. Its 5 principles are:

1. **Single source of truth** — state stored in ONE place, derived/deduplicated centrally
2. **No boolean set-once flags** — use discriminated unions, recompute on demand
3. **Per-request state in AsyncLocalStorage** — not on shared singletons
4. **Model proposes transitions, code validates them**
5. **Structured evidence over model text**

ADR-000 does **NOT** define the relationship between Plan, Execution, and Checkpoint. It defines how state is stored and derived. The Plan/Execution/Checkpoint relationship was left undefined (section 5 explicitly says "Vòng đời Session... chưa có state machine tường minh").

### Fix C intent (commit 31c40588)

Fix C solved a specific problem: **after restart with an in-progress snapshot, a new user message would create a second checkpoint snapshot for the same session**. The old and new snapshots would both claim `activeTaskBySession[sessionId]`, creating ambiguity.

Fix C's solution:
- `activeTaskBySession` Map tracks which requestId is current per session
- On `loadFromDisk()`: rebuilt from in-progress snapshots (after dedup)
- On `start()`: set `activeTaskBySession[sessionId] → requestId`
- On `complete()`/`failed()`: clear `activeTaskBySession[sessionId]`
- On `processInner()`: guard `start()` by checking `activeTaskBySession` — if present, skip

**The intent was: "one checkpoint record per session at a time — don't create duplicates."**

**The bug is:** the guard skips `start()` but does NOT redirect checkpoint writes to use the old taskId. The old taskId becomes a zombie: it's in `activeTaskBySession` but checkpoint writes go to the new taskId. The old snapshot stays `in_progress` forever, and the new execution's cycles/status are silently lost.

### Assumptions in Fix C

| Assumption | Status | Evidence |
|------------|--------|----------|
| One active checkpoint per session | CORRECT | Intent stated in commit + ADR-000 §1 |
| Old taskId = same as new taskId | **WRONG** | engine.ts:761 generates fresh `Date.now()`-based ID |
| `checkpointRequestId` passed to `agent.run()` will match `start()` | **WRONG** | Skipped start() means no snapshot for agent's checkpointRequestId |
| Lifecycle of checkpoint = lifecycle of execution | **IMPLICIT, FALSE** | checkpoint survives restart, execution does not |
| Session has only one execution sequence | **IMPLICIT** | activeTaskBySession maps one session → one taskId — considers them semantically linked |

The assumption "checkpoint identity = execution identity" was not stated but is implicit in the code: `checkpointStore.start(taskId, ...)` then all subsequent mutations use `checkpointRequestId = taskId`, and Fix C guards `start()` but not the mutations. This is the identity mismatch.

---

## 4. SEMANTIC CONTRACT

| Entity | Identity | Lifetime | Persistent? | Owner | Purpose |
|--------|----------|----------|-------------|-------|---------|
| **Session** | `sessionId` (UUID, from SessionManager) | Conversation lifetime (TTL-managed, can be archived/switched) | YES (disk: SESSION_FILE + history) | SessionManager | Conversation context & identity for user interaction |
| **Plan** | `planId = plan-${sessionId}-${Date.now()}` | Until completed/failed/aborted; no TTL enforcement for running/pending | YES (in `CheckpointStore.plans[sessionId]` + embedded in snapshot) | CheckpointStore (plan Map via `setPlan/getPlan`) | Durable work intent — items, status, session ownership |
| **Execution** | `taskId = task-${Date.now()}` (generated per `processInner()` call) | Single `processInner()` → `agent.run()` call chain | NO (ephemeral in RequestContext) | Engine (processInner) + Agent (ReAct loop) | One runtime pass through the agent — calls model, executes tools, returns response |
| **CheckpointSnapshot** | `taskId` (same as Execution's taskId) | Until overwritten by same taskId or cleaned via `flush()`; terminal states (completed/failed) persisted permanently | YES (disk: `cp-{taskId}-{timestamp}.json`) | CheckpointStore | Record of one Execution's cycles, tool status, proven completions — NOT authoritative for Plan state |
| **PlanItem** | `index` within Plan | Lifetime of Plan | YES (as part of `TaskPlan.items[]`) | CheckpointStore (via Plan) | Per-item status, evidence of completion |
| **taskId (engine)** | `task-${Date.now()}` | Single processInner() call | NO | Engine | Runtime execution identity — used as checkpoint key |
| **requestId (engine)** | `sessionId` (same as sessionId) | Single processInner() call | NO | Engine | Runtime instrumentation label only (`R.*()` calls) |
| **RequestContext** | N/A (context carrier) | Single processInner() call (AsyncLocalStorage `run()` scope) | NO | Engine (created at processInner) | Per-request state: sessionId, taskId, evidenceLog, callbacks, abort signal |
| **EvidenceLog** | N/A (Map in RequestContext) | Single processInner() call | NO (in-memory only) | Engine (created at processInner) | SessionId-keyed evidence for tool completion — NOT persisted across executions |
| **activeTaskBySession** | `sessionId → taskId` | Same as underlying task/execution; cleared on complete/failed | YES (rebuilt from disk on load) | CheckpointStore | **INTENT:** "one active checkpoint record per session" — indicator that a checkpoint exists, NOT that an execution is live |

### Critical contract notes

- **Plan is NOT owned by CheckpointSnapshot.** `snapshot.plan` is a **copy** (mirror on `setPlan()`, checkpoint.ts:281-282). The authoritative Plan is in `this.plans.get(sessionId)`. Proof: `getPlan()` has `this.plans.get(sessionId)` BEFORE `getLatestForSession()?.plan` fallback.
- **CheckpointSnapshot belongs to an Execution** (indexed by taskId, which is per-execution). Multiple executions of the same Plan produce multiple snapshots.
- **No entity represents "the current execution status of a Plan."** Plan has status (running/pending/completed) but that's the plan's own lifecycle, not a pointer to an active execution.
- **`activeTaskBySession` is a checkpoint-lifespan indicator**, not a live-execution indicator. Its post-restart meaning is "a checkpoint record exists for this session."

---

## 5. CURRENT BUG: Identity Mismatch

### Mechanism

```
After restart:
  activeTaskBySession[sessionId] = "task-1728123456000"   (rebuilt from disk)

First message:
  new taskId = "task-1728199999000"                        (engine.ts:761)

  existingTaskId = getActiveTaskForSession(sessionId)
                 = "task-1728123456000"                     (checkpoint.ts:312-314)

  if (existingTaskId):                                      (engine.ts:806)
    checkpointStore.start() SKIPPED                         (engine.ts:809)
    → no snapshot created for "task-1728199999000"

  agent.run(checkpointRequestId = "task-1728199999000"):    (engine.ts:1040)
    checkpointStore.cycle("task-1728199999000", ...)        (agent.ts:1169)
      → this.snapshots.get("task-1728199999000") = undefined
      → returns early: silent no-op

    checkpointStore.complete("task-1728199999000", ...)     (engine.ts:1087)
      → snapshot not found → returns early: silent no-op

  OLD snapshot stays "in_progress" forever                 (no complete/failed written)
```

### Root cause

Fix C guards `checkpointStore.start()` but does NOT redirect `agent.run()`'s `checkpointRequestId` to the old taskId. All checkpoint mutations use the new taskId, which has no snapshot.

The guard and the execution identity are **inconsistent**: skip (uses old identity) vs write (uses new identity).

---

## 6. DESIGN COMPARISON

| Criterion | A — Rebind old taskId | B — New taskId + same Plan | C — Persistent Execution entity |
|-----------|----------------------|---------------------------|--------------------------------|
| Restart safety | Reuses old ID → avoids duplicate checkpoint | New taskId, Plan resume via prompt | New Execution ID, persisted separately |
| Crash recovery | Old snapshot updated → no data loss | EvidenceLog lost; Plan state survives | Full execution data survives |
| Auditability | Multiple executions conflated into one record | Clean separation per execution | Clean separation per execution |
| Plan persistence | Plan embedded in snapshot = OK | Plan stored separately by sessionId = OK | Plan stored separately = OK |
| Session independence | Session resumption brittle | Session can create new execution for any plan | Session can create new execution for any plan |
| Implementation complexity | LOW (one-liner: fix taskId generation) | MEDIUM (fix checkpointRequestId + snapshot writing) | HIGH (new type, storage, backfill, migration) |
| Compatibility with current code | High — minimal diff | Medium — changes to processInner() and checkpoint guards | Low — new entity touches engine, checkpoint, serialization |
| Compliance with ADR-000 §1 (single source of truth) | Yes, if rebinding correct | **YES** — Plan state already in separate Map | Tolerable but over-engineered |
| Compliance with ADR-000 §3 (per-request state ephemeral) | **VIOLATES** — old taskId is from different process | **COMPLIES** — new taskId per request | **COMPLIES** — new Execution ID per request |

### Recommendation: B over A and C

- **A is rejected** because it defeats auditability and conflates multiple runtime passes into one checkpoint record. It would make the assumption "checkpoint identity = execution identity" permanent rather than fixing it.
- **C is rejected** as over-engineered for current requirements. Plan state + checkpoint snapshots are sufficient evidence for resume (B1 option).
- **B is preferred** because it respects existing architecture: Plan is durable and separate, Execution is ephemeral, taskId is fresh per request. The only fix is to make the checkpoint write path consistent after restart.

---

## 7. MINIMUM CHANGE SURFACE

Conceptual components that need modification for Model B:

### 7a. Fix the identity mismatch (bug fix)

**Engine.processInnerScoped()**: After determining `existingTaskId`, the agent should use `existingTaskId` as the `checkpointRequestId` — not the new `taskId`. This means:
- `checkpointStore.start()` should NOT be skipped entirely — either it should be called with `existingTaskId` (to restart the cycle count) or `agent.run()` must receive `existingTaskId` as `checkpointRequestId` so checkpoint writes target the existing snapshot.

### 7b. `activeTaskBySession` semantic contract

After Model B, `activeTaskBySession` means: **"this session has a checkpoint record that can be written to."** It does NOT mean "execution is alive." This contract must be enforced:
- After restart, writing to old checkpoint via existingTaskId is CORRECT — the new execution is recording its evidence under the existing snapshot.
- The snapshot is an Execution record, but multiple executions of the same Plan CAN share the same snapshot record (if we treat it as "latest execution attempt").

**Alternative:** Allow multiple snapshots per session (lift the Fix C guard) and let `getLatestForSession()` do the dedup. This changes the semantics to "each attempt gets its own snapshot."

### 7c. `EvidenceLog` persistence for cross-execution

EvidenceLog is currently per-execution (in-memory). For continuation across executions (normal message → next message, not just restart), evidence of completed items needs to survive somewhere.

Options:
- Copy evidence to PlanItem on `complete_item` (already happens: `item.resultSummary`)
- Persist evidence alongside Plan (extend `TaskPlan` with evidenceMap)

### 7d. Plan state for stale `running`/`pending`

After restart, a Plan with `status='running'` is potentially stale (no execution). Consider:
- On restart, stale `running`/`pending` Plans should be left as-is (the LLM will discover them via prompt and decide)
- `activeTaskBySession` should NOT imply the old execution is still alive — it only means "existing checkpoint record"

### 7e. Remove implicit identity conflation

Fix the assumption that `taskId = checkpointRequestId` is the same across restart. This requires either:
- Always write to the `existingTaskId` (if guard fires) — simplest fix
- OR allow multiple snapshots per session — cleaner but more change

### Files that would change

| File | Role | Change |
|------|------|--------|
| `src/core/engine/engine.ts` | Entry point | Fix `checkpointRequestId` after restart, fix `start()` guard |
| `src/core/checkpoint.ts` | Checkpoint store | May need multiple-snapshot support or explicit roll semantics |
| `src/core/plan/types.ts` | Plan type | May need evidence-for-items storage |
| `tests/` | Tests | New tests for restart-continuity contract |

---

## 8. UNRESOLVED QUESTIONS

| # | Question | Status |
|---|----------|--------|
| 1 | Should one Plan allow multiple concurrent CheckpointSnapshots? | Open. Current code: Fix C prevents this. Model B: not needed, but clean. |
| 2 | Does `EvidenceLog` need persistence across Execution boundaries? | **YES for continuation** (Plan needs its durable evidence for `complete_item` after restart). **NO for single Execution** (in-memory is fine). |
| 3 | What writes the first checkpoint for a resumed Plan after restart? | If we reuse old taskId → old snapshot gets new cycles. If we create new snapshot → execution state is recorded twice. The choice determines the answer. |
| 4 | After restart + first message completes, should the old `in_progress` snapshot become `completed`? | Yes — from the user's perspective, the work resolved. But which taskId should be marked completed? The old one (never received results) or new one (has no snapshot)? |
| 5 | Should `activeTaskBySession` be removed? | Not necessarily — but its semantic meaning must be refined to avoid ambiguity. |
| 6 | Does `checkpointStore.cycle()` need to work on non-existent snapshot (create it)? | Current behavior: silent no-op. Better: fail loudly to catch mismatches. |
| 7 | Should `getPlan()` on session load rebuild `this.plans` from snapshots? | Currently `this.plans` stays empty after restart — the fallback works but is fragile. Explicit rebuild would be clearer. |

These must be resolved before implementation.

---

## 9. IMPLEMENTATION GATES

Before any code change, the following architecture decisions must be frozen:

### Gate 1 — Checkpoint snapshot per-execution or per-session?

**Decision needed:** Does a resumed Plan create a new CheckpointSnapshot, or append to the existing one?

- **Append to existing** (simpler, less data): old taskId reused, existing snapshot gets new cycles. Pro: no orphaned snapshots, single record per session plan timeline.
- **New snapshot** (cleaner audit trail): each execution attempt gets its own snapshot. Pro: full history, crash mid-way leaves original snapshot intact. Con: duplicate/overlapping snapshots for same session.

### Gate 2 — `checkpointRequestId` after restart

**Decision needed:** Should `agent.run()` receive `existingTaskId` or the new `taskId`?

- **existingTaskId**: checkpoint writes target the old snapshot. This is the minimal fix.
- **new taskId + remove guard**: let start() create a second snapshot for the same session and rely on `getLatestForSession()` for dedup.

### Gate 3 — EvidenceLog scope

**Decision needed:** Is `EvidenceLog` per-Execution or per-Plan?

- **Per-Execution** (current): in-memory, lost on restart. `complete_item` fails after restart because evidence is empty. LLM must re-execute tools.
- **Per-Plan** (proposed for Model B): evidence stored in Plan durable state. `complete_item` can check historical evidence. Safer continuation.

### Gate 4 — `activeTaskBySession` semantics

**Decision needed:** What does `activeTaskBySession` mean post-restart?

- Option 1: "a checkpoint record exists" (evidence indicator only)
- Option 2: "an execution is in-progress" (would be false after restart — needs clearing)
- Option 3: "the session has uncompleted plan work" (mixes Plan and Checkpoint concepts)

Option 1 is correct for current source. Option 2 requires clearing on restart (add `loadFromDisk()` cleanup for stale taskIds). Option 3 confuses Plan lifecycle with Checkpoint lifecycle.

### Gate 5 — Stale `running` status handling

**Decision needed:** Should Plans with `status='running'` be auto-adjusted after restart?

- Option 1: Leave as-is (current behavior) — LLM handles via context.
- Option 2: On restart load, mark all `running`/`pending` Plans as `paused` — honest state.
- Option 3: Add a `recoveredAtBoot` annotation to Plan (similar to snapshot recovery note).

### Gate 6 — Checkpoint write failure behavior

**Decision needed:** What should happen when `cycle()`/`complete()`/`failed()` find no snapshot?

- Option 1: Silent no-op (current) — hides bugs.
- Option 2: Throw/log loudly — catches identity mismatch immediately.
- Option 3: Create snapshot on-the-fly — self-healing but hides design issues.

---

## 10. ACTIVE ≠ ALIVE (critical)

### Evidence of conflation

The guard at `engine.ts:806`:

```typescript
const existingTaskId = this.checkpointStore.getActiveTaskForSession(sessionId);
if (existingTaskId) {
  log.warn(`[Engine] Session ${sessionId} already has active task ${existingTaskId} — reusing, skipping duplicate creation`);
} else {
  this.checkpointStore.start(taskId, sessionId, ...);
}
```

The log message says "reusing" but the code does NOT actually reuse — it just skips `start()`. The agent receives a different taskId. This is a **conflation of "active checkpoint" with "active execution."**

The comment at `checkpoint.ts:148`:

```typescript
// Fix C: this requestId is now the active task for the session
```

This says "active task", not "active execution" or "active checkpoint" — ambiguous wording.

### All affected locations

| File:Line | Code | Problem |
|-----------|------|---------|
| `engine.ts:806-809` | Guard on `getActiveTaskForSession()` | Conflates "has checkpoint" with "has execution" — skips start() without redirecting writes |
| `checkpoint.ts:148-149` | `start()` sets `activeTaskBySession` | Name suggests execution tracking, actually checkpoint tracking |
| `checkpoint.ts:226-227` | `complete()` clears `activeTaskBySession` | Correctly clears when checkpoint is terminal — but name implies execution ended |
| `checkpoint.ts:406-413` | `loadFromDisk()` rebuilds `activeTaskBySession` | Post-restart, sets "active" for snapshots that have no live execution — makes `activeTaskBySession` a checkpoint-records indicator, not an execution indicator |

### Semantic gap

The word "active" in `activeTaskBySession` is ambiguous: it means "active checkpoint record" but reads as "active execution." After restart, this misleads.

---

## 11. CHECKPOINT GROUND TRUTH

### Does checkpoint treat snapshot state as ground truth of the external world?

**No.** Source evidence:

- `checkpoint.ts:506-516` — `getProvenCompletedToolIds()` enumerates toolStatus from cycles. This is execution evidence, not external-world verification.
- `agent.ts:1100-1120` — EvidenceLog records tool results. Results may reflect an API call that succeeded at T0 but the external state may have changed by T1.
- `engine.ts:996-1010` — `handleCycleLimit()` pauses the plan. The plan status is a lifecycle state, not a claim about external world.

There is **no code** in Plan/Engine that revalidates external state against checkpoint claims. The only revalidation that exists is `checkGoalDrift()` (agent.ts:1072-1081) which compares LLM output against task goal — not checkpoint against reality.

This is correct for a checkpoint system: checkpoint records what happened, not what the world currently looks like. Any resumption logic must treat checkpoint state as **historical** — not authoritative about the current world.

---

## 12. SESSION TTL AND PLAN COUPLING

### Source-backed coupling

SessionManager (`session-manager.ts`) and CheckpointStore (`checkpoint.ts`) are **completely independent subsystems**:
- SessionManager tracks `userId → SessionState` (TTL = 15min, disk persistence)
- CheckpointStore tracks `sessionId → TaskPlan` + `taskId → CheckpointSnapshot`
- No cross-reference exists: Session expiry doesn't signal CheckpointStore
- `getPlan(sessionId)` works regardless of whether Session is expired or active
- Session expiry does not delete or modify Plans

**Current de facto coupling:** Plans are keyed by `sessionId` in `CheckpointStore.plans`. If Session A is /new'd, Session B has new sessionId → `getPlan(newSessionId)` returns null. Plan is "orphaned" but still exists under old sessionId.

**Architectural separation is already correct.** Session TTL and Plan lifecycle are separate. The only coupling point is the key (`sessionId`) used for Plan lookup — which is a data association, not lifecycle coupling. Model B reinforces this separation: Session owns conversation, Plan owns work, Execution owns runtime.

---

## 13. SUMMARY TABLE

| Concept | Current behavior | Model B target | Gap |
|---------|-----------------|---------------|-----|
| Plan | Durable, sessionId-keyed, status persists | Same | Fine |
| Execution | Per-processInner, alive via agent.run(), dies on return | Same — ephemeral | Fine |
| Checkpoint | Keyed by processInner taskId | Keyed by same (or per-session) | Need fix: after restart, writes miss target |
| EvidenceLog | In-memory, per execution | Per Plan for durability | Need to persist at Plan level |
| activeTaskBySession | Blocks duplicate checkpoint creation | Checkpoint-lifespan indicator only | Need rename/clarify + fix guard |
| Post-restart checkpoints | Silent no-op on writes | Must work (write to existing or create new) | Bug to fix |