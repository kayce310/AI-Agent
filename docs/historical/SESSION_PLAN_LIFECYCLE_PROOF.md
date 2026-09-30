# SESSION/PLAN LIFECYCLE PROOF

## 1. Executive Summary

Session TTL (15 min) and Plan `abandonAfterMs` (2h) are **independent timers** with **no coupling in runtime code**. Session expiry moves the old session to history and creates a new sessionId. The Plan remains keyed to the *old* sessionId in `CheckpointStore.plans` indefinitely — `abandonAfterMs` is only partially enforced (paused/waiting plans only). The new sessionId cannot auto-recover the orphaned Plan. `/switch` can restore visibility by resurrecting the old sessionId.

**Verdict: PROVEN** — Session TTL expiry can orphan an active Plan under old sessionId, invisible to the new session until `/switch`.

---

## 2. Session TTL Trace

### SessionManager: TTL definition

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   53
SYMBOL: TTL_MS = 15 * 60 * 1000
INPUT:  constructor time constant
OUTPUT: 900000 ms (15 min)
```

### TTL check — isExpired()

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   293-295
SYMBOL: isExpired(session)
INPUT:  session.lastActivity
OUTPUT: boolean
CONDITION: Date.now() - session.lastActivity > this.TTL_MS
```

### Entry point — getOrCreateSession()

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   98-116
SYMBOL: getOrCreateSession(userId)
INPUT:  userId (string)
OUTPUT: SessionState

FLOW:
  102: existing = this.sessions.get(userId)
  102-106: if existing AND isExpired(existing):
    103:   addToHistory(userId, existing)    → archived to sessionHistory
    104:   this.sessions.delete(userId)      → removed from active
    105:   return createNewSession(userId)   → NEW sessionId (randomUUID)
  107-108: if !existing: createNewSession(userId)
  110-112: else: update lastActivity, return existing
```

### createNewSession() — new UUID every time

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   121-134
SYMBOL: createNewSession(userId)
INPUT:  userId
OUTPUT: SessionState { sessionId: asConversationSessionId(randomUUID()), ... }
KEY:    Every new session gets a fresh UUID → different from previous sessionId.
```

### cleanup() — periodic sweep

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   300-320
SYMBOL: cleanup()
FREQ:   every 10 min (line 62)
FLOW:
  304-308: iterate this.sessions, identify expired
  311-316: for each expired: addToHistory() + sessions.delete()
```

### archiveSession() — explicit /new

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   143-154
SYMBOL: archiveSession(userId)
FLOW:
  146-148: existing → addToHistory(userId, existing)
  150:     createNewSession(userId)
```

### Session persistence — save() / load()

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   362-403

save():  writes {active, history} to SESSION_FILE (temp/coral-sessions.json)
load():
  382-384: active sessions filter out expired via isExpired()
  386-391: history sessions loaded as-is (NO expiry check on history)
```

### Summary: Session TTL lifecycle

| Step | Action | Evidence |
|------|--------|----------|
| TTL=15min | Line 53: `TTL_MS` constant | FACT |
| Expired check | Line 293-295: `isExpired()` | FACT |
| Expired → archive + new sessionId | Line 102-106: `addToHistory()`, `sessions.delete()`, `createNewSession()` | FACT |
| New sessionId is fresh UUID | Line 122-123: `randomUUID()` | FACT |
| Old session in history | Line 103: `addToHistory()` pushes to `sessionHistory` map | FACT |

---

## 3. Plan Lifetime Trace

### TaskPlan: abandonAfterMs is a DECLARATION

```
FILE:   src/core/plan/types.ts
LINE:   71
SYMBOL: TaskPlan.abandonAfterMs
VALUE:  number (default 2 * 60 * 60 * 1000 = 7200000 ms = 2 hours)
```

### DEFAULT_ABANDON_MS

```
FILE:   src/core/plan/types.ts
LINE:   77
SYMBOL: DEFAULT_ABANDON_MS
VALUE:  2 * 60 * 60 * 1000 = 7200000 ms
```

### Where abandonAfterMs is SET

```
FILE:   src/core/plan/update-plan-tool.ts
LINE:   141
SYMBOL: create action handler
INPUT:  sessionId, items
OUTPUT: new TaskPlan { ..., abandonAfterMs: DEFAULT_ABANDON_MS }
```

### Where abandonAfterMs is READ

#### ALL usages of `abandonAfterMs` in runtime code:

```
FILE:   src/core/checkpoint.ts
LINE:   477
SYMBOL: flush() — TTL cleanup loop
LINE:   471-481

