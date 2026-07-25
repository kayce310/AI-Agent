# REFACTOR PLAN: FOCUS vs GRAPH UX
**Date:** 2026-06-21  
**Scope:** Dashboard tabs redesign (audit phase)  
**Status:** Proposal only — NO IMPLEMENTATION

---

## Executive Summary

**Current Problem:**
- FOCUS and GRAPH tabs render nearly identical card-based layouts
- Neither fulfills its intended use case effectively
- Code duplication in event filtering and rendering
- GRAPH lacks interactivity (static 3-column layout only)
- FOCUS requires scrolling on all viewports

**Proposed Solution:**
1. **FOCUS:** Transform into compact real-time viewport (no scroll, pulse animations)
2. **GRAPH:** Transform into interactive visual network (pan/zoom, click nodes, hover tooltips)
3. **Consolidate:** Extract shared utilities (event filtering, empty states)

**Effort Estimate:** 12–15 hours total  
**Risk Level:** Medium (touches rendering logic, visual regression risk)  
**User Impact:** High (improves daily usability significantly)

---

## Phase Breakdown

### Phase 1: FOCUS Optimization (2–3 hours)
**Goal:** Compact, real-time, minimal design

#### 1.1 HTML Refactor (30 min)
**Current:** 5 separate .card elements
**Target:** 2 semantic sections

```html
<!-- BEFORE: 4 cards -->
<section id="focus-view">
  <div class="card focus-goal-card">...</div>
  <div class="card focus-decision-card">...</div>
  <div class="card focus-tool-card">...</div>
  <div class="card focus-reasoning-card">...</div>
</section>

<!-- AFTER: Unified structure -->
<section id="focus-view">
  <div class="focus-header">
    <span id="focus-task-id">—</span>
    <span id="focus-task-status">—</span>
  </div>
  <div id="focus-goal" class="focus-goal">Awaiting task</div>
  <div id="focus-decision-reasoning" class="focus-decision-reasoning">
    <div class="decision-text"></div>
    <div class="reasoning-text"></div>
  </div>
  <div id="focus-tool" class="focus-tool">No tool running</div>
</section>
```

**Files:** `src/dashboard/index.html` (lines 125–163)

#### 1.2 CSS Refactor (45 min)
**Current:** Card-stacking with heavy padding (wasteful)
**Target:** Grid-based compact layout

```css
/* BEFORE: ~100 lines, card-oriented */
.focus-goal-card { ... padding: 16px ... }
.focus-decision-card { ... padding: 16px ... }
.focus-tool-card { ... padding: 16px ... }
.focus-reasoning-card { ... padding: 16px ... }

/* AFTER: ~50 lines, flex/grid */
.focus-header {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 12px;
}

.focus-goal {
  padding: 8px 12px;
  line-height: 1.4;
}

.focus-decision-reasoning {
  padding: 12px;
  border-left: 3px solid var(--accent);
}

/* Pulse animation */
@keyframes pulse-update {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.focus-decision-reasoning.updated {
  animation: pulse-update 200ms ease-out;
}

.focus-tool {
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
```

**Max height target:** 200px (fits in 400px viewport without scroll)  
**Files:** `src/dashboard/styles.css` (search for `.focus-*`)

#### 1.3 JavaScript Refactor (60 min)
**Current:** renderFocus() rebuilds from allEvents (82 lines, has duplicate reasoning)
**Target:** Streamlined, with animation trigger (40 lines)

```javascript
// BEFORE: Renders reasoning twice
function renderFocus() {
  // ... setup ...
  
  // Decision + reasoning in DECISION card
  let decisionHtml = `<div>${decision}</div>`;
  if (reasoning) decisionHtml += `<div>${reasoning}</div>`;
  focusDecision.innerHTML = decisionHtml;
  
  // Reasoning AGAIN in REASONING card
  focusReasoning.textContent = reasoning;
  focusReasoning.classList.add('thinking');
}

// AFTER: Single unified render
function renderFocus() {
  const taskId = getCurrentTaskId();
  if (!taskId) {
    renderEmptyState(focusDecisionReasoning, 'No task');
    return;
  }

  const decision = getLatestEvent(taskId, 'decision_made');
  if (!decision) {
    renderEmptyState(focusDecisionReasoning, 'No decision');
    return;
  }

  const reasoning = decision.payload.reasoningSnippet || 
                   decision.payload.reason || 
                   'Agent is thinking...';

  // Single render (no duplication)
  focusDecisionReasoning.innerHTML = `
    <div class="decision-text">${escapeHtml(decision.payload.decision)}</div>
    <div class="reasoning-text">${escapeHtml(reasoning)}</div>
  `;

  // Trigger animation if taskId changed
  if (this.lastFocusTaskId !== taskId) {
    focusDecisionReasoning.offsetHeight; // Force reflow
    focusDecisionReasoning.classList.add('updated');
    this.lastFocusTaskId = taskId;
  }
}
```

