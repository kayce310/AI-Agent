# KATO AGENT — DASHBOARD ARCHITECTURE
**Date:** 2026-06-21  
**Version:** 9.2.0  
**Language:** Vietnamese (Objectives & Principles) | English (Technical)

---

## MỤC TIÊU DASHBOARD

### Chính (Primary Goal)
Cung cấp **real-time cognitive viewport** để người dùng hiểu:
- **Agent đang suy nghĩ gì** (reasoning-first)
- **Agent sẽ làm gì tiếp theo** (prediction)
- **Agent đang chạy công cụ nào** (active tools)
- **Tại sao agent lại quyết định thế** (decision causality)

### Phụ (Secondary Goals)
1. **Observability** — Audit trail đầy đủ cho debugging
2. **Control** — Người dùng có thể pause/inspect/modify
3. **Performance** — <100ms latency UI updates
4. **Scalability** — Support 1000+ events per task

---

## NGUYÊN LÝ THIẾT KẾ

### 1. Reasoning-First
**Định nghĩa:** Tất cả UX phải ưu tiên hiển thị reasoning (suy nghĩ của agent) trước telemetry.

**Ví dụ:**
- ❌ WRONG: "Task-123 | ⚡ RUNNING | Decision: X | Reasoning: ..."
- ✅ RIGHT: "[Full reasoning text] | Next: X | Tool: search_knowledge"

### 2. Single Source of Truth
**Định nghĩa:** Backend (EventBus → SQLite) là nguồn sự thật duy nhất. Frontend không rebuild/reconstruct data.

**Ví dụ:**
- ❌ WRONG: Frontend calculates CognitiveTrace từ allEvents
- ✅ RIGHT: Frontend calls GET /api/trace/:taskId, backend returns CognitiveTrace

### 3. Event-Driven, No Polling
**Định nghĩa:** WebSocket broadcasts events realtime. UI updates ngay khi event đến. Không có timer/interval polling.

**Ví dụ:**
- ❌ WRONG: setInterval(() => fetch('/api/status'), 1000ms)
- ✅ RIGHT: ws.on('decision_made', event => renderFocus())

### 4. Conditional Rendering (No CSS Hide)
**Định nghĩa:** Trong User Mode, không hiển thị internal IDs (taskId, decisionId, callId). Render condition, không `display: none`.

