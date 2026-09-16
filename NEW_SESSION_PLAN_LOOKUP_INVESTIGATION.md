NEW SESSION PLAN LOOKUP INVESTIGATION
Evidence-based code analysis
Time: 2026-09-11

════════════════════════════════════════════════════════════════
SCENARIO: Plan đang chạy → Ctrl+C → restart → TẠO SESSION MỚI
════════════════════════════════════════════════════════════════

Three distinct flows:
A) Same sessionId after restart
B) Completely NEW sessionId
C) User explicitly requests old Plan

════════════════════════════════════════════════════════════════
Q1: Khi session mới được tạo, Coral lấy Plan từ đâu?
════════════════════════════════════════════════════════════════

ENTRY POINT (engine.ts:780-795):
```
const sessionId = request.sessionId || 'default';
const existingActiveCheckpointId = this.checkpointStore.getActiveTaskForSession(sessionId);
if (existingActiveCheckpointId) {
  checkpointRequestId = existingActiveCheckpointId;
  log.info(`[Engine] Resuming session ${sessionId} with existing checkpoint...`);
} else {
  checkpointRequestId = taskId; // NEW checkpoint
  log.info(`[Engine] Starting new execution for session ${sessionId}...`);
}
```

FLOW FOR NEW SESSION:
1. sessionId = unique value (NOT matching any previous sessionId)
2. getActiveTaskForSession(sessionId) returns null
   - Reason: activeTaskBySession is Map<sessionId → checkpointRequestId>
   - New sessionId has no entry
3. checkpointRequestId = taskId (brand new)
4. checkpointStore.start() creates NEW checkpoint

PLAN LOOKUP (engine.ts:902-917):
```
const planState = derivePlanState(this.checkpointStore, sessionId);
const existingPlan = isGuardActive(planState) 
  ? this.checkpointStore.getPlan(sessionId) 
  : null;
```

getPlan SOURCE (checkpoint.ts:433-435):
```
getPlan(sessionId: string): TaskPlan | null {
  return this.plans.get(sessionId) 
    ?? this.getLatestForSession(sessionId)?.plan 
    ?? null;
}
```

getLatestForSession LOOKUP (checkpoint.ts:472-482):
```
getLatestForSession(sessionId: string): CheckpointSnapshot | null {
  let latest: CheckpointSnapshot | null = null;
  for (const snapshot of this.snapshots.values()) {
    if (snapshot.sessionId !== sessionId) continue;  // ← CRITICAL: SAME sessionId ONLY
    if (snapshot.status === 'completed' || snapshot.status === 'failed') continue;
    if (!latest || snapshot.startedAt > latest.startedAt) {
      latest = snapshot;
    }
  }
  return latest;
}
```

ANSWER Q1:
✅ Plan retrieved from:
  1. this.plans.get(sessionId) — in-memory session→Plan map
  2. OR this.getLatestForSession(sessionId)?.plan — latest checkpoint for THIS sessionId
  3. OR null — no Plan exists

KEY: getLatestForSession filters by `snapshot.sessionId !== sessionId` 
  → CANNOT retrieve Plan from different sessionId

════════════════════════════════════════════════════════════════
Q2: getPlan(sessionId) có thể lấy Plan của session khác không?
════════════════════════════════════════════════════════════════

ANSWER: ❌ NO

EVIDENCE:
- checkpoint.ts:434 — getPlan(sessionId) calls getLatestForSession(sessionId)
- checkpoint.ts:475 — getLatestForSession filters: `if (snapshot.sessionId !== sessionId) continue;`
- This filter SKIPS all snapshots with different sessionId
- Only snapshots matching EXACT sessionId are considered

CODE ENFORCEMENT:
```
for (const snapshot of this.snapshots.values()) {
  if (snapshot.sessionId !== sessionId) continue;  // ← Skip other sessions
  ...
}
```

CONCLUSION: ❌ IMPOSSIBLE to retrieve Plan from different sessionId via getPlan()

════════════════════════════════════════════════════════════════
Q3: History/checkpoint lookup có cơ chế khiến Plan cũ được đưa vào 
session mới không?
════════════════════════════════════════════════════════════════