if (plan.status !== 'paused_limit' && plan.status !== 'waiting_user') continue;
if (nowMs - plan.createdAt <= plan.abandonAfterMs) continue;
plan.status = 'aborted';
plan.stopReason = 'ttl_expired';
```

**CRITICAL FINDING:** `abandonAfterMs` is ONLY enforced for two plan statuses: **`paused_limit`** and **`waiting_user`**.

For all other statuses (`pending`, `running`, `completed`, `failed`, `aborted`), **the entire block is SKIPPED at line 476**.

This means:
- **`pending` and `running` plans NEVER auto-expire** via `abandonAfterMs`
- **`completed`, `failed`, `aborted` plans** also never expire (they sit forever)
- The "2h TTL" claim only applies to paused/waiting plans

### Other abandonAfterMs usages — declaration only, NOT enforced at runtime:

```
FILE:   src/core/plan/types.ts        LINE: 71   — field declaration
FILE:   src/core/plan/update-plan-tool.ts LINE: 141 — field set at creation
```

These are **NOT enforcement** — just declaration/setting.

### Plan storage — CheckpointStore

```
FILE:   src/core/checkpoint.ts
LINE:   103-105
SYMBOL: CheckpointStore constructor
OBJECT: this.plans = new Map<string, TaskPlan>();  // keyed by sessionId
```

```
FILE:   src/core/checkpoint.ts
LINE:   278-285
SYMBOL: setPlan(sessionId, plan)
ACTION: this.plans.set(sessionId, plan);
        snapshot = getLatestForSession(sessionId);
        if (snapshot) snapshot.plan = plan;
```

```
FILE:   src/core/checkpoint.ts
LINE:   290-292
SYMBOL: getPlan(sessionId)
RETURN: this.plans.get(sessionId) ?? this.getLatestForSession(sessionId)?.plan ?? null
```

### No Plan deletion mechanism exists

There is NO code that removes a Plan from `this.plans` map except process restart (in-memory map reset). `flush()` aborts paused/waiting plans but does NOT delete them from the map. `complete()`/`failed()` clear `activeTaskBySession` but NOT the plans map.

### Summary: Plan lifetime

| Aspect | Evidence | Status |
|--------|----------|--------|
| abandonAfterMs = 2h declared | types.ts:71,77 | FACT |
| abandonAfterMs enforced for paused/waiting | checkpoint.ts:471-481 | FACT (PARTIAL) |
| abandonAfterMs enforced for running/pending | checkpoint.ts:476 — skipped | **NOT ENFORCED** |
| Plan removal from `this.plans` map | No code found | **NOT ENFORCED** |
| Plan persist in checkpoint snapshots | flush(): plans mirrored to snapshot | FACT |

---

## 4. Restart/Recovery Trace

### loadFromDisk()

```
FILE:   src/core/checkpoint.ts
LINE:   348-417
SYMBOL: loadFromDisk()
INPUT:  reads cp-*.json files from checkpointDir
OUTPUT: rebuilds this.snapshots map

FLOW:
  350-364: read all cp-*.json files, deserialize into this.snapshots (keyed by requestId)
  383-403: Fix B: deduplicate in-progress snapshots per sessionId
  406-414: Build activeTaskBySession from in-progress snapshots
```

**IMPORTANT: Plans are NOT independently persisted.** Plans live inside `CheckpointSnapshot.plan` field (line 71 in CheckpointSnapshot type). So on restart:
- Snapshots are loaded from disk
- `getLatestForSession()` searches `this.snapshots` by sessionId
- `getPlan(sessionId)` falls back to `getLatestForSession(sessionId)?.plan`
- Only works if the snapshot's `sessionId` matches the requested sessionId

### Engine init — recovery

```
FILE:   src/core/engine/engine.ts
LINE:   322-351
SYMBOL: Engine.init()
FLOW:
  333: recovered = checkpointStore.getAllInProgress()
  334-348: for each in-progress cp → markRecovered(), log
  350: if recovered > 0 → flushSync()
```

After restart, the same sessionId must be used to recover plans. Since `session-manger.ts` is a separate subsystem loaded from disk, it would restore sessions from SESSION_FILE.

### SessionManager.load() post-restart

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   373-403

load():
  381-384: active sessions → filter out expired via isExpired()
  386-391: history sessions → load as-is (NO expiry check)
```

**After restart**, sessions in history are loaded with their original sessionId. If the user messages again:
- `getOrCreateSession()` checks `sessions.get(userId)` — if no active session exists (expired), creates new sessionId
- So the old sessionId lives in history, but active gets a new one

### Plan recovery after restart

```
FILE:   src/core/engine/engine.ts
LINE:   805-810
SYMBOL: processInnerScoped()
INPUT:  sessionId
FLOW:
  805:   existingTaskId = checkpointStore.getActiveTaskForSession(sessionId);
  806-807: if existingTaskId → log reuse, skip duplicate creation
  808-809: else → checkpointStore.start(taskId, sessionId, ...)
```

