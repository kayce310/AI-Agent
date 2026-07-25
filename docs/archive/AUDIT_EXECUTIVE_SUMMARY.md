# AUDIT EXECUTIVE SUMMARY: FOCUS vs GRAPH
**Date:** 2026-06-21  
**Time:** 04:37 UTC  
**Analyst:** Tor (Hermes Agent)  
**Status:** PROPOSAL PHASE — No Implementation

---

## Overview

Comprehensive UX audit of dashboard FOCUS (⚡) and GRAPH (🔗) tabs, identifying design overlap, duplicate code patterns, and opportunities for architectural improvement.

**Deliverables:**
1. ✅ UX_AUDIT_FOCUS_VS_GRAPH.md — Detailed problem analysis
2. ✅ WIREFRAMES_FOCUS_VS_GRAPH.md — Visual before/after mockups
3. ✅ COMPONENT_INVENTORY_FOCUS_VS_GRAPH.md — Code structure analysis
4. ✅ REFACTOR_PLAN_FOCUS_VS_GRAPH.md — Implementation roadmap
5. ✅ This document — Executive summary & decision points

---

## Key Findings

### Problem 1: Identical Layout Patterns
**Impact:** User confusion about tab purposes

| Tab | Current | Issue |
|-----|---------|-------|
| FOCUS | 5 card stack | Requires scrolling, 600px+ height |
| GRAPH | SVG + legend card | Legend separated, 600px fixed |
| **Result** | Both feel similar | No clear functional difference |

**Root Cause:** Both use `.card` wrapper + label + content pattern (inherited from MISSION tab design).

---

### Problem 2: Duplicate Reasoning Display
**Impact:** Code inefficiency, maintenance burden

```javascript
// renderFocus() BEFORE refactor (82 lines):
// Line 1075-1086: Reasoning rendered in focusDecision
decisionHtml += `<div class="focus-reasoning-snippet">...</div>`;

// Line 1114-1120: Reasoning rendered AGAIN in focusReasoning
focusReasoning.textContent = latestDecisionEvent.payload.reasoningSnippet;
focusReasoning.classList.add('thinking');

// Result: Same data, two DOM elements, two update paths
```

**Root Cause:** Separate renderFocus() card for reasoning never merged with decision card.

---

### Problem 3: GRAPH Canvas Underutilized
**Impact:** Lost exploration opportunity

**Current capabilities:**
- ✅ Renders SVG nodes/edges
- ❌ No interactivity (click handlers log to console only)
- ❌ No hover tooltips visible to users
- ❌ No pan/zoom
- ❌ 3-column layout breaks with >6 decisions

**Potential (unrealized):**
- Visual causality exploration
- Task navigation (click decision → drill down)
- Real-time decision tree visualization

---

### Problem 4: Event Filtering Duplication
**Impact:** Maintenance debt, potential inconsistency

Three+ places in code filter/sort events identically:

```javascript
// Pattern repeated in renderFocus(), renderMission(), renderTrace():
allEvents
  .filter(e => e.payload?.taskId === taskId && e.type === 'decision_made')
  .sort((a, b) => b.timestamp - a.timestamp)[0]
```

**Root Cause:** No shared utility library for common event queries.

---

## Proposed Architecture

### FOCUS Tab: Real-Time "What Now?" Viewport
**Purpose:** Quick glance at agent's current state  
**Use Case:** Daily monitoring, keyboard shortcut check, sidecar display

**Redesign:**
```
┌─────────────────────────────┐
│ test-task-1 ⚡ RUNNING 2m   │ ← Compact header (32px)
├─────────────────────────────┤
│ Goal: Build FastAPI service │ ← 1 line
├─────────────────────────────┤
│ ∴ Implement JWT middleware  │ ← Decision icon
│   Why: Pattern found in 3   │ ← Integrated reasoning
│   existing services         │
├─────────────────────────────┤
│ 🔧 search_knowledge 3.2s ⏱ │ ← Active tool
└─────────────────────────────┘

Height: 180px (no scroll)
Animation: Pulse on decision/tool change
```

