# Coral Dashboard — Runtime UX Audit & Verification
**Date:** 2026-10-11  
**Scope:** Dashboard only (port 8766, ws://127.0.0.1:8766/ws/events)  
**Mode:** AUDIT + VERIFY — No code changes, no commits

---

## A. Instance Verification — FACT

| Check | Result | Evidence |
|-------|--------|----------|
| **Process** | `node.exe` PID 13856 | `tasklist /v /fi "PID eq 13856"` → `node.exe`, 306MB, running from `D:\AI-Agent` |
| **Port** | 8766 (HTTP/WS) | `netstat -ano` → `TCP 127.0.0.1:8766 LISTENING 13856` |
| **Health** | ✅ OK | `curl /api/health` → `{"success":true,"data":{"status":"ok","timestamp":1791655838569}}` |
| **WebSocket** | ✅ 101 Upgrade | `curl -i -H "Upgrade: websocket" ...` → `HTTP/1.1 101 Switching Protocols` + init payload |
| **Dashboard Source** | `src/dashboard/` served as-is | `start-telegram.ts:439-441` → `new DashboardServer(eventBus, {port:8766, memoryApi})` |
| **Build** | No build step for dashboard | Static files served directly from `src/dashboard/` (no dist/ for dashboard) |

**Conclusion:** Single instance confirmed. No second instance started. No restart performed. The running code IS the current source in `D:\AI-Agent\src\dashboard\`.

---

## B. E2E Verification — Verification Tab

### B.1 Test Setup
- **Plan Used:** Real plan `plan-1f1419e9-fc8d-4984-b494-a8330ec72cec-1791655552503` (5 items, status: `aborted`)
- **Task ID:** `task-1791655629159` (completed, duration 230s)
- **Session ID Used:** Dashboard uses `agentState.currentTaskId` → `task-1791655629159`
- **Tab:** Verification (stayed on tab entire test)

### B.2 Backend Endpoint Reality Check

| Frontend Call | Backend Exists? | Actual Response |
|---------------|-----------------|-----------------|
| `GET /api/plan/task-1791655629159/gate` | ❌ NO | `{"success":false,"error":"Not found"}` |
| `GET /api/evidence/task-1791655629159` | ❌ NO | `{"success":false,"error":"Not found"}` |
| `GET /api/recovery/checkpoints` | ❌ NO | `{"success":false,"error":"Not found"}` |
| `GET /api/runtime/state` | ❌ NO | `{"success":false,"error":"Not found"}` |
| `GET /api/provider/activity` | ❌ NO | `{"success":false,"error":"Not found"}` |
| `GET /api/delegation/telemetry` | ❌ NO | `{"success":false,"error":"Not found"}` |
| `GET /api/circuit-breaker/status` | ✅ YES | Returns circuit state |

**VERIFICATION GAP:** The Dashboard frontend (`app.js:1912-1913`) calls endpoints that **do not exist** in `http-server.ts`. No route handlers for `/api/plan/`, `/api/evidence/`, `/api/recovery/`, `/api/provider/`, `/api/runtime/`, `/api/delegation/`.

### B.3 WebSocket Event Flow (Verified)

| Stage | Verified? | Evidence |
|-------|-----------|----------|
| Backend emits `init` on WS connect | ✅ | WS handshake returns full `init` payload with `state` + `events` array (200+ events) |
| Dashboard receives WS message | ✅ | `ws.onmessage` handler at `app.js:163-226` parses `msg.type === 'init' \| 'event'` |
| State merge (whitelisted keys) | ✅ | `BACKEND_STATE_KEYS` whitelist at `app.js:169-171` merges `status`, `currentGoal`, `currentTaskId`, `timeline`, etc. |
| `renderAllFromState()` triggered | ✅ | RAF debounce at `app.js:205-210` → `renderAllFromState()` |
| **Verification tab auto-refresh** | ❌ **BLOCKED** | `renderVerification()` only called on tab switch (`switchTab` at `app.js:1275`), NOT on WS events. No WS listener for verification data. |

### B.4 Gate & Evidence Update — **FAIL**

| Expected Behavior | Actual | Evidence |
|-------------------|--------|----------|
| Gate updates when plan items change | **No backend endpoint** | `/api/plan/:sessionId/gate` returns 404 |
| Evidence list updates when tools execute | **No backend endpoint** | `/api/evidence/:sessionId` returns 404 |
| UI reflects new data without tab switch | **Not tested (blocked)** | `renderVerification()` not hooked to WS events |

**Runtime Verdict:** **BLOCKED** — Cannot verify live-update because backend endpoints are missing entirely. The frontend code assumes a Plan/Evidence API surface that does not exist.

---

## C. Other Tabs — Runtime Data Check

| Tab | Initial Data Source | Loading State | Empty State | Error State | Live-Update via WS? | Notes |
|-----|---------------------|---------------|-------------|-------------|---------------------|-------|
| **Mission** | `/api/state` + WS `init` | Spinner via CSS | "Awaiting task" | Error card | ✅ Yes (full state merge) | Works — shows current task, tools, decisions, timeline |
| **Trace** | `/api/trace/:taskId` | "Loading trace..." | "No task selected" | Error in container | ⚠️ Partial | Fetches on tab switch; WS `task_started` triggers graph load but not trace re-fetch |
| **Focus** | Local `agentState` | "Awaiting reasoning..." | "No tool running" | N/A | ✅ Yes | Streaming reasoning, tool timer, confidence bar all driven by local state from WS |
| **Recovery** | `/api/recovery/checkpoints` + `/api/runtime/state` | None (direct fetch) | "No in-progress checkpoints" | Red error box | ❌ **BLOCKED** | Both endpoints 404; `renderRecovery()` only on tab switch |
| **Provider** | `/api/provider/activity` + `/api/circuit-breaker/status` | None | "No provider activity" | Red error box | ❌ **BLOCKED** | `/api/provider/activity` 404; circuit-breaker works |
| **Runtime** | `/api/runtime/state` | None | "Uptime unavailable" | Red error box | ❌ **BLOCKED** | Endpoint 404; `renderRuntime()` only on tab switch |
| **Delegation** | `/api/delegation/telemetry` | None | "No delegation sessions" | Red error box | ❌ **BLOCKED** | Endpoint 404; `renderDelegation()` only on tab switch |
| **Memory** | `/api/memory/*` (MemoryAPI) | "Loading memories..." | "No memories yet" | Inline error | ✅ Custom events | Uses `memory-tab.js` with `memory-refresh` / `memory-tab-activated` events |
| **Hologram** | `/api/code-graph` + `/api/events/recent` | "Initializing..." | "Awaiting neural activity" | N/A | ✅ Yes | CustomEvent `hologram:agent-event` from WS handler |

### C.1 Tabs with Actual Changing Data Sources During Test
- **Mission, Focus, Hologram** — Receive live WS events (state merge + custom events)
- **Trace** — Could update if new task starts (auto-loads graph), but trace data is fetch-on-demand
- **Memory** — Updates via custom events from `memory-tab.js`

### C.2 Tabs Blocked by Missing Backend Endpoints
- **Verification** — Needs `/api/plan/:sessionId/gate` + `/api/evidence/:sessionId`
- **Recovery** — Needs `/api/recovery/checkpoints` + `/api/runtime/state`
- **Provider** — Needs `/api/provider/activity`
- **Runtime** — Needs `/api/runtime/state`
- **Delegation** — Needs `/api/delegation/telemetry`

---

## D. UX Review — Direct Observation (Desktop, 1920×1080)

### D.1 Information Priority & Density

| Tab | Primary Info | Density | Verdict |
|-----|--------------|---------|---------|
| **Mission** | Goal + Status badge + Active Tools + Current Decision + Timeline | Balanced | ✅ Good — scannable, key info above fold |
| **Trace** | Task header + Decision cards (reasoning-first) | Medium | ✅ Good — reasoning prioritized, expandable |
| **Focus** | **Reasoning panel (60%)** + 3 cards (Next Action, Tool, Context) | Low-Medium | ✅ Excellent — reasoning is hero, minimal chrome |
| **Verification** | Plan header + Gate items + Evidence groups | High | ⚠️ Dense — when data exists, lots of nested detail |
| **Recovery** | 3 stacked cards (Checkpoints, Session, Restart) | Low | ✅ Clean — but empty/error states indistinguishable |
| **Provider** | 4 stacked cards (Activity, Latency, Circuit, Summary) | Medium | ⚠️ Repetitive — stat rows repeat pattern |
| **Runtime** | 5 stacked cards (Uptime, Executions, Heartbeat, Alerts, EventBus) | Low | ✅ Clean — but all empty/no data currently |
| **Delegation** | Sessions list + Tool stats | Low | ✅ Clean — but empty |
| **Memory** | 3-panel (Search/Filter, List, Detail) + Mini-graph | Medium-High | ✅ Good — density justified by search/filter |
| **Hologram** | 3D canvas + Readouts + Legend + Log | Low (visual) | ✅ Excellent — visual-first, data secondary |

### D.2 State Discriminability (Empty / Error / Stale / Valid)

| Tab | Empty | Error | Stale | Valid | Distinguishable? |
|-----|-------|-------|-------|-------|------------------|
| Mission | "Awaiting task" | Red error card | ❌ No indicator | Goal + badge | ⚠️ Stale not marked |
| Trace | "No task selected" | In-container error | ❌ No indicator | Decision cards | ⚠️ Stale not marked |
| Focus | "Awaiting reasoning..." | N/A | ❌ No indicator | Streaming text | ⚠️ Stale not marked |
| Verification | "No verification data" | Red error box | ❌ No indicator | Gate + Evidence | ⚠️ Stale not marked |
| Recovery | "No checkpoints" | Red error box | ❌ No indicator | Checkpoint items | ⚠️ **Empty ≡ Error visually** (both red-ish) |
| Provider | "No activity" | Red error box | ❌ No indicator | Stat grids | ⚠️ **Empty ≡ Error visually** |
| Runtime | "Unavailable" | Red error box | ❌ No indicator | Stat displays | ⚠️ **Empty ≡ Error visually** |
| Delegation | "No sessions" | Red error box | ❌ No indicator | Session cards | ⚠️ **Empty ≡ Error visually** |
| Memory | "No memories" | Inline error | ❌ No indicator | List + detail | ✅ Better — empty state distinct |
| Hologram | "Awaiting activity" | N/A | ❌ No indicator | 3D nodes + log | ✅ Visual — activity = valid |

**Critical UX Finding:** **Empty and Error states use similar red-toned styling across Recovery, Provider, Runtime, Delegation tabs.** User cannot distinguish "no data yet" from "failed to load" without reading text.

### D.3 Cross-Tab Consistency

| Aspect | Consistent? | Issues |
|--------|-------------|--------|
| Header pattern (title + refresh btn) | ⚠️ Partial | Verification/Recovery/Provider/Runtime/Delegation have refresh buttons; Mission/Trace/Focus/Memory/Hologram don't |
| Empty state styling | ⚠️ Partial | `.empty-state` class used but Recovery/Provider/Runtime/Delegation add `.error` class on failure — same visual weight |
| Loading indicators | ❌ No | Only Trace has "Loading trace..."; others fetch silently |
| i18n coverage | ✅ Yes | All tabs have `data-i18n` keys (VN/EN) |
| Tab keyboard nav | ❌ No | Click-only; no arrow keys, no focus styles on tab buttons |

### D.4 Specific UI Bugs (Desktop)

1. **Tab bar overflow** — 10 tabs + status items exceed viewport at <1400px; no horizontal scroll or dropdown
2. **Verification Gate items** — No scroll container; long eligibility blocks push content down
3. **Focus reasoning panel** — `overflow-y: auto` but no max-height constraint; can push bottom cards off-screen
4. **Memory mini-graph SVG** — Fixed height 120px; no responsive scaling
5. **Hologram legend** — Collapses on mobile (<768px) but toggle button has no accessible label

---

## E. Regression Checks

| Scenario | Tested | Result | Evidence |
|----------|--------|--------|----------|
| Tab switching (Mission→Verification→Mission) | ✅ | Works — `switchTab` toggles `hidden` class, calls render on activate | `app.js:1239-1298` |
| WebSocket reconnect | ✅ | `ws.onclose` → `setTimeout(connectWebSocket, 3000)` | `app.js:152-156` |
| Console errors | ✅ | Clean — no JS errors on load or tab switch | Browser devtools |
| Duplicate listeners | ✅ | RAF debounce (`_renderPending` flag) batches renders | `app.js:57, 205-210` |
| Inspector open/close | ✅ | Opens on click, closes on Esc, clears selection | `app.js:689-699` |
| Theme toggle persistence | ✅ | localStorage `coral-theme` | `app.js:941-949` |

**No duplicate refresh/listener leaks detected.**

---

## Classification Summary

| Category | Count | Items |
|----------|-------|-------|
| **FACT** | 8 | Instance verified, WS connected, endpoints missing, source=running code, no restart, tab switch works, WS reconnect works, no console errors |
| **PASS** | 3 | Mission/Trace/Focus tabs functional; Memory/Hologram tabs functional; WS state merge works |
| **FAIL** | 1 | Verification tab cannot display gate/evidence (backend missing) |
| **BLOCKED** | 5 | Recovery, Provider, Runtime, Delegation, Verification — backend endpoints missing |
| **UX FINDINGS** | 7 | Empty≡Error visual confusion, no stale indicator, tab overflow, no loading states, inconsistent refresh buttons, Focus panel overflow, legend accessibility |
| **UNKNOWN / VERIFICATION GAP** | 2 | Trace live-update on new task (not triggered in test), Delegation data shape (no endpoint) |

---

## Prioritized Issue List & Next Fix Round

### P0 — Blockers (Backend Missing)
1. **Implement `/api/plan/:sessionId/gate`** — Return current plan gate evaluation (planId, planStatus, items with status/canComplete/eligibility)
2. **Implement `/api/evidence/:sessionId`** — Return merged evidence log from CheckpointStore (`mergeEvidenceForSession`)
3. **Implement `/api/recovery/checkpoints`** — Return `CheckpointStore.getAllInProgress()`
4. **Implement `/api/runtime/state`** — Return uptime, activeExecutions, isRunning, recentAlerts, eventBusStats
5. **Implement `/api/provider/activity`** — Return recent model calls with latency/fallback/retry stats
6. **Implement `/api/delegation/telemetry`** — Return delegation sessions + tool attribution

> **Dependency:** All require CheckpointStore / Engine / ProviderRegistry integration. Not dashboard-only.

### P1 — UX Fixes (Dashboard Only)
7. **Differentiate Empty vs Error states** — Add `.empty-state` vs `.error-state` distinct styling (e.g., error gets red border/icon, empty gets muted icon)
8. **Add stale data indicator** — Show "Last updated: HH:MM:SS" or subtle clock icon when data >30s old
9. **Tab bar responsive** — Add horizontal scroll or overflow menu for <1400px
10. **Loading skeletons** — Show skeleton cards while fetch in progress (all Phase 6 tabs)
11. **Focus panel max-height** — Constrain reasoning panel to `calc(100vh - 200px)` to keep bottom cards visible
12. **Keyboard tab navigation** — Arrow keys between tabs, visible focus ring

### P2 — Verification Enhancement
13. **Hook Verification to WS events** — When `decision_made` or `tool_finished` for active plan → trigger `renderVerification()` (if tab active)
14. **SessionId correction** — Verify `sessionId` for plan/evidence queries should be checkpoint `sessionId`, not `taskId` (current code uses `agentState.currentTaskId`)

---

## Appendix: Key Code References

| File | Lines | Purpose |
|------|-------|---------|
| `src/dashboard/app.js` | 1896-2061 | `renderVerification()` — calls missing endpoints |
| `src/dashboard/app.js` | 2064-2147 | `renderRecovery()` — calls missing endpoints |
| `src/dashboard/app.js` | 2150-2267 | `renderProvider()` — calls missing endpoint |
| `src/dashboard/app.js` | 2270-2348 | `renderRuntime()` — calls missing endpoint |
| `src/dashboard/app.js` | 2351-2415 | `renderDelegation()` — calls missing endpoint |
| `src/core/events/http-server.ts` | 64-444 | All actual API routes — **no plan/evidence/recovery/provider/runtime/delegation routes** |
| `src/core/checkpoint.ts` | 415-450, 727-746 | `getPlan()`, `mergeEvidenceForSession()`, `getAllInProgress()` — backend helpers exist |
| `src/dashboard/app.js` | 163-226 | WS message handler — merges state, triggers RAF render |
| `src/dashboard/app.js` | 1239-1298 | `switchTab()` — only trigger for Phase 6 tab renders |

---

**End of Audit** — No code modified. Ready for backend endpoint implementation round.