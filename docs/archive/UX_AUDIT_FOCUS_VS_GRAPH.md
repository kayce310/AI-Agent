# UX AUDIT: FOCUS vs GRAPH Tabs
**Date:** 2026-06-21  
**Status:** Analysis Only (No Implementation)  
**Scope:** Dashboard tabs FOCUS (⚡) and GRAPH (🔗)

---

## EXECUTIVE SUMMARY

**Problem:** FOCUS and GRAPH tabs are conceptually distinct but currently share identical layout patterns and serve overlapping purposes. Neither fulfills its intended use case.

**Current State:**
- ✅ Both tabs fetch data correctly
- ❌ FOCUS lacks real-time/live streaming purpose
- ❌ GRAPH canvas is a sidebar component, not the primary content area
- ❌ Both render card-based layouts (duplicate pattern)
- ❌ No clear functional separation in UX

**Recommendation:** Redesign FOCUS as a "live viewport" and GRAPH as a "visual knowledge network."

---

## COMPONENT INVENTORY

### Shared Components (Problematic)
| Component | Location | Used By |
|-----------|----------|---------|
| Task ID header | focus-task-id, graph-task-id | Both tabs |
| Task status badge | focus-task-status, graph-task-status | Both tabs |
| Card wrappers | .card class | Both tabs |
| Empty state messages | Multiple | Both tabs |
| Developer mode toggle | View toggle button | MISSION tab (affects both) |

### FOCUS-Specific Components
| Component | HTML Element | Purpose | Status |
|-----------|--------------|---------|--------|
| Goal card | focus-goal-card | Display current task goal | ✅ Working |
| Decision card | focus-decision-card | Show latest decision + reasoning | ✅ Working |
| Active tool card | focus-tool-card | Show currently running tool | ✅ Working |
| Reasoning card | focus-reasoning-card | Display model thinking | ✅ Working |

**Focus renderFocus() Implementation (lines 1040–1121):**
- Fetches taskId from currentTaskId or lastCompletedTaskId
- Queries allEvents for task_started, decision_made, tool_called/finished
- Renders reasoning-first: snippet > reason > "thinking..."
- Updates in real-time when renderAllFromState() called on event

### GRAPH-Specific Components
| Component | HTML Element | Purpose | Status |
|-----------|--------------|---------|--------|
| Graph header | graph-header | Task context + node/edge count | ✅ Working |
| SVG canvas | graph-svg | Visualization area | ✅ Renders |
| Legend | graph-legend | Node type reference | ✅ Present |

**Graph renderGraph() Implementation (lines 655–695):**
- Fetches graph from /api/graph/:taskId
- Calls drawGraph() which layouts nodes by type (3 columns)
- Renders SVG with edges + nodes
- Supports developer/user mode ID filtering

---

## CURRENT LAYOUT ANALYSIS

### FOCUS Tab (Current)
```
┌─────────────────────────────────────┐
│ Task ID: test-task-1 | ⚡ RUNNING   │ ← Header
├─────────────────────────────────────┤
│ GOAL                                │
│ "Build FastAPI auth service"        │
├─────────────────────────────────────┤
│ DECISION                            │
│ "Implement JWT middleware"          │
│ └─ Reasoning: "Token validation..." │
├─────────────────────────────────────┤
│ ACTIVE TOOL                         │
│ "🔧 search_knowledge_graph"         │
│ Status: Running... (04:31:57)       │
├─────────────────────────────────────┤
│ REASONING                           │
│ "Checking existing auth patterns... │
│ Found 3 similar implementations."   │
└─────────────────────────────────────┘
```

**Problems:**
- Reasoning appears TWICE (in DECISION card + separate REASONING card)
- Card-stacking layout not optimized for "glance readability"
- No visual hierarchy for live updates
- No streaming/animation for real-time events
- Not suitable for laptop sidecar display (too tall)

### GRAPH Tab (Current)
```
┌─────────────────────────────────────┐
│ COGNITIVE GRAPH                     │
│ test-task-1 | 4 nodes | 3 edges     │
├─────────────────────────────────────┤
│                                     │
│  Decision ── Tool ── Artifact       │ ← SVG (600px height)
│  Decision ── Tool ── Artifact       │
│                                     │
├─────────────────────────────────────┤
│ Legend                              │
│ ● Decision  ● Tool  ● Artifact      │
│ ─ Caused    ─ Produced              │
└─────────────────────────────────────┘
```