**Animation Behavior:**
- Pulse triggers on decision_made event (visual feedback)
- Smooth 200ms opacity transition (not jarring)
- Disables after animation (re-enables on next change)

**Files:** `src/dashboard/app.js` (lines 1040–1121)

#### 1.4 Testing (30 min)
- [ ] Unit test: renderFocus() produces correct HTML
- [ ] Snapshot test: No regression in structure
- [ ] Visual test: 200px height, no scroll on 400px viewport
- [ ] Animation test: Pulse triggers on state change
- [ ] Responsive test: Works on 320px, 400px, 1200px

---

### Phase 2: GRAPH Interactivity (8–12 hours)
**Goal:** Interactive visual network with pan/zoom/click

#### 2.1 HTML Structure (20 min)
**Current:** Basic header + SVG + legend card
**Target:** Enhanced header + full-viewport canvas + integrated legend

```html
<!-- BEFORE: Legend as separate card -->
<section id="graph-view">
  <div class="card graph-header">...</div>
  <div id="graph-container">
    <svg id="graph-svg" height="600"></svg>
  </div>
  <div class="card graph-legend">...</div>
</section>

<!-- AFTER: Controls + responsive canvas + integrated legend -->
<section id="graph-view">
  <div class="graph-header">
    <h2>COGNITIVE GRAPH</h2>
    <div class="graph-controls">
      <button id="graph-fit" title="Fit to view">Fit</button>
      <button id="graph-reset" title="Reset zoom">Reset</button>
      <label><input type="checkbox" id="graph-dev-mode"> Dev</label>
    </div>
    <div class="graph-stats">
      <span id="graph-task-id">—</span>
      <span id="graph-node-count">0 nodes</span>
      <span id="graph-edge-count">0 edges</span>
    </div>
  </div>

  <div class="graph-canvas">
    <svg id="graph-svg" class="graph-interactive"></svg>
    <div class="graph-hint">Drag to pan • Scroll to zoom • Click node</div>
  </div>

  <div class="graph-legend">
    <span>● Decision</span>
    <span>● Tool</span>
    <span>● Artifact</span>
    <span>─ Caused</span>
    <span>─ Produced</span>
  </div>
</section>
```

**Files:** `src/dashboard/index.html` (lines 165–208)

#### 2.2 CSS Refactor (90 min)
**Current:** Static SVG (600px fixed height), basic styling
**Target:** Responsive canvas + interactive states + smooth animations

```css
/* Container: Responsive */
.graph-canvas {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
  border: 1px solid var(--border);
  background: var(--bg);
}

.graph-svg {
  flex: 1;
  cursor: grab;
}

.graph-svg:active {
  cursor: grabbing;
}

/* Interactive node states */
.graph-node circle {
  transition: stroke-width 200ms, filter 150ms;
}

.graph-node:hover circle {
  stroke-width: 3;
}

.graph-node.selected circle {
  stroke-width: 4;
  filter: drop-shadow(0 0 6px var(--accent));
}

/* Edge highlighting */
.graph-edge {
  opacity: 0.5;
  transition: opacity 150ms, stroke-width 150ms;
}

.graph-edge.connected {
  opacity: 1;
  stroke-width: 2.5;
}

/* Legend */
.graph-legend {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding: 12px 16px;
  font-size: 11px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
}

/* Tooltip */
#graph-tooltip {
  position: fixed;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 11px;
  max-width: 200px;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  pointer-events: none;
}
```

**Files:** `src/dashboard/styles.css` (search for `.graph-*`)

#### 2.3 Layout Algorithm (120 min)
**Current:** Simple 3-column layout (breaks with >6 nodes)
**Target:** Hierarchical or force-directed layout

**Option A: Custom Hierarchical (100 min)**
```javascript
function layoutHierarchical(graph) {
  // Assign nodes to levels based on decision order
  const levels = {};
  let maxLevel = 0;
  
  graph.nodes.forEach(node => {
    if (node.type === 'decision') {
      const levelKey = node.id; // or parse from order
      levels[node.id] = maxLevel++;
    }
  });

  // Position nodes by level
  const positions = new Map();
  const nodesByLevel = {};
  
  graph.nodes.forEach(node => {
    const level = levels[node.decisionId] || 0;
    if (!nodesByLevel[level]) nodesByLevel[level] = [];
    nodesByLevel[level].push(node);
  });

  // Calculate x/y coordinates
  let y = 60;
  Object.entries(nodesByLevel).forEach(([level, nodes]) => {
    const levelHeight = nodes.length * 80;
    nodes.forEach((node, idx) => {
      const x = parseInt(level) * 250 + 100;
      const nodeY = y + idx * 80;
      positions.set(node.id, { x, y: nodeY });
    });
    y += levelHeight + 40;
  });

  return { positions };
}
```