**Benefits:**
- ✅ Fits in 400px height (zero scroll)
- ✅ Fits in 120px width sidecar (truncate intelligently)
- ✅ Real-time visual feedback (animations)
- ✅ No duplicate reasoning rendering
- ✅ Reasoning-first priority (already implemented, optimize display)

**Effort:** 2–3 hours

---

### GRAPH Tab: Visual Decision Network Explorer
**Purpose:** Understand causal chain and decision dependencies  
**Use Case:** Post-analysis, learning, debugging, task navigation

**Redesign:**
```
┌────────────────────────────────────┐
│ COGNITIVE GRAPH test-task-1        │
│ [Fit] [Reset] [Dev] [←Pan]         │ ← Interactive controls
├────────────────────────────────────┤
│                                    │
│          Decision 1                │ ← Hierarchical layout
│             ↓ caused               │   (time flows →)
│         Tool A (✓ 2.1s)            │
│             ↓ produced             │ ← Click: select + details
│         Artifact (code.py)         │ ← Hover: tooltip visible
│             ↓ fed                  │ ← Drag/scroll: pan/zoom
│          Decision 2                │
│             ↓ caused               │
│         Tool B (⏱ running)         │
│                                    │
│ [Drag to pan, Scroll to zoom]      │
├────────────────────────────────────┤
│ Legend: ● Decision ● Tool ● Artifact
│ ─ Caused ─ Produced ─ Followed     │ ← Integrated, not card
└────────────────────────────────────┘

Height: Full viewport (responsive)
Canvas: Interactive (pan/zoom/click)
Nodes: Clickable (open inspector)
Edges: Hoverable (highlight causality)
```

**Benefits:**
- ✅ Visual understanding of causality
- ✅ Scalable to 50+ nodes (hierarchical layout)
- ✅ Explorable (pan/zoom, not static)
- ✅ Inspectable (click node → details)
- ✅ Accessible (hover tooltips, not console.log)
- ✅ Foundation for Phase 4F (Three.js 3D hologram)

**Effort:** 8–12 hours

---

### Shared Utilities Layer
**Files:**
- `src/dashboard/helpers/events.js` — Event filtering
- `src/dashboard/helpers/render.js` — Empty states, escaping

**Functions:**
```javascript
getCurrentTaskId()        // Replaces: currentTaskId || lastCompletedTaskId
getLatestEvent()          // Replaces: filter + sort pattern
getEventsByTaskId()       // Replaces: manual filtering
renderEmptyState()        // Replaces: repeated <div class="empty-state">
escapeHtml()              // Replaces: manual escaping
```

**Benefit:** DRY principle, consistency across tabs, easier testing

**Effort:** 4–6 hours

---

## Before & After Snapshots

### User Experience: FOCUS Tab

**Before (Scroll-Heavy):**
```
User wants to check: "What is the agent doing?"
        ↓
    Click FOCUS tab
        ↓
    Sees 600px+ card stack
    Must scroll: Goal → Decision → Tool → Reasoning
    Gets: Confused by duplicate reasoning
    Friction: High
    Time: 5–10 seconds
```

**After (Glanceable):**
```
User wants to check: "What is the agent doing?"
        ↓
    Click FOCUS tab (or Alt+F)
        ↓
    Sees compact 180px viewport
    Reads all info at once: Goal, Decision, Active Tool
    Gets: Clear current state, visual pulse on changes
    Friction: Low
    Time: 1–2 seconds
```

### User Experience: GRAPH Tab

**Before (Static):**
```
User wants to understand: "Why did that decision happen?"
        ↓
    Click GRAPH tab
        ↓
    Sees static 3-column layout
    Tries to interact: Click on node (nothing)
    Hovers: No tooltip
    Result: "Interesting visual, but what does it mean?"
    Exploration: Blocked
```

