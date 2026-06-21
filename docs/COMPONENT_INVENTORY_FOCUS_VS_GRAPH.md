# COMPONENT INVENTORY: FOCUS vs GRAPH
**Date:** 2026-06-21  
**Purpose:** Map current components and identify refactor targets

---

## HTML Structure Analysis

### FOCUS Tab (Current)
**File:** `src/dashboard/index.html` lines 125–163

```html
<!-- Focus Section (78 lines) -->
<section id="focus-view" class="hidden">
  <!-- Header -->
  <div class="card focus-header">
    <div class="focus-task-row">
      <div class="focus-task-id" id="focus-task-id">—</div>
      <div class="focus-task-status" id="focus-task-status">—</div>
    </div>
  </div>

  <!-- Goal Card -->
  <div class="card focus-goal-card">
    <div class="card-label">GOAL</div>
    <div id="focus-goal" class="focus-goal">Awaiting task</div>
  </div>

  <!-- Decision Card -->
  <div class="card focus-decision-card">
    <div class="card-label">DECISION</div>
    <div id="focus-decision" class="focus-decision">
      <div class="empty-state">No decision yet</div>
    </div>
  </div>

  <!-- Tool Card -->
  <div class="card focus-tool-card">
    <div class="card-label">ACTIVE TOOL</div>
    <div id="focus-tool" class="focus-tool">
      <div class="empty-state">No tool running</div>
    </div>
  </div>

  <!-- Reasoning Card (DUPLICATE!) -->
  <div class="card focus-reasoning-card">
    <div class="card-label">REASONING</div>
    <div id="focus-reasoning" class="focus-reasoning">
      <div class="empty-state">Awaiting reasoning...</div>
    </div>
  </div>
</section>
```

**Issues:**
- ❌ 4 separate .card elements (wasteful)
- ❌ focus-decision-card contains decision text
- ❌ focus-reasoning-card contains reasoning text (appears in BOTH!)
- ❌ Each card has label + content div (boilerplate)
- ❌ Empty state markup repeated 4x

**Refactor Target:**
```html
<!-- Proposed: 2 card sections -->
<section id="focus-view" class="hidden">
  <div class="focus-header">
    <div class="focus-task-id" id="focus-task-id">—</div>
    <div class="focus-task-status" id="focus-task-status">—</div>
  </div>

  <div class="focus-goal" id="focus-goal">Awaiting task</div>

  <div class="focus-decision-reasoning" id="focus-decision-reasoning">
    <div class="decision-text"></div>
    <div class="reasoning-text"></div>
  </div>

  <div class="focus-tool" id="focus-tool">
    <div class="empty-state">No tool running</div>
  </div>
</section>
```

---

### GRAPH Tab (Current)
**File:** `src/dashboard/index.html` lines 165–208

```html
<!-- Graph Section (43 lines) -->
<section id="graph-view" class="hidden">
  <!-- Header -->
  <div class="card graph-header">
    <div class="card-label">COGNITIVE GRAPH</div>
    <div id="graph-task-info" class="graph-task-info">
      <span id="graph-task-id" class="graph-task-id">—</span>
      <span id="graph-node-count" class="graph-node-count">0 nodes</span>
      <span id="graph-edge-count" class="graph-edge-count">0 edges</span>
    </div>
  </div>

  <!-- SVG Canvas -->
  <div id="graph-container" class="graph-container">
    <svg id="graph-svg" class="graph-svg" width="100%" height="600"></svg>
  </div>

  <!-- Legend -->
  <div class="card graph-legend">
    <div class="legend-title">Legend</div>
    <div class="legend-items">
      <div class="legend-item">
        <span class="legend-node decision-node">●</span>
        <span class="legend-label">Decision</span>
      </div>
      <!-- ... more items ... -->
    </div>
  </div>
</section>
```

**Issues:**
- ⚠️ SVG height is fixed (600px), should be flex/responsive
- ⚠️ Legend is a separate .card (should integrate below SVG)
- ✅ Structure is clean (header + canvas + legend)