If the sessionId matches an in-progress checkpoint (restored from disk), the engine reuses it. But only if the SAME sessionId is passed through.

### Summary: Restart/Recovery

| Step | Evidence | Status |
|------|----------|--------|
| Checkpoints persist to disk | checkpoint.ts:348-417 | FACT |
| Sessions persist to disk | session-manager.ts:362-403 | FACT |
| Plans embedded in snapshots | CheckpointSnapshot.plan field | FACT |
| Plan recovered if sessionId matches | getPlan(sessionId) → getLatestForSession(sessionId)?.plan | FACT |
| After expiry, NEW sessionId → no match | createNewSession() → randomUUID() | FACT |
| After restart, new active sessionId | load() + getOrCreateSession() | FACT |

---

## 5. Critical Scenario: 15m → 2h

### Scenario walkthrough with source evidence

```
T0:
Session A = sessionId_A
  → SessionManager.createNewSession(userId)
  → file: session-manager.ts:121-134
  → this.sessions.set(userId, session) with sessionId_A

T1:
A creates Plan P
  → update_plan(action='create')
  → checkpointStore.setPlan(sessionId_A, plan)
  → file: checkpoint.ts:278-285
  → this.plans.set('sessionId_A', plan)

T2:
P is active (status = 'running')
  → plan stored in memory, keyed by sessionId_A

T3:
15+ minutes without activity
  → isExpired(session) returns true
  → file: session-manager.ts:293-295

T4:
SessionManager considers A expired
  → getOrCreateSession(userId) called on next message
  → file: session-manager.ts:102-106
  → addToHistory(userId, session_A)  → archived under sessionId_A
  → sessions.delete(userId)           → sessionId_A removed from active
  → createNewSession(userId)          → new randomUUID = sessionId_B

T5:
User sends new message
  → triggers message handler → getOrCreateSession()

T6:
new Session B = sessionId_B
  → sessionManager.sessions.get(userId) now returns sessionId_B

T7:
P is still within its 2-hour lifetime
  → abandonAfterMs = 7200000 ms (2h)
  → createdAt + 7200000 > Date.now() — not yet expired

T8:
What does runtime do?

  getPlan(sessionId_B) ?
    → CheckpointStore.getPlan(sessionId_B)
    → file: checkpoint.ts:290-292
    → this.plans.get('sessionId_B') → undefined (Plan stored under sessionId_A)
    → getLatestForSession('sessionId_B')?.plan → null
      (no checkpoint snapshot has sessionId = sessionId_B)
    → **RETURNS null**
    → **Plan P is invisible to Session B**

  getPlan(sessionId_A) ?
    → CheckpointStore.getPlan(sessionId_A)
    → this.plans.get('sessionId_A') → Plan P
    → **RETURNS Plan P**
    → **Plan P is still alive and accessible via sessionId_A**
```

### Result

| Question | Answer | Evidence |
|----------|--------|----------|
| Is Plan P deleted? | **NO** | No code deletes plans from `this.plans` map |
| Is Plan P retained? | **YES** | In `CheckpointStore.plans` under `sessionId_A`, and in checkpoint snapshot on disk |
| Is Plan P abandoned? | **NO** | `abandonAfterMs` only checked for `paused_limit`/`waiting_user` — Plan P is `running`, so the TTL loop skips it (checkpoint.ts:476) |
| Is Plan P recoverable? | **YES** — via `/switch` or direct `getPlan(sessionId_A)` | |
| Is Plan P invisible to B? | **YES** | `getPlan(sessionId_B)` returns null — different key |

---

## 6. `/switch` Trace

### switchSession()

```
FILE:   src/platform/telegram/session-manager.ts
LINE:   159-181
SYMBOL: switchSession(userId, sessionId)
INPUT:  userId, sessionId (the OLD sessionId we want to restore)
FLOW:
  162:   history = this.sessionHistory.get(userId) || []
  163:   idx = history.findIndex(s => s.sessionId === sessionId ...)
  164:   if idx === -1 return null  → not found
  166:   target = history.splice(idx, 1)[0]   → remove from history
  168-170: current = this.sessions.get(userId)
            if (current) addToHistory(userId, current)  → archive current to history
  173-175: target.lastActivity = Date.now()
           this.sessions.set(userId, target)   → restore as active
  176:   save()
  177:   return target
```

### Plan visibility after `/switch`

After `/switch sessionId_A`:
- `sessionId_A` is restored as the active session for `userId`
- `this.sessions.get(userId)` returns session with `sessionId_A`
- This sessionId flows through to `Gateway.handleAdapterMessage()` as `msg.metadata.sessionId`
- Engine receives `request.sessionId = sessionId_A`
- `checkpointStore.getPlan(sessionId_A)` → **returns Plan P**
- Plan P is included in LLM prompt via planContext