**Problems:**
- SVG canvas is 600px tall (not full viewport)
- Legend treated as secondary (should be integrated)
- Column layout (3-column forced) doesn't scale for large graphs
- No interactivity (hover tooltip only logs to dev console)
- No zoom/pan controls
- Legend is a card (same as FOCUS, suggesting UI confusion)

---

## FUNCTIONAL REQUIREMENTS ANALYSIS

### What FOCUS Should Be
| Requirement | Current | Needed |
|-------------|---------|--------|
| Real-time "what now?" view | ❌ Static cards | ✅ Live streaming |
| Laptop sidecar display | ❌ Too tall | ✅ Compact, 3-4 rows |
| Glance readability | ❌ Card stacking | ✅ Prominent status |
| Minimal context | ❌ Includes everything | ✅ Only current state |
| Animation on new events | ❌ None | ✅ Pulse/fade on updates |
| No scrolling needed | ❌ Requires scroll | ✅ Fits viewport |
| Goal + Decision + Tool | ✅ Present | ✅ Keep, optimize |

### What GRAPH Should Be
| Requirement | Current | Needed |
|-----------|---------|--------|
| Visual decision tree | ⚠️ Basic SVG | ✅ Hierarchical layout |
| Interactive exploration | ❌ Static | ✅ Click nodes for details |
| Full task history | ✅ Data available | ✅ Visualize all decisions |
| Node details on hover | ⚠️ Logs to console only | ✅ Tooltip/inspector |
| Causal relationships | ✅ Data exists | ✅ Edge styling prominent |
| Primary content area | ❌ Sidebar SVG | ✅ Full viewport canvas |
| Zoom/pan controls | ❌ Missing | ✅ Interactive navigation |
| Developer vs User mode | ✅ Data filtering works | ✅ Keep, enhance |

---

## DUPLICATE RENDERING PATHS

### Shared Logic (Code Smell)
```javascript
// Both tabs do this:
const taskId = currentTaskId || lastCompletedTaskId;
if (!taskId) {
  // empty state
  return;
}
// Fetch from events OR API
// Render to specific DOM elements
```

**Result:** Two independent rendering pipelines for same source data.

### Current Flow
```
Events (raw)
  ├─ renderFocus() → focus-goal, focus-decision, focus-tool, focus-reasoning
  └─ renderGraph() → graph-svg (via fetch /api/graph/:taskId)
```

**Problem:** Graph re-fetches what trace-builder already computed. FOCUS rebuilds from raw events (same as old app.js trace logic).

---

## UNUSED GRAPH CANVAS POTENTIAL

Current drawGraph() (lines 711–790):
- ✅ Renders nodes + edges to SVG
- ❌ No interactivity beyond mouseenter logging
- ❌ Fixed column layout (not hierarchical)
- ❌ No zoom/pan
- ❌ No node selection
- ❌ No legend integration

**What's Missing:**
1. **Click Handler:** Select node → show inspector panel with full node details
2. **Hover Tooltip:** Display node.label + node.payload on hover
3. **Layout Algorithm:** Force-directed or hierarchical (not 3-column)
4. **Pan/Zoom:** SVG transform controls or use D3/Cytoscape
5. **Edge Highlighting:** On hover, highlight connected nodes
6. **Task Selection:** Click decision node → load that subtask's trace

---

## PROPOSED ARCHITECTURE

### FOCUS Tab — Real-Time Viewport
**Purpose:** "What is the agent doing RIGHT NOW?"

**Layout (Compact, No Scroll):**
```
┌──────────────────────────────────┐
│ STATUS BAR                        │
│ Task: test-task-1 | ⚡ RUNNING    │
│ Elapsed: 2m 15s                  │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ GOAL (1 line, truncate if long)  │
│ Build FastAPI auth service       │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ REASONING-FIRST DECISION         │ ← Primary focus
│ "Implement JWT middleware"       │
│                                  │
│ Why: "Token validation pattern   │
│ found in 3 existing services"    │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│ ACTIVE TOOL (Live update pulse)  │
│ 🔧 search_knowledge_graph        │
│ ⏱ 3.2s (running...)              │
└──────────────────────────────────┘
```

**Behavior:**
- Updates in real-time as events arrive
- Pulse/fade animation on change
- No scrolling ever
- Fit in 400px height max
- Keyboard: Alt+F to focus, Esc to unfocus

**CSS Changes:**
- Remove card-stacking, use grid layout
- Combine Decision + Reasoning into single visual unit
- Condense margins/padding
- Add pulse animation on innerHTML changes
- Monospace for timestamps