ANSWER: ❌ NO automatic mechanism

EVIDENCE 1 — No cross-session lookup:
- search_files shows NO functions: restorePlan, inheritPlan, migrateSession, transferPlan
- Only explicit cross-session tool: session_search (knowledge.ts:140-150)
  - Requires user to EXPLICITLY call with allSessions=true
  - Does NOT automatically fetch Plans

EVIDENCE 2 — Checkpoint.ts isolation:
- checkpoint.ts:472-482 — getLatestForSession filters by sessionId only
- checkpoint.ts:416-428 — setPlan stores only in this.plans[sessionId] + active snapshot
- No cross-session copy mechanism

EVIDENCE 3 — No implicit inheritance in engine.ts:
- engine.ts:902-917 — Admission gate checks:
  ```
  const planState = derivePlanState(this.checkpointStore, sessionId);
  const existingPlan = isGuardActive(planState) 
    ? this.checkpointStore.getPlan(sessionId) 
    : null;
  ```
  - Only queries SAME sessionId
  - No fallback to other sessions

EVIDENCE 4 — Boot recovery (engine.ts:333-351):
- getAllInProgress() returns ALL in-progress checkpoints
- Each marked recovered but NOT injected into new sessions
- Only surfaces logs, doesn't contaminate

CONCLUSION: ❌ NO automatic mechanism to bring Plan from old session to new

════════════════════════════════════════════════════════════════
Q4: Nếu session mới hỏi về Plan cũ, runtime hiện tại có cơ chế 
nào để tìm Plan/execution cũ không?
════════════════════════════════════════════════════════════════

ANSWER: ✅ YES, but REQUIRES EXPLICIT USER ACTION

MECHANISM 1 — session_search tool (knowledge.ts:140-150):
```
name: 'session_search',
description: 'Search conversation history. 
  Pass allSessions=true to search across all sessions',
allSessions: { type: 'boolean', 
  description: 'Set true to search across ALL sessions' }
```
- User or Agent can call: session_search(query="...", allSessions=true)
- Returns conversation history from OTHER sessions
- Does NOT auto-import Plan, only retrieves conversation logs

MECHANISM 2 — consequence-store cross-session aggregation (consequence-store.ts):
```
// Records cùng tool trong window (cross-session) — source for failCountWindow
// failCountWindow: fail/rejected trong window (cross-session)
```
- Cross-session aggregation exists for TOOL FAILURE COUNTS
- Used for Recovery policy (e.g., "too many failures across sessions")
- Does NOT import Plans

MECHANISM 3 — Memory store (memory/consequence-types.ts:91):
```
// for future cross-session aggregation (Phase 3+)
```
- Phase 3+ feature, NOT implemented yet
- No current mechanism

WHAT'S MISSING:
- ❌ NO automatic Plan discovery across sessions
- ❌ NO explicit "restore from old session" command for Plans
- ❌ NO Plan suggestion/recommendation based on old sessions

WHAT WORKS:
- ✅ session_search can find old conversation
- ✅ User can read old execution details
- ✅ User can MANUALLY describe goal to model
- ✅ Model can re-plan from scratch OR use recovered info

CONCLUSION: ✅ YES, explicit search exists; ❌ NO automatic Plan transfer

════════════════════════════════════════════════════════════════
Q5: Có implicit inheritance (kế thừa ngầm) nào giữa session mới 
và Plan cũ không?
════════════════════════════════════════════════════════════════

ANSWER: ❌ NO implicit inheritance

EVIDENCE 1 — Explicit sessionId boundary (engine.ts:788):
```
const existingActiveCheckpointId = this.checkpointStore.getActiveTaskForSession(sessionId);
```
- Uses request.sessionId ONLY
- No fallback to "find any active checkpoint"

EVIDENCE 2 — Admission gate explicit (engine.ts:902-917):
```
const planState = derivePlanState(this.checkpointStore, sessionId);
const existingPlan = isGuardActive(planState) 
  ? this.checkpointStore.getPlan(sessionId) 
  : null;

if (existingPlan) {
  assignedPlanId = existingPlan.id;
  log.info(`[Engine] Task admitted to existing plan ${assignedPlanId}`);
}
```
- Checks planState for THIS sessionId
- Only admits if Plan is active AND exists for THIS session
- No inheritance from other sessions

