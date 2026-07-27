# ADR-000: State Architecture Principles

**Status:** Accepted  
**Date:** 2026-07-27  
**Deciders:** Coral core team  

---

## Context

Three consecutive bugs (evidenceLog scope, plan-state derive, race condition) shared the same root cause: mutable state on long-lived objects (Engine singleton, CheckpointStore) used as if it were per-request. The pattern repeats: state that only makes sense within one request's lifetime gets stored on an object that outlives it.

## Principles

### 1. No static flags for lifecycle state

Don't use `hasCreatedPlan`, `executionPhase`, `planConsumed` or similar set-once booleans to track entities that change over time (plans, items, sessions). These flags inevitably drift out of sync with the actual state.

**Instead:** Derive state from the source of truth at the moment you need it.

```typescript
// ❌ Static flag — drifts out of sync
let hasCreatedPlan = false;
// ... later ...
if (hasCreatedPlan && !planComplete) { /* guard */ }

// ✅ Derived — always correct
const planState = derivePlanState(checkpointStore, sessionId);
if (isGuardActive(planState)) { /* guard */ }
```

### 2. Per-request state must not live on singletons

State scoped to one request (`sessionId`, `taskId`, `evidenceLog`) must not be stored on `this` of Engine or on singleton CheckpointStore. Under concurrent load, request B overwrites request A's state silently — no error, no log, just wrong data.

**Instead:** Use `AsyncLocalStorage` (Node.js stdlib) or pass context through function arguments.

```typescript
// ❌ Shared mutable state
class Engine {
  currentTaskId: string;  // overwritten per request
  updatePlanCtx: object;  // mutated per request
}

// ✅ Per-request via AsyncLocalStorage
const ctx = requestContext.getStore();
const taskId = ctx?.taskId;
```

### 3. Single source of truth

If two code paths need the same state, they must read from one place — not cache their own copy. The evidenceLog lives in `RequestContext` (per-request), not duplicated in CheckpointStore. Plan status lives in `checkpointStore.getPlan()`, not in a boolean flag.

### 4. Validate at the boundary, not in the caller

When multiple callers need the same validation (e.g., "can this item be completed?"), put the logic in one shared function (`canCompleteItem`). Don't write the same check in three places.

## Application

These principles apply to: plan state, session state, task state, item state, evidence logs, and any other entity that has a lifecycle spanning multiple steps within a request.

When adding new state to the codebase, ask:
1. What is the source of truth for this state?
2. Does it need to survive beyond one request?
3. Can it be derived from existing state instead of stored separately?
4. If two places need it, is there one canonical reader?

## References

- ADR-001: Plan lifecycle state machine (follow-up)
- Fix 3: evidenceLog scope bug
- Fix 4: plan-state derive bug  
- Fix 5: concurrency isolation (AsyncLocalStorage)