**JS Changes:**
- Merge focus-decision-card + focus-reasoning-card into single component
- Remove duplicate reasoning rendering
- Add animation class on update
- Cache taskId to detect changes (trigger animation)

---

### GRAPH Tab — Visual Knowledge Network
**Purpose:** "What decisions led here? What's the causal chain?"

**Layout (Full Viewport):**
```
┌─────────────────────────────────────┐
│ COGNITIVE GRAPH                     │
│ Task: test-task-1 | 4 nodes | 3 edges
│ [Dev Mode] [Fit to View] [Reset]    │ ← Controls
├─────────────────────────────────────┤
│                                     │
│                   Decision 1        │
│                      ↓ (caused)     │
│               Tool A → Artifact 1   │
│                      ↓ (produced)   │
│                   Decision 2        │ ← Interactive SVG
│                      ↓ (caused)     │
│               Tool B → Artifact 2   │
│                                     │
│  [Scroll/Drag to pan, Wheel to zoom]│
├─────────────────────────────────────┤
│ Legend (integrated below canvas)    │
│ ● Decision  ● Tool  ● Artifact      │
│ ─ Caused    ─ Produced    ─ Followed│
└─────────────────────────────────────┘
```

**Features:**
- **Hierarchical Layout:** Father layout (left-to-right: time axis)
- **Interactive Nodes:** Click → show in inspector panel
- **Hover Details:** Tooltip with full node info
- **Pan/Zoom:** Mouse drag = pan, wheel = zoom (or use D3)
- **Edge Highlighting:** Hover edge → highlight source + target
- **Task Navigation:** Click decision → load that task's graph
- **Export:** Button to export as SVG or JSON

**SVG Structure:**
```svg
<svg id="graph-svg" class="graph-interactive">
  <defs>
    <marker id="arrow-caused">...</marker>
    <marker id="arrow-produced">...</marker>
  </defs>
  
  <!-- Zoom/pan group -->
  <g class="graph-zoom-area" transform="translate(X, Y) scale(Z)">
    <!-- Edges drawn first (behind nodes) -->
    <g class="graph-edges">
      <line class="edge caused-edge" data-from="..." data-to="..."></line>
      ...
    </g>
    
    <!-- Nodes drawn last (on top) -->
    <g class="graph-nodes">
      <g class="graph-node decision-node" data-id="..." data-node-id="...">
        <circle cx="..." cy="..." r="20"></circle>
        <text>...</text>
      </g>
      ...
    </g>
  </g>
</svg>
```

**JS Changes:**
- Replace drawGraph() with interactive version (use D3 or implement pan/zoom manually)
- Add click handlers to nodes → trigger inspector
- Add hover handlers to edges → highlight connected components
- Implement zoom/pan controls
- Add "Fit to View" button (zoom to fit all nodes)
- Cache graph state to avoid re-fetching on tab switch

---

## BEFORE/AFTER WIREFRAMES

### BEFORE: FOCUS Tab (Problematic)
```
Full height scroll view:
┌─────────────────────────────────────┐
│ Header: Task | Status               │  ← Small
├─────────────────────────────────────┤
│ GOAL Card (1 element)               │  ← Wasteful spacing
├─────────────────────────────────────┤
│ DECISION Card (2 elements)          │  ← Reasoning here
├─────────────────────────────────────┤
│ TOOL Card (1-2 elements)            │  ← Sparse
├─────────────────────────────────────┤
│ REASONING Card (1 element)          │  ← Duplicate!
├─────────────────────────────────────┤
│                                     │  ← Empty space
│                                     │
│                                     │
└─────────────────────────────────────┘

User reads: Goal → (scroll) → Decision → (scroll) → Tool → (scroll) → Reasoning
Problem: Fragmented, scrolling, duplicate reasoning
```

### AFTER: FOCUS Tab (Proposed)
```
Fixed viewport, no scroll:
┌──────────────────────────────────┐
│ test-task-1 | ⚡ RUNNING | 2m 15s │  ← Compact header
├──────────────────────────────────┤
│ Goal: Build FastAPI auth service │  ← 1 line
├──────────────────────────────────┤
│ ∴ Implement JWT middleware       │  ← Decision icon
│                                  │
│ Token validation pattern found   │  ← Integrated reasoning
│ in 3 existing services.          │
│                                  │
├──────────────────────────────────┤
│ 🔧 search_knowledge_graph        │  ← Active tool
│ ⏱ 3.2s (running...)              │
│                                  │
└──────────────────────────────────┘

User glances at: Status → Goal → Decision+Reasoning → Tool
Benefit: Compact, no scroll, real-time, unified decision view
```

