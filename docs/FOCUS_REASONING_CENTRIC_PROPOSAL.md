# PHASE 4E-A: REASONING-CENTRIC FOCUS
**Date:** 2026-06-21 04:44 UTC  
**Status:** UX Proposal (No Implementation)  
**Scope:** Redesign FOCUS tab around agent's current thought

---

## Current Problem

FOCUS currently answers: **"What is the system doing?"** (telemetry-focused)

```
Current FOCUS (telemetry-centric):
├─ Task: test-task-1
├─ Status: ⚡ RUNNING
├─ Goal: Build FastAPI service
├─ Latest Decision: Implement JWT middleware
├─ Reasoning: (truncated to 200 chars)
├─ Active Tool: search_knowledge_graph
└─ Tool Status: Running... (04:31:57)
```

**Issue:** Reasoning is a sibling to other data, not the focus.

---

## Proposed FOCUS: Reasoning-Centric

FOCUS must answer: **"What is the agent thinking right now?"**

```
Proposed FOCUS (reasoning-centric):
┌───────────────────────────────────────┐
│                                       │
│   "Looking at existing JWT patterns   │  ← PRIMARY: Agent's thought
│    from 3 services. Found that all    │
│    use library X with middleware      │
│    pattern. Will reuse approach."     │
│                                       │
├───────────────────────────────────────┤
│ Next: Implement JWT middleware        │  ← PREDICTION
│ Confidence: High (pattern known)      │  ← CONFIDENCE
├───────────────────────────────────────┤
│ 🔧 search_knowledge_graph (3.2s ⏱)   │  ← SECONDARY: Current tool
├───────────────────────────────────────┤
│ ∴ JWT middleware implementation       │  ← TERTIARY: Decision label
│ for: Build FastAPI service            │  ← TERTIARY: Goal (context)
└───────────────────────────────────────┘
```

---

## Wireframe: Before vs After

### BEFORE (Current Telemetry Layout)
```
┌─────────────────────────────────┐
│ test-task-1 | ⚡ RUNNING        │ ← System focus
├─────────────────────────────────┤
│ GOAL                            │
│ Build FastAPI service           │
├─────────────────────────────────┤
│ DECISION                        │
│ Implement JWT middleware        │
├─────────────────────────────────┤
│ REASONING                       │
│ "Looking at existing JWT..."    │ ← Pushed down
├─────────────────────────────────┤
│ ACTIVE TOOL                     │
│ 🔧 search_knowledge_graph       │
└─────────────────────────────────┘

Visual hierarchy: Task Status → Goal → Decision → Reasoning → Tool
User reads: "Where am I?" → "What's the goal?" → "What's the decision?" → ... → "What's the thought?"
```

### AFTER (Reasoning-Centric)
```
┌─────────────────────────────────────┐
│                                     │
│  "Looking at existing JWT patterns  │ ← THOUGHT (Primary, large)
│   from 3 services. Found that all   │
│   use library X with middleware     │
│   pattern. Will reuse approach."    │
│                                     │
├─────────────────────────────────────┤
│ Next: Implement JWT middleware      │ ← PREDICTION (What next?)
│ ⬤ High confidence                   │ ← CONFIDENCE (How sure?)
├─────────────────────────────────────┤
│ 🔧 search_knowledge (3.2s)          │ ← TOOL (Secondary)
├─────────────────────────────────────┤
│ ∴ Middleware for: Build FastAPI     │ ← CONTEXT (Tertiary)
│   service                           │
└─────────────────────────────────────┘

Visual hierarchy: Reasoning (70%) → Prediction (15%) → Tool (10%) → Context (5%)
User reads: "What's the thought?" → "Where's it going?" → "What's running?" → "Why?"
```

---

## Data Mapping: Event → FOCUS Element

### 1. PRIMARY: Current Thought (Reasoning)

**Source:** Latest `decision_made` event payload

```javascript
const latestDecision = allEvents
  .filter(e => e.payload?.taskId === taskId && e.type === 'decision_made')
  .sort((a, b) => b.timestamp - a.timestamp)[0];

const currentThought = latestDecision?.payload?.reasoningSnippet 
  || latestDecision?.payload?.reason 
  || "Agent is thinking...";
```

**Rendering:** Large, center-aligned, monospace or serif (emphasis on readability)

```html
<div class="focus-thought">
  ${escapeHtml(currentThought)}
</div>
```

**Height:** 40–60% of viewport (must be readable, not truncated)

---

### 2. PREDICTION: Next Action + Confidence