**Refactor Target:**
```html
<!-- Proposed: Better responsive structure -->
<section id="graph-view" class="hidden">
  <div class="graph-header">
    <h2>COGNITIVE GRAPH</h2>
    <div class="graph-controls">
      <button id="graph-fit" title="Fit to view">Fit</button>
      <button id="graph-reset" title="Reset zoom">Reset</button>
      <label>
        <input type="checkbox" id="graph-dev-mode"> Dev
      </label>
    </div>
    <div class="graph-stats">
      <span id="graph-task-id">—</span>
      <span id="graph-node-count">0 nodes</span>
      <span id="graph-edge-count">0 edges</span>
    </div>
  </div>

  <div class="graph-canvas">
    <svg id="graph-svg" class="graph-interactive"></svg>
    <div class="graph-hint">Drag to pan • Scroll to zoom • Click node for details</div>
  </div>

  <div class="graph-legend">
    <div>● Decision</div>
    <div>● Tool</div>
    <div>● Artifact</div>
    <div>─ Caused</div>
    <div>─ Produced</div>
  </div>
</section>
```

---

## CSS Analysis

### FOCUS Styling
**File:** `src/dashboard/styles.css` (search: `.focus-*`)

```css
/* Current: ~100 lines of FOCUS-specific CSS */

.focus-header { ... }
.focus-task-row { ... }
.focus-task-id { ... }
.focus-task-status { ... }

.focus-goal-card { ... }
.focus-goal { ... }

.focus-decision-card { ... }
.focus-decision { ... }
.focus-decision-text { ... }
.focus-reasoning-snippet { ... }
.focus-reason { ... }

.focus-tool-card { ... }
.focus-tool { ... }
.tool-name { ... }
.tool-status { ... }

.focus-reasoning-card { ... }
.focus-reasoning { ... }
.focus-reasoning.thinking { ... }
```

**Issue:** Card-based styling with heavy padding/margins (desktop-oriented)

**Refactor:**
```css
/* Compact layout (100% → 50 lines) */

.focus-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
}

.focus-goal {
  padding: 8px 12px;
  font-size: 13px;
  line-height: 1.4;
}

.focus-decision-reasoning {
  padding: 12px;
  border-left: 2px solid var(--accent);
}

.focus-decision-reasoning .decision-text {
  font-weight: 600;
  margin-bottom: 4px;
}

.focus-decision-reasoning .reasoning-text {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.3;
}

.focus-tool {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
}

/* Animation */
@keyframes pulse-update {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.focus-decision-reasoning.updated {
  animation: pulse-update 200ms ease-out;
}
```

### GRAPH Styling
**File:** `src/dashboard/styles.css` (search: `.graph-*`)

```css
/* Current: ~130 lines of GRAPH-specific CSS */

.graph-header { ... }
.graph-task-info { ... }
.graph-task-id { ... }
.graph-node-count { ... }
.graph-edge-count { ... }

.graph-container { ... }
.graph-svg { ... }

/* SVG Node Styling */
.graph-node { ... }
.graph-node:hover circle { ... }
.decision-node circle { ... }
.tool-node circle { ... }
.artifact-node circle { ... }
.graph-node text { ... }

/* SVG Edge Styling */
.graph-edge { ... }
.caused-edge { ... }
.produced-edge { ... }
.followed-edge { ... }

/* Legend */
.graph-legend { ... }
.legend-title { ... }
.legend-items { ... }
.legend-item { ... }
.legend-node { ... }
.legend-edge { ... }
.legend-label { ... }
```

**Refactor:**
```css
/* Add interactive styles + responsive canvas */

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.graph-controls {
  display: flex;
  gap: 8px;
}

.graph-controls button,
.graph-controls label {
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}

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

.graph-hint {
  padding: 8px;
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
}

/* Interactive node states */
.graph-node circle {
  transition: stroke-width 200ms;
}

.graph-node:hover circle {
  stroke-width: 3;
}

.graph-node.selected circle {
  stroke-width: 4;
  filter: drop-shadow(0 0 4px var(--accent));
}

/* Edge highlighting on node hover */
.graph-edge.connected {
  opacity: 1;
  stroke-width: 2.5;
}

.graph-node:hover ~ .graph-edge,
.graph-edge:hover {
  opacity: 1;
}

.graph-edge {
  opacity: 0.5;
  transition: opacity 150ms;
}

/* Legend at bottom */
.graph-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
  padding: 12px;
  font-size: 11px;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
}
```

---

## JavaScript Rendering Logic

### renderFocus() Analysis
**File:** `src/dashboard/app.js` lines 1040–1121