**Option B: Use D3 Hierarchy (120 min)**
- Requires: `npm install d3-hierarchy d3-force`
- Benefit: Professional layout, battle-tested
- Cost: ~50KB gzipped
- Complexity: Learning curve, integration time

**Recommendation:** Option A (custom) for Phase 1, D3 later if needed

**Files:** `src/dashboard/app.js` (new function ~100 lines)

#### 2.4 Interactivity (120 min)
**Current:** Hover logs to console only
**Target:** Click/hover tooltips, pan/zoom, edge highlighting

```javascript
// Click handler: Select node
graph.addEventListener('click', (e) => {
  if (e.target.closest('.graph-node')) {
    const nodeEl = e.target.closest('.graph-node');
    const nodeId = nodeEl.dataset.nodeId;
    selectGraphNode(nodeId);
  }
});

// Hover handler: Show tooltip
svg.addEventListener('mouseover', (e) => {
  if (e.target.closest('.graph-node')) {
    const nodeEl = e.target.closest('.graph-node');
    const nodeId = nodeEl.dataset.nodeId;
    showGraphTooltip(nodeId, e);
  }
});

svg.addEventListener('mouseout', (e) => {
  if (e.target.closest('.graph-node')) {
    hideGraphTooltip();
  }
});

// Pan handler
let panning = false, startX, startY;
let transform = { x: 0, y: 0, scale: 1 };

svg.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.graph-node')) {
    panning = true;
    startX = e.clientX;
    startY = e.clientY;
  }
});

document.addEventListener('mousemove', (e) => {
  if (panning) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    transform.x += dx;
    transform.y += dy;
    updateGraphTransform();
    startX = e.clientX;
    startY = e.clientY;
  }
});

// Zoom handler
svg.addEventListener('wheel', (e) => {
  e.preventDefault();
  const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
  transform.scale *= scaleFactor;
  transform.scale = Math.max(0.1, Math.min(5, transform.scale)); // Clamp
  updateGraphTransform();
});

function updateGraphTransform() {
  const g = document.querySelector('.graph-zoom-area');
  g.setAttribute('transform', 
    `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`);
}

// Button handlers
document.getElementById('graph-fit').addEventListener('click', () => {
  fitGraphToView();
});

document.getElementById('graph-reset').addEventListener('click', () => {
  transform = { x: 0, y: 0, scale: 1 };
  updateGraphTransform();
});

// Dev mode toggle
document.getElementById('graph-dev-mode').addEventListener('change', (e) => {
  if (e.target.checked) {
    document.querySelectorAll('.graph-node').forEach(node => {
      node.classList.add('dev-mode');
    });
  } else {
    document.querySelectorAll('.graph-node').forEach(node => {
      node.classList.remove('dev-mode');
    });
  }
});
```

**Files:** `src/dashboard/app.js` (add ~150 lines)

#### 2.5 Testing (60 min)
- [ ] Unit test: Layout algorithm produces valid positions
- [ ] SVG render test: Nodes + edges render correctly
- [ ] Interaction test: Pan/zoom works smoothly
- [ ] Click test: Selecting node opens inspector
- [ ] Hover test: Tooltip appears and disappears
- [ ] Edge highlight test: Connected edges highlight on hover
- [ ] Performance test: 50-node graph renders <500ms
- [ ] Responsive test: Canvas fills viewport

---

### Phase 3: Consolidate Utilities (4–6 hours)
**Goal:** Eliminate duplicate code patterns

#### 3.1 Create Helpers (90 min)

```javascript
// helpers/events.js

export function getCurrentTaskId() {
  return agentState.currentTaskId || agentState.lastCompletedTaskId;
}

export function getLatestEvent(taskId, eventType) {
  return allEvents
    .filter(e => e.payload?.taskId === taskId && e.type === eventType)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
}

export function getEventsByTaskId(taskId) {
  return allEvents.filter(e => e.payload?.taskId === taskId);
}

export function renderEmptyState(container, message) {
  container.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Files:** `src/dashboard/helpers/events.js` (new)

#### 3.2 Update renderFocus() to use helpers (30 min)

```javascript
import { getCurrentTaskId, getLatestEvent, renderEmptyState } from './helpers/events.js';

function renderFocus() {
  const taskId = getCurrentTaskId(); // ← Use helper
  if (!taskId) {
    renderEmptyState(focusDecisionReasoning, 'No task'); // ← Use helper
    return;
  }

  const decision = getLatestEvent(taskId, 'decision_made'); // ← Use helper
  if (!decision) {
    renderEmptyState(focusDecisionReasoning, 'No decision');
    return;
  }

  // ... rest of render ...
}
```

#### 3.3 Update renderGraph() to use helpers (30 min)

```javascript
import { getCurrentTaskId, renderEmptyState } from './helpers/events.js';