**Source:** Latest `decision_made` event + optional confidence field

```javascript
const decision = latestDecision?.payload?.decision;  // "Implement JWT middleware"
const confidence = latestDecision?.payload?.confidence;  // 0.0–1.0 (optional)

// Next action = decision description
// Confidence = from payload, or infer from reasoning length (heuristic)
const inferredConfidence = currentThought.length > 500 ? 0.9 : 0.6;
```

**Rendering:**
```html
<div class="focus-prediction">
  <div class="prediction-action">Next: ${escapeHtml(decision)}</div>
  <div class="prediction-confidence">
    <span class="confidence-indicator" style="opacity: ${confidence}">●</span>
    ${confidence > 0.75 ? 'High' : confidence > 0.5 ? 'Medium' : 'Low'} confidence
  </div>
</div>
```

**Visual:** Smaller font, secondary color, confidence shown as:
- `●●●` (high, opacity 1.0)
- `●●○` (medium, opacity 0.65)
- `●○○` (low, opacity 0.3)

---

### 3. SECONDARY: Current Tool

**Source:** Latest `tool_called` or `tool_finished` event

```javascript
const latestToolEvent = allEvents
  .filter(e => e.payload?.taskId === taskId && (e.type === 'tool_called' || e.type === 'tool_finished'))
  .sort((a, b) => b.timestamp - a.timestamp)[0];

const toolName = latestToolEvent?.payload?.toolName;
const isRunning = latestToolEvent?.type === 'tool_called';
const duration = latestToolEvent?.payload?.durationMs;
```

**Rendering:**
```html
<div class="focus-tool">
  <span class="tool-icon">🔧</span>
  <span class="tool-name">${escapeHtml(toolName)}</span>
  ${isRunning ? `<span class="tool-timer">${duration}ms ⏱</span>` : `<span class="tool-result">${duration}ms ✓</span>`}
</div>
```

**Visual:** Small, right-aligned or bottom-aligned, status emoji (🔧 running, ✓ done, ✗ failed)

---

### 4. TERTIARY: Context (Goal + Decision Label)

**Source:** Task goal + latest decision type

```javascript
const goal = allEvents
  .find(e => e.payload?.taskId === taskId && e.type === 'task_started')
  ?.payload?.goal;

const decisionLabel = latestDecision?.payload?.decision;
```

**Rendering:**
```html
<div class="focus-context">
  <span class="context-symbol">∴</span>
  <span class="context-decision">${escapeHtml(decisionLabel)}</span>
  <span class="context-for">for:</span>
  <span class="context-goal">${escapeHtml(goal)}</span>
</div>
```

**Visual:** Footer bar, very small text, muted color (var(--text-dim)), single line

---

## HTML Structure (Proposed)

**Current:**
```html
<section id="focus-view" class="hidden">
  <div class="card focus-header">
    <div class="focus-task-id">—</div>
    <div class="focus-task-status">—</div>
  </div>
  <div class="card focus-goal-card">
    <div class="card-label">GOAL</div>
    <div id="focus-goal"></div>
  </div>
  <div class="card focus-decision-card">
    <div id="focus-decision"></div>
  </div>
  <div class="card focus-tool-card">
    <div id="focus-tool"></div>
  </div>
  <div class="card focus-reasoning-card">
    <div id="focus-reasoning"></div>
  </div>
</section>
```

**Proposed:**
```html
<section id="focus-view" class="focus-reasoning-centric hidden">
  <!-- Thought: Primary element (no card wrapper) -->
  <div class="focus-thought-area" id="focus-thought-area">
    <div class="focus-thought" id="focus-thought">
      Awaiting reasoning...
    </div>
  </div>

  <!-- Prediction + Confidence -->
  <div class="focus-prediction-bar" id="focus-prediction-bar">
    <div class="prediction-action" id="focus-prediction-action">—</div>
    <div class="prediction-confidence" id="focus-prediction-confidence">
      <span class="confidence-dots">●○○</span>
    </div>
  </div>

  <!-- Tool (Secondary) -->
  <div class="focus-tool-bar" id="focus-tool-bar">
    <span class="tool-icon">🔧</span>
    <span class="tool-name" id="focus-tool-name">—</span>
    <span class="tool-status" id="focus-tool-status">—</span>
  </div>

  <!-- Context (Tertiary) -->
  <div class="focus-context-footer" id="focus-context-footer">
    <span class="context-symbol">∴</span>
    <span class="context-decision" id="focus-context-decision">—</span>
    <span class="context-for">for:</span>
    <span class="context-goal" id="focus-context-goal">—</span>
  </div>
</section>
```