```javascript
function renderFocus() {
  // 1. Get task ID
  const taskId = currentTaskId || lastCompletedTaskId;
  
  // 2. Early exit if no task
  if (!taskId) {
    // Reset 4 separate DIVs to empty state
    focusGoal.innerHTML = '...';
    focusDecision.innerHTML = '...';
    focusTool.innerHTML = '...';
    focusReasoning.innerHTML = '...';
    return;
  }

  // 3. Render header (taskId + status)
  focusTaskId.textContent = taskId;
  focusTaskStatus.textContent = taskEvent?.type === 'task_finished' ? ... : '⚡ RUNNING';

  // 4. Render goal
  focusGoal.textContent = startEvent?.payload?.goal || 'Goal unknown';

  // 5. Render decision (build HTML string)
  const latestDecisionEvent = allEvents.filter(...).sort(...)[0];
  if (latestDecisionEvent) {
    let decisionHtml = `<div>...</div>`;
    if (d.reasoningSnippet) {
      decisionHtml += `<div>...</div>`;  // DECISION has reasoning
    }
    focusDecision.innerHTML = decisionHtml;
  }

  // 6. Render tool
  const latestToolEvent = allEvents.filter(...).sort(...)[0];
  if (latestToolEvent && latestToolEvent.type === 'tool_called') {
    focusTool.innerHTML = `<div>...</div>`;
  }

  // 7. Render reasoning AGAIN (separate card!)
  if (latestDecisionEvent?.payload?.reasoningSnippet) {
    focusReasoning.textContent = latestDecisionEvent.payload.reasoningSnippet;
    focusReasoning.classList.add('thinking');
  }
}
```