### Plan reaches LLM context

```
FILE:   src/core/llm/prompt-builder.ts
LINE:   333-336
SYMBOL: Tầng 7: PLAN section
INPUT:  input.planContext (string)
EVIDENCE: sections.push(input.planContext);
```

Plan context is injected by Engine when `hasActivePlan(sessionId)` returns true (checkpoint.ts:298-305).

### Summary: `/switch` trace

| Step | File:Line | Status |
|------|-----------|--------|
| find sessionId in history | session-manager.ts:162-163 | FACT |
| splice from history | session-manager.ts:166 | FACT |
| archive current, restore target | session-manager.ts:168-175 | FACT |
| restored sessionId matches Plan key | sessionId_A = sessionId_A | FACT |
| getPlan(sessionId_A) returns Plan P | checkpoint.ts:290-292 | FACT |
| Plan injected into LLM context | prompt-builder.ts:333-336 | FACT |

---

## 7. Three-State Distinction

### A. Session expired (SessionManager)

```
State:   SessionState removed from this.sessions map
Action:  addToHistory(), sessions.delete(), createNewSession()
Storage: old sessionId preserved in sessionHistory (in-memory + disk)
Effect:  next getOrCreateSession() returns new sessionId
```

### B. Plan expired/abandoned (CheckpointStore / TaskPlan)

```
State:   Plan.status set to 'aborted' by TTL enforcement
Trigger: flush() — ONLY for paused_limit/waiting_user past abandonAfterMs
Running/pending plans: NOT ENFORCED
Effect:  Plan stays in this.plans map, status changes to 'aborted'
```

### C. Plan inaccessible (current sessionId mismatch)

```
State:   Plan exists in this.plans under oldSessionId
Trigger: Session expired → new sessionId created
Effect:  getPlan(newSessionId) = null
         getPlan(oldSessionId) = Plan P (still alive)
Recovery: /switch oldSessionId → getPlan(oldSessionId) works
```

### Summary table

| State | Managed by | Condition | Duration | Plan still exists? |
|-------|-----------|-----------|----------|---------------------|
| Session expired | SessionManager | 15min inactivity | Until next message creates new session | YES (under old sessionId) |
| Plan expired | CheckpointStore.flush() | paused/waiting + >2h old | N/A (only partial) | YES (status=aborted) |
| Plan inaccessible | N/A (architectural gap) | sessionId mismatch | Until /switch or new session | YES (under old sessionId) |

---

## 8. Evidence Matrix

| Claim | Classification | Evidence |
|-------|----------------|----------|
| Session TTL = 15 minutes | **FACT** | `session-manager.ts:53`: `TTL_MS = 15 * 60 * 1000` |
| Plan abandonAfterMs = 2 hours | **FACT** | `types.ts:71,77`: `abandonAfterMs`, `DEFAULT_ABANDON_MS = 2 * 60 * 60 * 1000` |
| abandonAfterMs thực sự được enforce | **PARTIAL (paused/waiting only)** | `checkpoint.ts:476-478`: skip for running/pending plans |
| Session expiry tạo sessionId mới | **FACT** | `session-manager.ts:105,122-123`: `asConversationSessionId(randomUUID())` |
| Old Plan vẫn tồn tại sau Session expiry | **FACT** | `checkpoint.ts:105`: `this.plans` not cleared — `flush()` does not delete plans |
| New Session không tự recover old Plan | **FACT** | `checkpoint.ts:290-292`: `getPlan(newSessionId)` search by sessionId — old key doesn't match |
| `/switch oldSessionId` recover old Plan | **FACT** | `session-manager.ts:159-181` restores sessionId; `checkpoint.ts:290-292` finds plan by matching sessionId |
| Old Plan có thể trở lại LLM context sau `/switch` | **FACT** | `engine.ts` → `hasActivePlan(target.sessionId)` → `prompt-builder.ts:333-336` injects planContext |

---

## 9. Final Conclusion

```
PROVEN:
Session TTL expiry can leave an active Plan orphaned under the old sessionId,
while the new sessionId cannot automatically access it.

Additions to the original inference:

1. abandonAfterMs is NOT a runtime timer for all plans — only paused/waiting
   plans are affected by the TTL sweep. Running/pending plans never auto-expire.

2. Orphaned plans are fully recoverable via /switch, because:
   - switchSession() restores the old sessionId to active
   - getPlan() matches by sessionId — the Plan is still in the map

3. There is NO code that evicts a Plan from CheckpointStore.plans
   when the source Session is expired. The two subsystems are decoupled.
```