**Changes:**
- Removed: `.card` wrappers, `.card-label`, task-id/status headers
- Removed: Separate goal/decision/tool/reasoning cards
- Added: Unified semantic layout (thought → prediction → tool → context)
- Added: `data-*` attributes for DOM references

---

## CSS (Proposed)

```css
/* Reasoning-Centric FOCUS */

.focus-reasoning-centric {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
  padding: 0;
}

/* Thought Area: 60% of viewport (primary visual space) */
.focus-thought-area {
  flex: 0.6;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 60px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  overflow-y: auto;
}

.focus-thought {
  font-size: 18px;
  line-height: 1.8;
  color: var(--text);
  font-family: 'Georgia', 'Serif';  /* or monospace for code-like reasoning */
  text-align: center;
  max-width: 800px;
  word-wrap: break-word;
  hyphens: auto;
}

.focus-thought.active {
  animation: thought-appear 300ms ease-out;
}

@keyframes thought-appear {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

/* Prediction Bar: 15% */
.focus-prediction-bar {
  flex: 0.15;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 40px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  font-size: 14px;
}

.prediction-action {
  color: var(--text);
  font-weight: 600;
}

.prediction-confidence {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-dim);
}

.confidence-dots {
  letter-spacing: 2px;
  font-size: 16px;
}

/* Tool Bar: 10% */
.focus-tool-bar {
  flex: 0.1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 40px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  font-size: 13px;
}

.tool-icon {
  font-size: 18px;
}

.tool-name {
  color: var(--text);
  font-weight: 500;
}

.tool-status {
  color: var(--text-dim);
  font-size: 12px;
  margin-left: auto;
}

/* Context Footer: 5% */
.focus-context-footer {
  flex: 0.05;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 40px;
  background: var(--bg);
  font-size: 11px;
  color: var(--text-dim);
  line-height: 1.2;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.context-symbol {
  color: var(--accent);
  font-weight: 600;
  margin-right: 4px;
}

.context-decision {
  color: var(--text);
  font-weight: 500;
}

.context-for {
  margin: 0 4px;
}

.context-goal {
  color: var(--text-dim);
}

/* Responsive: Mobile */
@media (max-width: 600px) {
  .focus-thought-area {
    padding: 20px 30px;
  }

  .focus-thought {
    font-size: 16px;
    line-height: 1.6;
  }

  .focus-prediction-bar,
  .focus-tool-bar,
  .focus-context-footer {
    padding: 12px 30px;
    font-size: 12px;
  }

  .focus-thought-area {
    flex: 0.5;
  }

  .focus-prediction-bar {
    flex: 0.2;
  }

  .focus-tool-bar {
    flex: 0.15;
  }

  .focus-context-footer {
    flex: 0.15;
  }
}
```

---

## JavaScript Implementation

```javascript
function renderFocusReasoningCentric() {
  const taskId = currentTaskId || lastCompletedTaskId;
  
  if (!taskId) {
    document.getElementById('focus-thought').textContent = 'No task running';
    document.getElementById('focus-prediction-action').textContent = '—';
    document.getElementById('focus-tool-name').textContent = '—';
    document.getElementById('focus-context-decision').textContent = '—';
    return;
  }

  // 1. THOUGHT: Latest reasoning
  const latestDecision = allEvents
    .filter(e => e.payload?.taskId === taskId && e.type === 'decision_made')
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const thought = latestDecision?.payload?.reasoningSnippet 
    || latestDecision?.payload?.reason 
    || 'Agent is thinking...';

  const thoughtEl = document.getElementById('focus-thought');
  thoughtEl.textContent = thought;
  thoughtEl.classList.add('active');

  // 2. PREDICTION + CONFIDENCE
  const decision = latestDecision?.payload?.decision;
  const confidence = latestDecision?.payload?.confidence || 0.7;

  document.getElementById('focus-prediction-action').textContent = 
    `Next: ${decision || 'Deciding...'}`;

  const confidenceDots = confidence > 0.75 ? '●●●' 
    : confidence > 0.5 ? '●●○' 
    : '●○○';
  document.getElementById('focus-prediction-confidence').innerHTML = 
    `<span class="confidence-dots">${confidenceDots}</span>`;

  // 3. TOOL: Latest tool_called or tool_finished
  const latestTool = allEvents
    .filter(e => e.payload?.taskId === taskId && 
      (e.type === 'tool_called' || e.type === 'tool_finished'))
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  if (latestTool) {
    const toolName = latestTool.payload.toolName;
    const duration = latestTool.payload.durationMs || 0;
    const isRunning = latestTool.type === 'tool_called';

    document.getElementById('focus-tool-name').textContent = toolName;
    document.getElementById('focus-tool-status').textContent = 
      isRunning ? `${duration}ms ⏱` : `${duration}ms ✓`;
  } else {
    document.getElementById('focus-tool-name').textContent = '—';
    document.getElementById('focus-tool-status').textContent = '—';
  }

  // 4. CONTEXT: Goal + Decision
  const goal = allEvents
    .find(e => e.payload?.taskId === taskId && e.type === 'task_started')
    ?.payload?.goal;

  document.getElementById('focus-context-decision').textContent = 
    decision || '—';
  document.getElementById('focus-context-goal').textContent = 
    goal || '—';
}
```