### BEFORE: GRAPH Tab (Limited)
```
┌────────────────────────────────────┐
│ COGNITIVE GRAPH                    │
│ Task | Nodes | Edges               │  ← Basic header
├────────────────────────────────────┤
│                                    │
│  Decision   Tool   Artifact        │  ← Simple layout
│  Decision   Tool   Artifact        │
│                                    │
│ (SVG 600px, static, no interaction)
├────────────────────────────────────┤
│ Legend (as card)                   │  ← Separate element
│ ● Decision  ● Tool  ● Artifact     │
└────────────────────────────────────┘

User interaction: Look only (no hover tooltip, no pan/zoom)
Problem: Static, 3-column layout breaks with >5 decisions, no exploration
```

### AFTER: GRAPH Tab (Interactive)
```
┌────────────────────────────────────┐
│ COGNITIVE GRAPH - test-task-1      │
│ [Dev] [Fit] [Reset] [←] [→]        │  ← Controls
├────────────────────────────────────┤
│                                    │
│              Decision 1            │  ← Hierarchical layout
│              ↓ caused by           │  (time flows left→right)
│         Tool A (✓ 2.1s)            │
│         ↓ produced                 │
│         Artifact (code.py)         │  ← Interactive: hover
│         ↓ fed into                 │    shows tooltip
│              Decision 2            │  ← Click: select node
│              ↓ caused by           │    open inspector
│         Tool B (⏱ running)         │
│                                    │
│ [Drag to pan, Scroll to zoom]      │  ← Interactive controls
├────────────────────────────────────┤
│ Legend: ● Decision ● Tool ● Artifact
│ ─ Caused ─ Produced ─ Followed     │  ← Integrated below
└────────────────────────────────────┘

User interaction: Click nodes, hover edges, drag/zoom
Benefit: Explore decision chain, understand causality, select for detail
```

---

## REFACTOR PLAN

### Phase 1: FOCUS Optimization (Minimal)
**Goal:** Compact, real-time, no duplication

**Changes:**
1. **HTML:** Merge focus-decision-card + focus-reasoning-card into single component
   ```html
   <!-- BEFORE -->
   <div class="card focus-decision-card">...</div>
   <div class="card focus-reasoning-card">...</div>
   
   <!-- AFTER -->
   <div class="card focus-decision-reasoning-card">
     <div id="focus-decision" class="focus-reasoning-integrated">
       <div class="decision-text">...</div>
       <div class="reasoning-text">...</div>
     </div>
   </div>
   ```

2. **CSS:** Compact layout
   - Remove card stacking (use grid or flexbox)
   - Reduce padding/margin
   - Max-height: 400px, no overflow
   - Add pulse animation on innerHTML change
   - Monospace for times

3. **JS:** Remove duplicate rendering
   - Delete separate reasoning update logic
   - Combine into single renderFocus() output
   - Add animation trigger on taskId change

**Effort:** 2-3 hours (HTML/CSS/JS refactor)

### Phase 2: GRAPH Interactivity (Moderate)
**Goal:** Interactive node/edge exploration, proper layout

**Changes:**
1. **Layout Algorithm:** Replace 3-column with hierarchical
   - Use d3-hierarchy or custom force-directed layout
   - Or: Dagre (DAG layout)
   - Timeline axis: left = oldest decision, right = newest

2. **Interactivity:**
   - Click node → select + show in inspector
   - Hover edge → highlight source + target nodes
   - Hover node → tooltip with full details
   - Pan/zoom: Implement via SVG transform or D3

3. **Controls:**
   - [Fit to View] button → compute bounds, zoom to fit
   - [Reset] button → zoom to 100%, center
   - [Dev Mode] toggle → show/hide IDs
   - Keyboard: Arrow keys to pan, +/- to zoom

4. **HTML:** Add control bar above canvas
   ```html
   <div class="graph-controls">
     <button id="graph-fit">Fit to View</button>
     <button id="graph-reset">Reset</button>
     <label>
       <input type="checkbox" id="graph-dev-mode"> Dev Mode
     </label>
   </div>
   ```

5. **CSS:** Enhance SVG styling
   - Add hover states to nodes/edges
   - Highlight connected components on hover
   - Add cursor: pointer to interactive elements