EVIDENCE 3 — Memory recall scoped (engine.ts:867-870):
```
const memoryBlocks = await globalMemoryStore.query(userMessage, {
  topK: 10,
  sessionId,  // ← SCOPED to current session by default
  sourceTypes: ['user', 'web', 'cron', 'legacy']
});
```
- Memory recall defaults to CURRENT session
- Cross-session requires explicit allSessions=true

EVIDENCE 4 — Checkpoint isolation (checkpoint.ts:472-482):
```
if (snapshot.sessionId !== sessionId) continue;  // ← Filter enforced
```

POTENTIAL IMPLICIT INHERITANCE (if it existed):
- ❌ activeTaskBySession lookup: only maps THIS sessionId
- ❌ getPlan lookup: only searches THIS sessionId
- ❌ Checkpoint snapshot: only matches THIS sessionId
- ❌ Memory recall: defaults to THIS sessionId
- ❌ No "last-resort" global Plan fallback

CONCLUSION: ❌ ZERO implicit inheritance enforced in code

════════════════════════════════════════════════════════════════
Q6: Các code path + file/line liên quan
════════════════════════════════════════════════════════════════

ENTRY POINT:
- engine.ts:780-795 — processInner: decide resume vs new checkpoint

SESSION ID LOOKUP:
- engine.ts:788 — getActiveTaskForSession(sessionId) lookup
- checkpoint.ts:455-456 — getActiveTaskForSession implementation

PLAN RETRIEVAL FOR NEW SESSION:
- engine.ts:902-917 — Admission gate + Plan lookup
- engine.ts:906 — derivePlanState(this.checkpointStore, sessionId)
- checkpoint.ts:433-435 — getPlan(sessionId) implementation
- checkpoint.ts:472-482 — getLatestForSession(sessionId) — FILTERS by sessionId

CRITICAL FILTER (PREVENTS CROSS-SESSION):
- checkpoint.ts:475 — if (snapshot.sessionId !== sessionId) continue;

CROSS-SESSION LOOKUP (EXPLICIT ONLY):
- knowledge.ts:140-150 — session_search tool
- knowledge.ts:158-160 — allSessions flag (must be explicit)

MEMORY SCOPING:
- engine.ts:867-870 — globalMemoryStore.query with sessionId scoped
- knowledge.ts:164 — default sessionId = getRequestContext()?.sessionId

RECOVERY (NOT AUTO-INHERIT):
- engine.ts:333-351 — Boot recovery: getAllInProgress() marked recovered, not injected
- checkpoint.ts:488-496 — getAllInProgress() returns all in-progress

PLAN STATE DERIVATION:
- plan-state.ts:36-76 — derivePlanState(checkpointStore, sessionId)
- plan-state.ts:36 — if (!checkpointStore || !sessionId) return { kind: 'none' };
- plan-state.ts:37 — const plan = checkpointStore.getPlan(sessionId); [SAME sessionId]

════════════════════════════════════════════════════════════════
THREE SCENARIOS: RUNTIME FLOW
════════════════════════════════════════════════════════════════

SCENARIO A: SAME sessionId after restart
─────────────────────────────────────────
User sends: sessionId = "session-123" (same as before crash)

Flow:
1. engine.ts:788 — getActiveTaskForSession("session-123") → returns checkpoint ID
2. engine.ts:789-791 — RESUME existing checkpoint
3. engine.ts:906 — derivePlanState(store, "session-123")
4. checkpoint.ts:433-435 — getPlan("session-123")
5. checkpoint.ts:475 — Finds snapshot where sessionId == "session-123"
6. Checkpoint contains plan field
7. Plan injected into context

LOGS TO WATCH:
[Engine] Resuming session session-123 with existing checkpoint ...
[Engine] Task admitted to existing plan ... (scope check deferred)

RESULT: ✅ OLD PLAN REUSED (for SAME sessionId)


SCENARIO B: COMPLETELY NEW sessionId
─────────────────────────────────────
User sends: sessionId = "session-NEW-999" (new, never seen before)