**Ví dụ:**
- ❌ WRONG: `<span id="task-123" style="display: none">task-123</span>` (HTML exists, hidden)
- ✅ RIGHT: `if (viewMode === 'developer') { render taskId }` (HTML doesn't exist)

### 5. Data-Driven State
**Định nghĩa:** Tất cả UI state phải reconstruct từ `agentState` object, không local component state.

**Ví dụ:**
- ❌ WRONG: `let currentTool = null; onToolEvent(t) => currentTool = t;`
- ✅ RIGHT: `const currentTool = agentState.currentTool; render(currentTool)`

---

## CẤU TRÚC HIỆN TẠI

### A. File Organization

```
src/dashboard/
├── index.html          (210 lines) — Markup + tab structure
├── styles.css          (1,600+ lines) — Layout + animations + responsive
├── app.js              (1,137 lines) — Logic + event handling + rendering
└── [No backend in dashboard]

src/core/events/
├── bus.ts              — EventBus: publish/subscribe pattern
├── store.ts            — EventStore: SQLite persistence
├── logger.ts           — EventLogger: event creation
├── api.ts              — EventApi: REST endpoints (/api/trace, /api/graph)
├── trace-builder.ts    — CognitiveTrace: deterministic trace building
└── graph-builder.ts    — CognitiveGraphBuilder: decision graph

src/core/events/http-server.ts
                        — HTTP routes: /api/trace/:taskId, /api/graph/:taskId
```

### B. HTML Structure (4 Tabs)

```html
<header>
  KATO AGENT [status]
  [MISSION] [🧠 TRACE] [⚡ FOCUS] [🔗 GRAPH]
  [0 events] [◐ theme]
</header>

<main id="workspace">
  <!-- TAB 1: MISSION (default, operational) -->
  <section id="mission-view">
    CURRENT MISSION
      goal, status
    
    SPLIT PANEL
      LEFT:  ACTIVE TOOLS (list)
      RIGHT: CURRENT DECISION (latest decision + reasoning)
    
    NEXT ACTION
      what's queued next
    
    TIMELINE
      event history (filtered by type)
    
    FILE CHANGES
      files created/modified
    
    TELEMETRY DEBUG
      decisions with reasoning (dev mode: show IDs)
    
    ERROR DISPLAY
      if error occurred
  </section>

  <!-- TAB 2: TRACE (historical) -->
  <section id="trace-view" hidden>
    TRACE CONTEXT
      task-id, status
    
    TRACE CONTAINER
      linear timeline of decisions + tools + artifacts
  </section>

  <!-- TAB 3: FOCUS (reasoning-centric, realtime) -->
  <section id="focus-view" hidden>
    FOCUS THOUGHT CONTAINER (60% viewport)
      [agent's full reasoning, monospace, no truncation]
    
    FOCUS PREDICTION SECTION (15%)
      Next: [action]
      Confidence: [%]
    
    FOCUS TOOL SECTION (10%)
      🔧 [tool name] [status] [duration]
    
    FOCUS CONTEXT FOOTER (5%)
      [goal] | [⚡ RUNNING]
  </section>

  <!-- TAB 4: GRAPH (structural) -->
  <section id="graph-view" hidden>
    GRAPH HEADER
      task-id, node count, edge count
    
    SVG CANVAS
      [nodes + edges, 3-column layout]
    
    LEGEND
      decision node, tool node, artifact node, edges
  </section>

  <!-- INSPECTOR PANEL (right side, on-demand) -->
  <aside id="inspector" hidden>
    [Click entity → inspector shows details]
  </aside>
</main>
```

### C. JavaScript Runtime State

```javascript
// Global state (src/dashboard/app.js, lines 1-70)

let allEvents = [];                  // All events received
let agentState = {
  currentTaskId: null,               // Active task
  lastCompletedTaskId: null,         // Last finished task
  currentGoal: null,                 // Task goal
  status: 'idle',                    // idle | working | completed | error
  activeTools: [],                   // Currently running tools
  recentDecisions: [],               // Last N decisions (for CURRENT DECISION)
  fileChanges: [],                   // Files created/modified
  errors: []                         // Recent errors
};

let viewMode = 'user';               // 'user' | 'developer'
let activeTab = 'mission';           // Current tab
let currentTaskId = null;            // Shorthand
let lastCompletedTaskId = null;      // Shorthand
```

### D. Rendering Pipeline

```
WebSocket event arrives
  ↓
on('message', msg)
  ↓
event = JSON.parse(msg)
  ↓
applyEvent(event)           [Updates agentState]
  ↓
renderAllFromState()         [Trigger all render functions]
  ↓
┌──────────────────────────────────────────┐
│ renderMission()          [MISSION tab]    │
│ renderActiveTools()      [tools list]     │
│ renderCurrentDecision()  [decision card]  │
│ renderNextAction()       [queue]          │
│ renderTimeline()         [history]        │
│ renderFileChanges()      [files]          │
│ renderTelemetryDebug()   [dev debug]      │
│ renderError()            [error display]  │
│ renderTrace()            [TRACE tab]      │
│ renderFocus()            [FOCUS tab]      │
│ renderGraph()            [GRAPH tab]      │
└──────────────────────────────────────────┘
  ↓
DOM updated (no polling, event-driven)
```

### E. API Layer (Backend)

```
GET /api/trace/:taskId
  → EventApi.getTrace(taskId)
  → buildCognitiveTrace(taskId, allEvents)
  → Returns: { taskId, nodes: [{...}], edges: [{...}] }

GET /api/graph/:taskId
  → EventApi.getGraph(taskId)
  → traceToGraph(trace)
  → Returns: { taskId, nodes: [{...}], edges: [{...}] }

GET /api/events
  → EventApi.getEvents()
  → Paginated event list

GET /api/health
  → System status
```

### F. CSS Architecture

```css
/* Variables */
:root {
  --bg: #0a0e27;           /* Dark background */
  --bg-card: #111833;      /* Card background */
  --text: #e4e6eb;         /* Primary text */
  --text-dim: #8892a4;     /* Secondary text */
  --accent: #00d4ff;       /* Highlight color */
  --border: #1a1f3a;       /* Border color */
}

/* Layout */
#status-bar              /* Header: 60px */
#workspace               /* Main content: flex column */
#mission-view            /* Mission tab: card-based layout */
#trace-view              /* Trace tab: timeline */
#focus-view              /* Focus tab: flex column (60/15/10/5) */
#graph-view              /* Graph tab: SVG canvas */
#inspector               /* Right panel: slide-in (hidden by default) */

/* Components */
.card                    /* Wrapper: border + padding + bg */
.card-label              /* Title: uppercase, small font */
.split-panel             /* 2-column layout */
.timeline-list           /* Event cards: vertical stack */
.active-tools-list       /* Tool badges: horizontal flow */

/* Focus Mode (Reasoning-Centric) */
.focus-thought-container    /* 60% of viewport */
.focus-prediction-section   /* 15% */
.focus-tool-section         /* 10% */
.focus-context-footer       /* 5% */

/* Responsive */
@media (max-width: 1024px)   /* Tablet */
@media (max-width: 600px)    /* Mobile */
```

---

## EVENT FLOW (Detailed)

### 1. Event Created (Backend)
```javascript
// src/core/engine/engine.ts
agent.onEvent('tool:call', (data) => {
  eventLogger.decisionMade(
    taskId,
    decisionId,
    decision,
    reason,
    nextAction,
    reasoningSnippet
  );
});
```

### 2. Event Logged
```javascript
// src/core/events/logger.ts
decisionMade(...) {
  const event = {
    type: 'decision_made',
    taskId,
    decisionId,
    timestamp,
    payload: { decision, reason, reasoningSnippet, nextAction }
  };
  this.eventBus.emit('decision_made', event);
}
```

### 3. Event Persisted
```javascript
// src/core/events/store.ts
eventBus.on('decision_made', (event) => {
  sqlite.insert('events', event);
  sqlite.insert('snapshots', agentState); // Periodic
});
```

### 4. Event Broadcast (WebSocket)
```javascript
// src/core/events/http-server.ts
eventBus.on('*', (event) => {
  ws.broadcast(JSON.stringify(event));
});
```

### 5. Event Received (Dashboard)
```javascript
// src/dashboard/app.js
ws.on('message', (msg) => {
  const event = JSON.parse(msg);
  applyEvent(event);        // Update agentState
  renderAllFromState();     // Trigger renders
});
```

### 6. State Updated
```javascript
// src/dashboard/app.js
function applyEvent(event) {
  allEvents.push(event);
  
  switch(event.type) {
    case 'decision_made':
      agentState.recentDecisions.unshift(event.payload);
      agentState.status = 'working';
      break;
    case 'task_started':
      agentState.currentTaskId = event.payload.taskId;
      agentState.currentGoal = event.payload.goal;
      break;
    // ... more cases
  }
}
```

### 7. UI Rendered
```javascript
// src/dashboard/app.js
function renderFocus() {
  const thought = agentState.recentDecisions[0]?.reasoningSnippet
                  || agentState.recentDecisions[0]?.reason
                  || 'Agent is thinking...';
  
  document.getElementById('focus-thought').textContent = thought;
  // ... more renders
}
```

---

## DATA STRUCTURES

### AgentState
```typescript
interface AgentState {
  currentTaskId: string | null;
  lastCompletedTaskId: string | null;
  currentGoal: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  activeTools: { toolName: string; timestamp: number }[];
  recentDecisions: {
    decision: string;
    reason: string;
    reasoningSnippet: string;
    nextAction: string;
    confidence?: number;
  }[];
  fileChanges: { path: string; timestamp: number }[];
  errors: { message: string; timestamp: number }[];
}
```

### Event Types
```typescript
type Event = 
  | TaskStartedEvent
  | TaskFinishedEvent
  | DecisionMadeEvent
  | ToolCalledEvent
  | ToolFinishedEvent
  | FileCreatedEvent
  | ErrorEvent
  | ... (12+ types)

interface DecisionMadeEvent {
  type: 'decision_made';
  taskId: string;
  decisionId: string;
  timestamp: number;
  payload: {
    decision: string;
    reason: string;
    reasoningSnippet: string;
    nextAction: string;
    confidence?: number;
  };
}
```

### CognitiveTrace
```typescript
interface CognitiveTrace {
  taskId: string;
  decisions: {
    decisionId: string;
    decision: string;
    reason: string;
    reasoningSnippet: string;
    timestamp: number;
    tools: {
      callId: string;
      toolName: string;
      timestamp: number;
      success: boolean;
    }[];
  }[];
}
```

### CognitiveGraph
```typescript
interface CognitiveGraph {
  taskId: string;
  nodes: {
    id: string;
    type: 'decision' | 'tool' | 'artifact';
    label: string;
    x: number;
    y: number;
  }[];
  edges: {
    from: string;
    to: string;
    relation: 'caused' | 'executed' | 'produced';
  }[];
}
```

---

## TABS — PURPOSE & CONTENT

### TAB 1: MISSION (Operational)
**Purpose:** See what agent is doing RIGHT NOW and what's next.

**Content:**
- Current goal + status
- Active tools (live)
- Current decision (latest reasoning + action)
- Next action (queued)
- Timeline (event history, filterable)
- File changes
- Telemetry debug (dev mode only)
- Error display (if error)

**When to use:** Daily monitoring, real-time feedback

**View modes:**
- 👤 User: No internal IDs, just reasoning + decision + tool
- 🔧 Dev: Full IDs (taskId, decisionId, callId) for debugging

---

### TAB 2: TRACE (Historical)
**Purpose:** Understand complete journey of a task from start to finish.

**Content:**
- Linear timeline: Decision → Tool → Artifact → Decision → ...
- Each decision shows: reasoning, decision, tools called, results
- Causality: why did agent make this decision?

**When to use:** Post-mortems, understanding failures, audit

**Interaction:**
- Click decision → open inspector with details
- Expand/collapse tool results
- Search event by type/name

---

### TAB 3: FOCUS (Reasoning-Centric, NEW in Phase 4E-A)
**Purpose:** See what agent is THINKING in real-time.

**Content:**
- Reasoning: 60% viewport, full text, monospace font
- Prediction: Next action + confidence (real data only)
- Tool: Current tool running (secondary)
- Context: Goal + status (tertiary, 5% footer)

**When to use:** Understanding agent's mind, debugging decisions, trust-building

**Future (4E-B):** Live streaming reasoning as it develops (reasoning_updated events)

---

### TAB 4: GRAPH (Structural, NEW in Phase 4E)
**Purpose:** Visualize decision causality as a network.

**Content:**
- Nodes: Decision (blue), Tool (green), Artifact (yellow)
- Edges: caused (solid), executed (dashed), produced (dotted)
- 3-column layout: Decisions | Tools | Artifacts
- Legend: node types + edge meanings

**When to use:** Understanding complex decision chains, research/analysis

**Future (4F):** Interactive Three.js 3D hologram visualization

---

## RENDERING FUNCTIONS (44 functions in app.js)

### Core Flow
```javascript
init()                          // Setup on page load
  ├─ connectWebSocket()        // WS connection
  ├─ fetchInitialData()        // Load initial events
  ├─ setupTabs()               // Tab event listeners
  ├─ setupInspector()          // Inspector panel
  ├─ setupThemeToggle()        // Dark/light mode
  └─ setupViewToggle()         // User/Dev mode

ws.on('message')               // Event received
  └─ applyEvent(event)         // Update agentState
      └─ renderAllFromState()  // Trigger all renders
```

### Render Functions (MISSION Tab)
```javascript
renderMission()                 // Goal + status
renderActiveTools()             // Tools list
renderCurrentDecision()         // Latest decision + reasoning
renderNextAction()              // Queue
renderTimeline()                // Event history
renderFileChanges()             // Files
renderTelemetryDebug()          // Debug info (dev mode)
renderError()                   // Error display
```

### Render Functions (TRACE Tab)
```javascript
renderTrace()                   // Full timeline
  ├─ renderDecisionCard()      // Each decision + tools
  ├─ getDecisionWarnings()     // Warnings/errors
  └─ onTraceDecisionClick()    // Click handler
```

### Render Functions (FOCUS Tab)
```javascript
renderFocus()                   // Reasoning-centric display
  ├─ PRIMARY: focus-thought        [reasoning, no truncation]
  ├─ PREDICTION: prediction-action [next action + confidence]
  ├─ SECONDARY: tool-display       [current tool]
  └─ TERTIARY: context-footer      [goal + status]
```

### Render Functions (GRAPH Tab)
```javascript
renderGraph()                   // Fetch & render graph
  ├─ drawGraph(graph)          // SVG rendering
  ├─ drawEmptyGraph()          // No events
  └─ showNodeTooltip()         // Hover tooltip (dev mode)
```

### Inspector
```javascript
setupInspector()                // Panel setup
openInspector()                 // Show panel
closeInspector()                // Hide panel
selectEntity()                  // Highlight + open
renderInspectorContent()        // Dynamic content
  ├─ renderEventInspector()    // Event details
  ├─ renderToolInspector()     // Tool details
  ├─ renderDecisionInspector() // Decision details
  └─ renderFileInspector()     // File details
```

### Utilities
```javascript
escapeHtml()                    // Prevent XSS
summarizeArgs()                 // Tool args summary
truncate()                      // Text truncation
formatTime()                    // Timestamp formatting
summarizeEvent()                // Event summary (user mode)
summarizeEventDev()             // Event summary (dev mode)
getTypeAttr()                   // Icon/color by event type
```

---

## WEBSOCKET PROTOCOL

### Message Format
```json
{
  "type": "decision_made",
  "taskId": "task-001",
  "decisionId": "dec-123",
  "timestamp": 1718892215000,
  "payload": {
    "decision": "Call search_knowledge_graph",
    "reason": "Looking for JWT patterns...",
    "reasoningSnippet": "I need to build a FastAPI...",
    "nextAction": "execute search_knowledge_graph",
    "confidence": 0.87
  }
}
```

### Subscription
```javascript
ws.on('open', () => {
  // Subscribe to all events (implicit)
  // Server broadcasts all events to all clients
});

ws.on('message', (msg) => {
  // Handle any event
});

ws.on('close', () => {
  // Reconnect with backoff
  setTimeout(() => connectWebSocket(), 2000);
});
```

---

## STYLING STRATEGY

### Layout (Flex)
- Header: 60px fixed
- Main: flex-grow (remaining height)
- Tabs: 100% width, overflow scroll
- Inspector: overlay, slide-in from right

### Colors
- Primary BG: #0a0e27 (dark blue)
- Card BG: #111833 (slightly lighter)
- Text: #e4e6eb (light gray)
- Accent: #00d4ff (cyan)
- Border: #1a1f3a (subtle)

### Typography
- Font: Monospace (Courier, code display)
- Sizes: 12px (small) → 18px (headers)
- Line-height: 1.6 (readability)

### Animations
- Tab switch: fade 200ms
- Inspector: slide-in 300ms
- Error: slide-down 200ms
- Focus thought: fade-in 400ms (on update)

### Responsive
- Desktop (1200px+): 4-column layout possible
- Tablet (1024px): 3-column layout
- Mobile (600px): 1-column layout (tabs stack)

---

## PERFORMANCE CONSIDERATIONS

### Latency Budget
- Event arrival → WebSocket: <50ms
- WebSocket parse → applyEvent: <10ms
- applyEvent → render: <30ms
- render → DOM: <10ms
- **Total: <100ms** ✅

### Memory
- allEvents array: ~1KB per event × 1000 = ~1MB (capped)
- agentState: ~10KB
- DOM nodes: ~500-1000 nodes (typical) = ~5MB

### Network
- Initial load: ~50KB (HTML/CSS/JS)
- Per event: ~500B average
- At 10 events/sec: ~5KB/sec

---

## SECURITY & PRIVACY

### XSS Prevention
```javascript
// Always use textContent for untrusted data
❌ element.innerHTML = userText;     // Vulnerable
✅ element.textContent = userText;   // Safe

// For HTML, sanitize first
const sanitized = escapeHtml(userText);
element.innerHTML = sanitized;
```

### Authentication
- Dashboard runs on localhost:8766 (assumed secure local network)
- No auth required (single-user, local-only)

### Data Persistence
- Events logged to SQLite (local)
- No external upload (unless explicitly configured)

---

## FUTURE ENHANCEMENTS (Phase 4F+)

### Phase 4F: Jarvis Brain (Three.js)
- Replace SVG graph with interactive 3D visualization
- Hologram effect with reasoning nodes
- Real-time animation of decision flow

### Phase 4G: Voice + Ambient
- Text-to-speech for reasoning
- Ambient sound (typing, thinking, decision)
- Voice commands to pause/inspect

### Phase 4H: Time Travel
- Scrubber to rewind reasoning
- Replay decision chain step-by-step

### Phase 5: Collaborative
- Multi-user dashboard (shared workspace)
- Annotations on reasoning
- Decision voting/consensus

---

## DEBUGGING TIPS

### Dev Mode
```javascript
// Toggle: Click 🔧 view-toggle button
// Shows: taskId, decisionId, callId in timeline + inspector
```

### Console Logging
```javascript
console.log('allEvents:', allEvents);
console.log('agentState:', agentState);
console.log('activeTab:', activeTab);
```

### Network Inspector
```
WebSocket: ws://localhost:8766/ws/events
Events: Every decision_made, tool_called, file_created, etc.
Latency: Check message timestamps vs. Date.now()
```

### Rendering Issues
```javascript
// If FOCUS not updating:
// 1. Check renderFocus() is called on each event
// 2. Verify agentState.recentDecisions is populated
// 3. Check focus-thought element exists in DOM

// If GRAPH not rendering:
// 1. Check drawGraph() receives valid nodes/edges
// 2. Verify SVG width/height are set
// 3. Check browser console for D3/SVG errors
```

---

## SUMMARY

| Aspect | Value |
|--------|-------|
| **Tabs** | 4 (MISSION, TRACE, FOCUS, GRAPH) |
| **HTML Lines** | 216 |
| **CSS Lines** | 1,600+ |
| **JS Lines** | 1,137 |
| **Functions** | 44 |
| **Event Types** | 12+ |
| **Performance** | <100ms latency |
| **Memory** | ~10MB (typical) |
| **Network** | ~5KB/sec (10 events/sec) |
| **Mobile Support** | ✅ Yes (responsive) |
| **Accessibility** | ⚠️ Partial (keyboard nav, no screen reader) |

---

**End of Dashboard Architecture Document**

**Next:** Read this + understand MISSION (operational) vs FOCUS (reasoning).