6. **JS:** Replace drawGraph()
   - Use D3 (or custom SVG manipulation)
   - Implement zoom/pan handler
   - Add click/hover event handlers
   - Compute hierarchical layout

**Effort:** 8-12 hours (D3 integration or custom layout implementation)

### Phase 3: Data Sharing (Optional)
**Goal:** Eliminate duplicate trace computation

**Changes:**
1. Store CognitiveGraph in memory after first fetch
   - Cache key: taskId
   - Invalidate on new events affecting that task

2. FOCUS reads from same graph data (not raw events)
   - Use latest decision node from graph
   - Use latest tool node from graph

3. Result: Single source of truth (backend graph API)

**Effort:** 4-6 hours (caching + refactor renderFocus)

---

## RISK ASSESSMENT

### FOCUS Refactor
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaks existing responsive layout | Medium | Test on multiple viewports before commit |
| Animation performance | Low | Use CSS animations, not JS loops |
| Real-time update lag | Low | Current renderAllFromState() already efficient |

### GRAPH Refactor
| Risk | Impact | Mitigation |
|------|--------|-----------|
| D3 bundle size increase | Low | Already have heavy dependencies (investigate gzip impact) |
| Large graph rendering (100+ nodes) | High | Implement virtual scrolling or clustering |
| SVG transform performance | Medium | Use requestAnimationFrame for zoom/pan |
| Inspector panel conflicts | Low | Already implemented, reuse event handler pattern |

---

## TESTING STRATEGY

### FOCUS Tab
- ✅ Snapshot test: HTML structure (no duplication)
- ✅ Unit test: renderFocus() outputs correct HTML
- ✅ Integration test: Real-time update triggers animation
- ✅ E2E test: No scroll needed, all elements visible in 400px

### GRAPH Tab
- ✅ Unit test: Layout algorithm produces correct node positions
- ✅ Integration test: Click node → inspector shows details
- ✅ Snapshot test: SVG structure matches expected
- ✅ E2E test: Pan/zoom controls work, graph responsive to resize

---

## TIMELINE ESTIMATE

| Phase | Effort | Risk | Priority |
|-------|--------|------|----------|
| FOCUS optimization | 2-3h | Low | HIGH (quick win) |
| GRAPH interactivity | 8-12h | Medium | MEDIUM (adds value) |
| Data sharing | 4-6h | Low | LOW (nice-to-have) |

**Recommended:** Do FOCUS first (fast feedback), then GRAPH if time permits.

---

## DECISION POINTS FOR USER

1. **Should FOCUS be a fixed sidebar** (always visible) **or a tab?**
   - Current: Tab
   - Alternative: Sidecar pane (like Inspector)
   - Tradeoff: Tab = clean, Sidecar = always available

2. **Which layout algorithm for GRAPH?**
   - Hierarchical (clear decision flow, time axis)
   - Force-directed (organic, exploratory)
   - DAG (formal, mathematical)

3. **Should GRAPH cache data** or always fetch fresh?
   - Current: Fetches on tab switch
   - Cached: Faster tab switching, more memory
   - Fresh: Always current, slight latency

4. **What does clicking a GRAPH node do?**
   - Option A: Load that task in GRAPH (drill down)
   - Option B: Show node details in inspector (context)
   - Option C: Both (node selector + inspector)

---

## APPENDIX: Component Checklist

- [ ] FOCUS: Header (task ID, status, elapsed time)
- [ ] FOCUS: Goal display (1 line, no truncation)
- [ ] FOCUS: Decision + Reasoning merged (integrated reasoning)
- [ ] FOCUS: Active tool display (name, status, duration)
- [ ] FOCUS: Animation on update (pulse/fade)
- [ ] FOCUS: No scroll (fits 400px viewport)
- [ ] GRAPH: Header with node/edge count
- [ ] GRAPH: SVG canvas (full viewport width)
- [ ] GRAPH: Node click handler (open inspector)
- [ ] GRAPH: Edge hover handler (highlight connected)
- [ ] GRAPH: Pan/zoom controls
- [ ] GRAPH: [Fit to View] button
- [ ] GRAPH: [Reset] button
- [ ] GRAPH: [Dev Mode] toggle
- [ ] GRAPH: Integrated legend below canvas
- [ ] GRAPH: Tooltip on node hover
- [ ] GRAPH: Hierarchical layout algorithm
- [ ] Both: Developer mode ID filtering
- [ ] Both: No duplicate rendering paths