**Issues:**
- ❌ Rebuilds from allEvents (same as old trace logic)
- ❌ String concatenation for HTML (XSS risk if not careful)
- ❌ Reasoning rendered in 2 places (#5 + #7)
- ❌ No animation trigger
- ❌ No caching of taskId changes

**Refactor:**
```javascript
function renderFocus() {
  const taskId = currentTaskId || lastCompletedTaskId;
  const focusSection = document.getElementById('focus-decision-reasoning');
  
  if (!taskId) {
    focusSection.innerHTML = '<div class="empty">No task</div>';
    return;
  }

  // Detect change for animation
  if (this.lastFocusTaskId !== taskId) {
    focusSection.classList.remove('updated');
    this.lastFocusTaskId = taskId;
  }

  // Get latest decision
  const decisionEvent = allEvents
    .filter(e => e.payload?.taskId === taskId && e.type === 'decision_made')
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!decisionEvent) {
    focusSection.innerHTML = '<div class="empty">No decision yet</div>';
    return;
  }

  const d = decisionEvent.payload;
  const reasoningText = d.reasoningSnippet || d.reason || 'Agent is thinking...';

  // Single unified render (not duplicate)
  focusSection.innerHTML = `
    <div class="decision-text">${escapeHtml(d.decision)}</div>
    <div class="reasoning-text">${escapeHtml(reasoningText)}</div>
  `;

  // Trigger animation only if content changed
  focusSection.offsetHeight; // Force reflow
  focusSection.classList.add('updated');
}
```

### renderGraph() Analysis
**File:** `src/dashboard/app.js` lines 655–807

```javascript
async function renderGraph() {
  const taskId = currentTaskId || lastCompletedTaskId;
  
  if (!taskId) {
    graphView.innerHTML = '<div class="empty-state">No task selected</div>';
    return;
  }

  try {
    // 1. Fetch from API (good!)
    const res = await fetch(`/api/graph/${taskId}`);
    const json = await res.json();
    
    if (!json.success || !json.data) {
      drawEmptyGraph();
      return;
    }

    // 2. Update header
    const graph = json.data;
    document.getElementById('graph-task-id').textContent = taskId;
    document.getElementById('graph-node-count').textContent = `${graph.nodes.length} nodes`;
    document.getElementById('graph-edge-count').textContent = `${graph.edges.length} edges`;

    // 3. Filter for user mode
    if (viewMode !== 'developer') {
      graph.nodes = graph.nodes.map(n => ({
        ...n,
        label: n.label.replace(/:[a-z0-9-]+$/i, ''),
      }));
    }

    // 4. Render (static layout)
    drawGraph(graph);
  } catch (err) {
    console.error('[renderGraph]', err);
  }
}

function drawGraph(graph) {
  const svg = document.getElementById('graph-svg');
  svg.innerHTML = '';

  // Add defs
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  // ...

  // Simple layout: 3 columns
  const cols = { decision: 100, tool: 350, artifact: 600 };
  let counts = { decision: 0, tool: 0, artifact: 0 };
  
  for (const node of graph.nodes) {
    const x = cols[node.type] || 100;
    const nodeY = 60 + counts[node.type] * 100;
    nodePositions.set(node.id, { x, y: nodeY });
    counts[node.type]++;
  }

  // Draw edges
  for (const edge of graph.edges) {
    const from = nodePositions.get(edge.from);
    const to = nodePositions.get(edge.to);
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('class', `graph-edge ${edge.relation}-edge`);
    svg.appendChild(line);
  }

  // Draw nodes
  for (const node of graph.nodes) {
    const pos = nodePositions.get(node.id);
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `graph-node ${node.type}-node`);
    
    // Add circle + text
    // ...
    
    g.addEventListener('mouseenter', (e) => {
      showNodeTooltip(e, node);
    });
    
    svg.appendChild(g);
  }
}

function showNodeTooltip(e, node) {
  // Dev mode only: log to console
  if (viewMode === 'developer') {
    console.log(`[${node.type}] ${node.label}`, node);
  }
}
```

**Issues:**
- ❌ showNodeTooltip() only logs to console (not visible to users)
- ❌ Fixed 3-column layout doesn't scale
- ❌ No click handlers
- ❌ No pan/zoom
- ❌ No hover edge highlighting
- ⚠️ SVG namespace required (verbose)

**Refactor:**
```javascript
async function renderGraph() {
  const taskId = currentTaskId || lastCompletedTaskId;
  
  if (!taskId) {
    document.getElementById('graph-svg').innerHTML = 
      '<text x="50%" y="50%">No task selected</text>';
    return;
  }

  try {
    const res = await fetch(`/api/graph/${taskId}`);
    const json = await res.json();
    
    if (!json.success) throw new Error('No graph data');

    this.graph = json.data;
    this.taskId = taskId;
    
    // Render from cached data
    renderGraphCanvas();
  } catch (err) {
    console.error('[renderGraph]', err);
    document.getElementById('graph-svg').innerHTML = 
      '<text x="50%" y="50%">Error loading graph</text>';
  }
}

function renderGraphCanvas() {
  const graph = this.graph;
  const svg = document.getElementById('graph-svg');
  
  // Layout: Use hierarchical algorithm
  const layout = layoutHierarchical(graph);
  
  // Render: Edges first (behind)
  graph.edges.forEach(edge => {
    renderEdge(svg, edge, layout);
  });
  
  // Render: Nodes (on top)
  graph.nodes.forEach(node => {
    renderNode(svg, node, layout);
  });
  
  // Setup interactivity
  setupGraphInteractivity();
}

function renderNode(svg, node, layout) {
  const pos = layout.positions.get(node.id);
  const g = createSVGElement('g');
  g.classList.add('graph-node', `${node.type}-node`);
  g.dataset.nodeId = node.id;
  g.dataset.nodeType = node.type;
  
  // Circle
  const circle = createSVGElement('circle');
  circle.setAttribute('cx', pos.x);
  circle.setAttribute('cy', pos.y);
  circle.setAttribute('r', 16);
  g.appendChild(circle);
  
  // Label
  const text = createSVGElement('text');
  text.setAttribute('x', pos.x);
  text.setAttribute('y', pos.y);
  text.textContent = node.label.substring(0, 12);
  g.appendChild(text);
  
  // Tooltip on hover
  g.addEventListener('mouseenter', () => {
    showNodeTooltip(node);
  });
  
  // Select on click
  g.addEventListener('click', () => {
    selectGraphNode(node);
  });
  
  svg.appendChild(g);
}

function showNodeTooltip(node) {
  // Create visible tooltip (not console.log!)
  const tooltip = document.getElementById('graph-tooltip') || 
    createTooltip();
  
  tooltip.innerHTML = `
    <div class="tooltip-title">${escapeHtml(node.label)}</div>
    <div class="tooltip-type">${node.type}</div>
    <div class="tooltip-id">${escapeHtml(node.id)}</div>
    ${node.payload ? `<div class="tooltip-payload">
      ${JSON.stringify(node.payload).substring(0, 100)}...
    </div>` : ''}
  `;
  
  tooltip.style.display = 'block';
  tooltip.style.left = event.clientX + 'px';
  tooltip.style.top = event.clientY + 'px';
}

function selectGraphNode(node) {
  // Clear previous selection
  document.querySelectorAll('.graph-node.selected').forEach(n => {
    n.classList.remove('selected');
  });
  
  // Select this node
  const nodeEl = document.querySelector(`[data-node-id="${node.id}"]`);
  nodeEl?.classList.add('selected');
  
  // Show in inspector
  renderInspector(node);
}

function setupGraphInteractivity() {
  const svg = document.getElementById('graph-svg');
  let panning = false;
  let startX, startY;
  
  svg.addEventListener('mousedown', (e) => {
    panning = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  
  svg.addEventListener('mousemove', (e) => {
    if (panning) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Apply transform
      updatePan(dx, dy);
    }
  });
  
  svg.addEventListener('mouseup', () => {
    panning = false;
  });
  
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoom = e.deltaY > 0 ? 0.9 : 1.1;
    updateZoom(zoom);
  });
  
  // Setup buttons
  document.getElementById('graph-fit')?.addEventListener('click', fitGraphToView);
  document.getElementById('graph-reset')?.addEventListener('click', resetGraphView);
}
```

---

## Duplicate Code Detection

### Pattern: Empty State
```javascript
// FOCUS
focusGoal.innerHTML = '<div class="empty-state">Awaiting task</div>';
focusDecision.innerHTML = '<div class="empty-state">No decision yet</div>';
focusTool.innerHTML = '<div class="empty-state">No tool running</div>';
focusReasoning.innerHTML = '<div class="empty-state">Awaiting reasoning...</div>';

// GRAPH
graphView.innerHTML = '<div class="empty-state">No task selected</div>';
drawEmptyGraph();

→ Consolidate into helper: renderEmptyState(container, message)
```

### Pattern: Task ID Lookup
```javascript
// FOCUS
const taskId = currentTaskId || lastCompletedTaskId;
if (!taskId) { /* empty state */ }

// GRAPH
const taskId = currentTaskId || lastCompletedTaskId;
if (!taskId) { /* empty state */ }

// MISSION
const taskId = agentState.currentTaskId || agentState.lastCompletedTaskId;

→ Create constant: function getCurrentTaskId() { ... }
```

### Pattern: Event Filtering & Sorting
```javascript
// FOCUS - Find latest decision
const latestDecisionEvent = allEvents
  .filter(e => e.payload?.taskId === taskId && e.type === 'decision_made')
  .sort((a, b) => b.timestamp - a.timestamp)[0];

// MISSION - Find latest decision
const decision = allEvents
  .filter(e => e.type === 'decision_made' && e.payload?.taskId === taskId)
  .sort((a, b) => b.timestamp - a.timestamp)[0];

// TRACE - Find decisions
const decisions = allEvents.filter(e => e.type === 'decision_made' && e.payload?.taskId === taskId);

→ Create helper: getLatestEvent(taskId, eventType)
```

---

## Summary Table: Component Refactor Matrix

| Component | Current | Proposed | Effort | Priority |
|-----------|---------|----------|--------|----------|
| FOCUS HTML | 5 cards | 2 sections | 30min | HIGH |
| FOCUS CSS | 100 lines | 50 lines | 45min | HIGH |
| FOCUS JS | 82 lines | 40 lines | 60min | HIGH |
| GRAPH HTML | 43 lines | 50 lines | 20min | MEDIUM |
| GRAPH CSS | 130 lines | 150 lines | 90min | MEDIUM |
| GRAPH JS drawGraph | 140 lines | 200+ lines (interactive) | 180min | MEDIUM |
| GRAPH JS interaction | 10 lines (console log) | 150+ lines (pan/zoom/click) | 240min | MEDIUM |
| Shared utilities | None | ~50 lines | 90min | LOW |
| **TOTAL** | **~600 lines** | **~600 lines** | **~12-15h** | — |

---

## Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Break FOCUS responsiveness | Medium | Medium | Test on 3 viewports |
| SVG rendering performance (50+ nodes) | Low | High | Implement virtual scrolling |
| D3/layout library adds 50KB | Low | Low | Benchmark gzip, consider custom layout |
| Pan/zoom latency | Low | Medium | Use requestAnimationFrame |
| Inspector panel conflicts | Low | Medium | Reuse existing event pattern |
| User confusion on new graph interactivity | Medium | Low | Add help text + keyboard hints |

---

## Acceptance Criteria

### FOCUS Tab Refactor
- [ ] No vertical scroll required (max 200px height)
- [ ] Pulse animation visible on decision/tool changes
- [ ] Reasoning not duplicated in HTML/rendering
- [ ] Works on 320px, 400px, and desktop viewports
- [ ] All tests pass (no regressions)

### GRAPH Tab Refactor
- [ ] SVG fills viewport height (responsive)
- [ ] Pan/zoom smooth (60fps)
- [ ] Click node → inspector shows details
- [ ] Hover node → tooltip appears
- [ ] Hover edge → highlights connected nodes
- [ ] [Fit to View] computes correct bounds
- [ ] Graph with 50+ nodes renders in <500ms
- [ ] All tests pass (no regressions)

---

**End of Component Inventory**