Flow:
1. engine.ts:788 — getActiveTaskForSession("session-NEW-999") → null
2. engine.ts:792-795 — NEW checkpoint created
3. engine.ts:906 — derivePlanState(store, "session-NEW-999")
4. checkpoint.ts:433-435 — getPlan("session-NEW-999")
5. checkpoint.ts:474-479 — Loop through snapshots
6. checkpoint.ts:475 — if (snapshot.sessionId !== "session-NEW-999") continue;
7. NO snapshots match (all are from old sessions)
8. getLatestForSession returns null
9. getPlan returns null
10. existingPlan = null
11. assignedPlanId = null

LOGS TO WATCH:
[Engine] Starting new execution for session session-NEW-999 ...
[Engine] No existing active plan — task will create new plan if needed

RESULT: ❌ OLD PLAN NOT ACCESSIBLE; session must create fresh Plan


SCENARIO C: User explicitly requests old Plan
──────────────────────────────────────────────
New session, but user says: "tiếp tục Plan từ trước" / "what were we doing?"

Flow:
1. Same as Scenario B (no auto Plan)
2. User sends query
3. Agent (or user) calls session_search(allSessions=true)
4. knowledge.ts:158-160 — allSessions=true → NO sessionId filter
5. Conversation history from OTHER sessions returned
6. User or Agent reads historical context
7. Agent can describe goal + constraints to model
8. Model creates NEW plan based on recovered info (if desired)

LOGS TO WATCH:
[Engine] No existing active plan...
Memory recall: N block(s) (if memory recall triggers)
session_search called with allSessions=true
Results: [old conversation + plan discussion from previous session]

RESULT: ✅ USER CAN DISCOVER OLD EXECUTION; 
        ❌ BUT MUST EXPLICITLY QUERY;
        ⚠️ OLD PLAN NOT INJECTED, USER MUST RE-PLAN OR COPY-PASTE

════════════════════════════════════════════════════════════════
FINAL ANSWERS
════════════════════════════════════════════════════════════════

1. Q1: When new session created, where does Plan come from?
   ✅ getPlan(sessionId) from this.plans or snapshot with SAME sessionId
   ❌ NEW session → NO Plan available (lookup filters by sessionId)

2. Q2: Can getPlan(sessionId) fetch Plan from other session?
   ❌ NO — checkpoint.ts:475 enforces sessionId filter

3. Q3: Any implicit mechanism to bring old Plan to new session?
   ❌ NO — no restorePlan, inheritPlan, or cross-session copy

4. Q4: Any runtime mechanism to find old Plan/execution?
   ✅ YES — explicit session_search(allSessions=true) for conversation
   ❌ NO — no automatic Plan discovery or transfer

5. Q5: Any implicit inheritance from old session to new?
   ❌ NO — explicit sessionId boundary enforced everywhere
   ❌ Admission gate checks ONLY this sessionId
   ❌ Memory recall defaults to SAME session only

6. Q6: Code paths + lines?
   [See Q6 section above]

════════════════════════════════════════════════════════════════
CONCLUSION FOR YOUR TEST SCENARIO
════════════════════════════════════════════════════════════════

Scenario: "Plan running → Ctrl+C → restart → NEW SESSION → ask about old Plan"

Current behavior (CONFIRMED BY CODE):
1. ✅ Same sessionId arrives → OLD Plan resumed automatically
2. ❌ NEW sessionId arrives → NO old Plan accessible (must create fresh)
3. ✅ User can call session_search(allSessions=true) to find old execution
4. ❌ But old Plan NOT auto-injected into new session context
5. ❌ No implicit inheritance; sessionId boundary strictly enforced

KEY POINTS TO WATCH IN YOUR LOG:
─────────────────────────────────
- "[Engine] Resuming session XYZ" → SAME session (old Plan reused)
- "[Engine] Starting new execution for session XYZ" → NEW session (no Plan)
- "[Engine] No existing active plan" → NEW session confirmed
- "[Engine] Task admitted to existing plan" → Only if SAME sessionId
- session_search called with allSessions=true → User explicitly finding old execution

════════════════════════════════════════════════════════════════