**Call site:** Same as current — `renderFocusReasoningCentric()` called from `renderAllFromState()` on event updates.

---

## How This Makes FOCUS Different

| Aspect | MISSION | TRACE | GRAPH | FOCUS (Old) | FOCUS (New) |
|--------|---------|-------|-------|-------------|------------|
| **Answers** | What's queued next? | What happened? | What caused what? | What am I doing? | What am I thinking? |
| **Time** | Future | Past | Past (causal) | Present | Present (mind) |
| **Primary** | Next action queue | Timeline of events | Decision nodes | Telemetry | Reasoning snippet |
| **Use case** | See what's coming | Audit trail | Understand causality | Monitor status | Understand intent |
| **Primary user** | Task planner | Debugger | Analyst | Monitor | Human reader |
| **Layout** | Vertical list | Cards with timeline | Graph/network | Cards | Large centered text |
| **Scrolling** | Yes (many tasks) | Yes (many events) | Pan/zoom | No | No |
| **Visual focus** | Action names | Event details | Nodes + edges | Status badge | Agent's thought |

**Distinction from MISSION:**
- MISSION shows: "Next 5 tasks queued"
- FOCUS shows: "Current thought about current task"

**Distinction from TRACE:**
- TRACE shows: "Decision 1 → Tool A → Decision 2 → Tool B → ..."
- FOCUS shows: "Why did I make the current decision?"

**Distinction from GRAPH:**
- GRAPH shows: "Causal network of all decisions in this task"
- FOCUS shows: "Agent's current mental state"

---

## Implementation Effort Estimate

| Task | Effort | Notes |
|------|--------|-------|
| Redesign HTML (remove cards, add sections) | 30 min | Semantic restructuring, no logic |
| CSS refactor (layout change, animations) | 60 min | Flex layout, responsive design |
| JS refactor (new renderFocusReasoningCentric) | 45 min | Same data sources, new layout |
| Add confidence tracking (optional) | 30 min | Parse from event or heuristic |
| Test (visual, responsive, real-time updates) | 60 min | 3 viewports, animation smoothness |
| **Total** | **225 min** | **~4 hours** |

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Thought text overflow | Low | Medium | Clamp to 3–4 lines, scrollable area |
| Thought not updated on new decision | Low | High | Use event listener + animation |
| Mobile layout breaks | Medium | Medium | Test on 320px/600px viewports |
| Confidence field missing from events | High | Low | Use heuristic (reasoning length) |
| User confusion on "what is this tab?" | Medium | Low | Add help text: "What the agent is thinking" |

---

## Success Criteria

- ✅ Reasoning occupies 50–60% of visible space (not truncated)
- ✅ Prediction bar visible (next action + confidence)
- ✅ Tool status shown (secondary)
- ✅ Context footer minimal (tertiary)
- ✅ Updates in real-time (<100ms) on decision_made events
- ✅ Responsive on 320px, 600px, 1200px
- ✅ Distinct from MISSION/TRACE/GRAPH in visual purpose
- ✅ User can understand "I'm looking at the agent's thought" immediately

---

## Decision Points

1. **Font for reasoning:** Monospace (code-like) or serif (readable prose)?
2. **Confidence source:** Use `payload.confidence` field, or heuristic (reasoning length)?
3. **Thought area size:** 50%, 60%, or 70% of viewport?
4. **Tooltip on hover:** Show full reasoning on click/hover, or always visible?

---

**End of Proposal**

**Status:** Ready for decision on:
1. Proceed with this redesign?
2. Font choice (monospace vs serif)?
3. Confidence tracking approach?