**After (Interactive):**
```
User wants to understand: "Why did that decision happen?"
        ↓
    Click GRAPH tab
        ↓
    Sees hierarchical decision chain
    Clicks on decision node
        ↓
    Inspector opens with full details
    Hovers over edge
        ↓
    Connected nodes highlight (causality visible)
    Pans/zooms to explore full graph
    Result: "Aha! Decision B led to Tool A which produced Artifact"
    Exploration: Enabled
```

---

## Architecture Decisions Required

### Decision 1: FOCUS Sidebar vs Tab
**Option A (Current):** Tab (alongside MISSION/TRACE/GRAPH)
- Pro: Clean UI, no extra panel
- Con: Hidden when not active, requires click

**Option B (Proposed):** Always-visible sidecar pane (like Inspector)
- Pro: Real-time visible, Alt+F toggles open/close
- Con: Takes screen space, competes with inspector

**Recommendation:** Keep as Tab for Phase 1. Sidecar as future enhancement.

---

### Decision 2: GRAPH Layout Algorithm
**Option A (Custom Hierarchical):** 100 lines of TypeScript
- Pro: Zero dependencies, full control
- Con: Needs testing, may not scale to 100+ nodes

**Option B (D3 Hierarchy):** npm install d3-hierarchy
- Pro: Battle-tested, professional, scalable
- Con: ~50KB gzipped, learning curve

**Recommendation:** Start with Option A (custom). Migrate to D3 if needed.

---

### Decision 3: Node Click Behavior
**Option A (Inspector Panel):** Show node details in right-side inspector
- Pro: Familiar pattern, already implemented
- Con: Requires side-opening inspector

**Option B (Drill Down):** Click decision node → load that task's graph
- Pro: Exploration-first, natural navigation
- Con: Need task ID mapping, back-button UX

**Recommendation:** Option A (inspector) for Phase 1. Option B as Phase 4F feature.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Break responsive FOCUS layout | Medium | Medium | Test 320px/400px/1200px before merge |
| SVG rendering lag (50+ nodes) | Low | High | Profile performance, implement virtual scrolling if needed |
| Tooltip position off-screen | Low | Low | Add boundary detection, clamp coordinates |
| Pan/zoom interaction lag | Low | Medium | Use requestAnimationFrame, avoid reflow |
| User confusion on new interactions | Medium | Low | Add help text, keyboard hints, tutorial |
| Browser zoom interaction conflicts | Low | Low | Disable browser zoom detection on SVG |

---

## Implementation Timeline

### Week 1: FOCUS Optimization (2–3 hours)
- [ ] Monday: Design review, get user approval on decisions
- [ ] Tuesday–Wednesday: Implement HTML/CSS/JS refactor
- [ ] Thursday: Unit tests, visual testing (3 viewports)
- [ ] Friday: Merge to develop (Phase 1 complete)

### Week 2: GRAPH Enhancement (8–12 hours)
- [ ] Monday–Tuesday: Implement hierarchical layout algorithm
- [ ] Wednesday: Implement pan/zoom/click interactivity
- [ ] Thursday: Integration testing, performance profiling
- [ ] Friday: User testing, gather feedback

### Week 3: Consolidation (4–6 hours)
- [ ] Monday–Tuesday: Extract event helpers, consolidate utilities
- [ ] Wednesday: Refactor all tabs to use shared utilities
- [ ] Thursday: Regression testing (all 4 tabs)
- [ ] Friday: Documentation, prepare for Phase 4F

**Total: 14–21 hours (2–3 weeks)**

---

## Success Criteria

### FOCUS Tab
- ✅ Zero scroll required (max 200px height)
- ✅ Pulse animation visible and smooth (200ms)
- ✅ Reasoning not duplicated in DOM or render paths
- ✅ Responsive: works on 320px, 400px, 1200px
- ✅ No regressions in tests
- ✅ Load time: <100ms render

### GRAPH Tab
- ✅ Interactive (pan/zoom/click all working)
- ✅ Canvas responsive (fills viewport height)
- ✅ 50-node graph renders in <500ms
- ✅ Hover tooltip appears correctly
- ✅ Click node → inspector opens with details
- ✅ Edge highlighting works on hover
- ✅ [Fit to View] button computes correct bounds
- ✅ No regressions in tests