async function renderGraph() {
  const taskId = getCurrentTaskId(); // ← Use helper
  if (!taskId) {
    renderEmptyState(graphView, 'No task selected');
    return;
  }

  // ... rest of render ...
}
```

#### 3.4 Update other tabs (60 min)
- renderMission() → use getCurrentTaskId()
- renderTimeline() → use getEventsByTaskId()
- renderTrace() → use getLatestEvent()

**Files:** `src/dashboard/app.js` (refactor existing functions)

---

## Implementation Order

1. **FOCUS first** (2–3 hours)
   - Quick win, visible improvement
   - No dependencies
   - Lower risk (safe CSS/HTML changes)

2. **GRAPH layout** (2–3 hours)
   - Custom hierarchical algorithm
   - Establish interactive SVG foundation
   - Test pan/zoom before interactivity

3. **GRAPH interactivity** (5–7 hours)
   - Hover tooltips, click selection
   - Edge highlighting
   - Button controls (fit/reset)

4. **Consolidate utilities** (4–6 hours)
   - Extract helpers
   - Refactor existing code
   - Last (doesn't affect visible output)

**Total:** 12–15 hours

---

## Rollback Plan

If issues arise:

1. **Branch strategy:**
   ```bash
   git checkout -b refactor/focus-graph
   # Do work...
   git push origin refactor/focus-graph
   # Open PR for review
   ```

2. **Rollback on critical issue:**
   ```bash
   git reset --hard HEAD~5  # Revert last 5 commits
   git push -f origin refactor/focus-graph
   ```

3. **Cherry-pick safe changes:**
   If FOCUS is good but GRAPH is risky, cherry-pick FOCUS commits to main:
   ```bash
   git cherry-pick <commit-1> <commit-2> ...
   ```

---

## Decision Points for User

**Before Starting Phase 1:**
1. ✅ Confirm: FOCUS should be compact (no card wrappers)?
2. ✅ Confirm: Animation on decision/tool change is desired?
3. ✅ Confirm: Max height 200px for FOCUS is acceptable?

**Before Starting Phase 2:**
4. ⚠️ **Layout algorithm:** Custom (100 lines) or D3 (external dep)?
5. ⚠️ **Interactivity:** Tooltips visible to all, or dev mode only?
6. ⚠️ **Click behavior:** Select node in graph, or load that task?

**Before Phase 3:**
7. ✅ Consolidate helpers, or keep rendering separate?

---

## Success Metrics

### FOCUS Tab
- ✅ No scroll required (fits 400px viewport)
- ✅ Pulse animation visible on event change
- ✅ Reasoning not duplicated
- ✅ Load time: <100ms render
- ✅ User survey: "I can glance and understand immediately"

### GRAPH Tab
- ✅ Interactive (pan/zoom/click)
- ✅ 50-node graph renders <500ms
- ✅ Tooltip useful (developer feedback)
- ✅ [Fit to View] works correctly
- ✅ User survey: "I can explore and understand causality"

### Code Quality
- ✅ No regressions in existing tests
- ✅ Cyclomatic complexity stays <5 per function
- ✅ No new console errors
- ✅ CSS bundle size: <10KB increase

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking responsive FOCUS layout | Test on 3 viewports before merge |
| SVG performance with large graphs | Profile with 50+ nodes, optimize if needed |
| Tooltip position off-screen | Clamp tooltip coordinates, add boundary detection |
| Pan/zoom latency | Use requestAnimationFrame, avoid layout thrashing |
| Inspector conflicts | Review existing event handlers, coordinate |
| User confusion on graph interactivity | Add help text, keyboard hints, tutorial |

---

## Timeline Estimate

**Week 1 (2-3 hours):**
- Monday: Design review + decision on Phase 2 approach
- Tuesday-Wednesday: Implement FOCUS
- Thursday: FOCUS testing + review
- Friday: Buffer

**Week 2 (8-12 hours):**
- Monday-Wednesday: Implement GRAPH phases
- Thursday: GRAPH testing + UAT
- Friday: Consolidate utilities + final testing

**Total:** 2–3 weeks

---

## Post-Refactor

**Phase 4F readiness:**
- ✅ GRAPH architecture ready for Three.js integration
- ✅ Node data available via inspector
- ✅ Click handlers extensible for navigation
- ✅ Event stream available for real-time updates

**Documentation:**
- Update dashboard README with new tab purposes
- Add keyboard shortcuts guide
- Create video demo (FOCUS glance, GRAPH exploration)

---

**End of Refactor Plan**

**Next Steps:**
1. User review & approval of decisions (4–7 above)
2. Create feature branch
3. Implement Phase 1 (FOCUS)
4. Gather feedback before Phase 2