### Code Quality
- ✅ No new console warnings/errors
- ✅ Cyclomatic complexity per function: <5
- ✅ CSS bundle: <10KB increase
- ✅ JS bundle: <15KB increase
- ✅ Event utilities extracted (DRY)

---

## Documentation Structure

**Audit Deliverables (in /docs/):**
1. **AUDIT_EXECUTIVE_SUMMARY.md** ← You are here
   - High-level findings, decisions, timeline
   - For stakeholders & decision-makers

2. **UX_AUDIT_FOCUS_VS_GRAPH.md**
   - Detailed problem analysis
   - Current vs proposed architecture
   - For designers & UX leads

3. **WIREFRAMES_FOCUS_VS_GRAPH.md**
   - ASCII mockups, layout comparisons
   - Data flow diagrams, animations
   - For visual reference

4. **COMPONENT_INVENTORY_FOCUS_VS_GRAPH.md**
   - HTML/CSS/JS code structure
   - Duplicate detection
   - Risk matrix
   - For developers & code reviewers

5. **REFACTOR_PLAN_FOCUS_VS_GRAPH.md**
   - Phase-by-phase implementation steps
   - Code examples, testing strategy
   - Rollback procedures
   - For implementation team

---

## Next Steps

### Immediate (This Session)
- [ ] User reviews audit findings
- [ ] User decides on 3 key decisions (above)
- [ ] Create feature branch: `refactor/focus-graph`

### Week 1
- [ ] Implement Phase 1 (FOCUS optimization)
- [ ] PR review + feedback
- [ ] Merge to develop

### Week 2
- [ ] Implement Phase 2 (GRAPH interactivity)
- [ ] UAT (user acceptance testing)
- [ ] Gather feedback before Phase 3

### Week 3
- [ ] Implement Phase 3 (Consolidate utilities)
- [ ] Final testing & documentation
- [ ] Prepare for Phase 4F (Jarvis Brain)

---

## Questions for User

1. **FOCUS design:** Confirm compact 180px height with no card wrappers?
2. **GRAPH layout:** Custom hierarchical (100 lines) or D3 dependency?
3. **GRAPH interaction:** Inspect in right panel, or drill down to subtask?
4. **Timeline:** Can you allocate 14–21 hours over 2–3 weeks?
5. **Priority:** Start immediately, or after Phase 4E is stable?

---

## Appendix: Current State (Reference)

**Files Modified (Phase 4E):**
- `src/dashboard/index.html` — Added GRAPH tab + Focus Mode markup
- `src/dashboard/app.js` — Added renderFocus(), renderGraph(), drawGraph()
- `src/dashboard/styles.css` — Added focus/graph styling
- `src/core/events/graph-builder.ts` — CognitiveGraphBuilder class
- `src/core/events/api.ts` — getGraph() method
- `src/core/events/http-server.ts` — GET /api/graph/:taskId route

**Test Status:** 392/392 passing ✓

**Branch:** develop (55 commits ahead of main)

---

## Conclusion

The FOCUS and GRAPH tabs have **good data** but **suboptimal UX**. This audit identifies:
- **Quick wins** (FOCUS: 2–3 hours)
- **High-impact improvements** (GRAPH: 8–12 hours)
- **Technical debt** (consolidate utilities: 4–6 hours)

**Recommendation:** Proceed with Phase 1 (FOCUS) immediately. Gather user feedback before Phase 2 (GRAPH).

Phase 4E established the cognitive graph data architecture. Phase 4F.1 (this refactor) polishes the UX. Phase 4F (Jarvis Brain + Three.js) adds the 3D hologram layer.

---

**Audit Complete: 2026-06-21 04:37 UTC**

**Status:** AWAITING USER DECISIONS — No implementation until approval

**Next Document:** REFACTOR_PLAN_FOCUS_VS_GRAPH.md (when ready to proceed)
