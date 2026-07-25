# FOCUS vs GRAPH — Visual Wireframes
**Date:** 2026-06-21  
**Format:** ASCII + Annotated Layouts

---

## FOCUS Tab — Real-Time Agent Viewport

### Current Layout (Problem)
```
┌────────────────────────────────────────────────┐
│ test-task-1              ⚡ RUNNING            │ H=40px
├────────────────────────────────────────────────┤
│                                                │
│ GOAL                                           │ H=80px (tall for 1 line!)
│ Build FastAPI auth service                    │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ DECISION                                       │ H=120px (card overhead)
│ Implement JWT middleware                      │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ ACTIVE TOOL                                    │ H=100px
│ 🔧 search_knowledge_graph                     │
│ ⏱ 3.2s (running...)                           │
│                                                │
├────────────────────────────────────────────────┤
│                                                │
│ REASONING                                      │ H=150px (DUPLICATE!)
│ Token validation pattern found in 3           │
│ existing services. Consider reusing JWT       │
│ from library X.                               │
│                                                │
├────────────────────────────────────────────────┤
│                          (REQUIRES SCROLL) ↓  │
└────────────────────────────────────────────────┘

Total: 600px+ (exceeds viewport, needs scroll)
Issues:
  1. Reasoning shown twice (DECISION card + REASONING card)
  2. Card margins waste 200px+ of space
  3. Must scroll to see all info
  4. Not suitable for 400px sidecar display
  5. No visual hierarchy for "what's happening now"
```

### Proposed Layout (Solution)
```
┌────────────────────────────────────────────────┐
│ test-task-1 ⚡ RUNNING 2m 15s                 │ H=32px (compact)
├────────────────────────────────────────────────┤
│                                                │
│ Goal: Build FastAPI auth service             │ H=24px (text only)
│                                                │
│ ∴ Implement JWT middleware                   │ H=32px (icon + text)
│   Why: Token validation pattern found in 3  │ H=20px (reasoning indent)
│   existing services                          │ H=20px
│                                                │
│ 🔧 search_knowledge_graph  3.2s ⏱            │ H=28px
│                                                │
└────────────────────────────────────────────────┘

Total: 180px (fits in 200px sidecar!)
Changes:
  ✓ Remove card wrappers
  ✓ Merge decision + reasoning into single unit
  ✓ Use icon + indentation for visual hierarchy
  ✓ Compact line heights
  ✓ Status bar is dense (task + status + timer)
  ✓ Can fit in narrow viewport
```

---

## GRAPH Tab — Interactive Decision Network

### Current Layout (Limited)
```
┌──────────────────────────────────────────────────┐
│ COGNITIVE GRAPH                                  │
│ test-task-1 | 4 nodes | 3 edges                 │
├──────────────────────────────────────────────────┤
│                                                  │
│                    Decision 1                   │
│                        ↓ (caused)               │ (Static SVG)
│                  Tool A → Artifact 1            │
│                        ↓ (produced)             │ (Fixed 3-column)
│                    Decision 2                   │
│                        ↓ (caused)               │ (No zoom/pan)
│                  Tool B → Artifact 2            │
│                                                  │
│ (600px fixed height - not full viewport)       │
├──────────────────────────────────────────────────┤
│ Legend                                           │
│ ● Decision  ● Tool  ● Artifact                   │ (Card style)
│ ─ Caused    ─ Produced    ─ Followed             │ (Separated)
└──────────────────────────────────────────────────┘

Issues:
  1. SVG height is fixed (600px), not responsive
  2. Legend is a separate card element (UI inconsistency)
  3. No interactivity (click/hover only logs to console)
  4. 3-column layout breaks with >6 decisions
  5. No zoom/pan for large graphs
  6. No way to navigate or explore
  7. Tooltip only works for developers
```

### Proposed Layout (Interactive)
```
┌──────────────────────────────────────────────────┐
│ COGNITIVE GRAPH - test-task-1                    │ H=28px
│ [Dev] [Fit View] [Reset] [←→ Pan] [Zoom: 100%] │ H=32px (controls)
├──────────────────────────────────────────────────┤
│                                                  │
│                 ↑                                │
│                 │ (scroll to see more)           │
│                 │                                │
│          Decision 1 (✓ 2.4s)                    │
│                 │ ↓ caused                       │ (Hierarchical)
│            Tool A (search...) ✓                 │ (Time flows→)
│                 │ ↓ produced                     │ (Hover: tooltip)
│            Artifact (rules.md)                   │ (Click: select)
│                 │ ↓                              │ (Zoomable)
│          Decision 2 (⏱ thinking)                │ (Pannable)
│                 │ ↓ caused                       │
│            Tool B (write_file) ✓                │
│                                                  │
│  [Hint: Drag to pan, wheel to zoom, click node] │ H=16px
├──────────────────────────────────────────────────┤
│ Legend: ● Decision  ● Tool  ● Artifact          │ H=24px
│         ─ Caused ─ Produced ─ Followed          │ (Integrated)
└──────────────────────────────────────────────────┘

Benefits:
  ✓ Canvas fills viewport (responsive height)
  ✓ Hierarchical layout (time axis clear)
  ✓ Interactive: click node → inspector
  ✓ Hover: node tooltip, edge highlighting
  ✓ Pan/zoom: explore large graphs
  ✓ Controls accessible (dev mode, reset, fit)
  ✓ Legend integrated below (not separate card)
  ✓ Scales to 50+ nodes
  ✓ User-friendly (tooltips for all)
```

---

## Side-by-Side: Tab Navigation

### Before (Confusing)
```
User wants to know: "What is the agent doing RIGHT NOW?"
                        ↓
                Tab: FOCUS ← Click
                        ↓
        Sees: 600px tall card stack
        Has to: Scroll, scroll, scroll
        Gets: Confused about duplicate reasoning
        Result: Not a quick glance tool

User wants to know: "Why did the agent make that decision?"
                        ↓
                Tab: GRAPH ← Click
                        ↓
        Sees: Static SVG, 3 columns
        Tries: Hover to understand (nothing happens)
        Result: Not interactive, can't explore
```

### After (Clear)
```
User wants: Real-time status
        ↓
    Tab: FOCUS ← Click
        ↓
    Sees: Compact 4-line view (no scroll)
    Gets: Goal, Decision, Reasoning, Active Tool at a glance
    Result: Perfect for sidecar/quick check ✓

User wants: Visual decision chain
        ↓
    Tab: GRAPH ← Click
        ↓
    Sees: Hierarchical graph, full viewport
    Can: Click node → details
        Hover → tooltip
        Drag → pan
        Scroll → zoom
    Result: Explorable, interactive ✓
```

---

## Data Flow Comparison

### Current (Duplicate)
```
Events
  ├─→ renderFocus()
  │   ├─ Filter by taskId
  │   ├─ Find latest decision_made
  │   ├─ Find latest tool_called
  │   └─ Rebuild reasoning display
  │
  └─→ renderGraph()
      ├─ Fetch /api/graph/:taskId
      ├─ Transform to SVG
      └─ Render 3-column layout

Problem: Same event data, processed twice differently
```

### Proposed (Single Source)
```
Events
  ↓
API: /api/graph/:taskId
  ↓
  ├─→ renderFocus()
  │   ├─ Extract latest decision node
  │   ├─ Extract latest tool node
  │   └─ Render compact view
  │
  └─→ renderGraph()
      ├─ Use full graph data
      ├─ Layout hierarchically
      └─ Enable interactivity

Benefit: One graph computation, two different views
```

---

## Component State Diagram

### FOCUS Tab State Machine
```
┌─────────────────┐
│  No Task        │ (Empty state)
│  "Waiting..."   │
└────────┬────────┘
         │ (task_started event)
         ↓
┌─────────────────────────────────┐
│  Task Running                   │ (Animated pulse)
│  Goal: ...                      │ (Goal text)
│  ∴ Decision: ...                │ (Latest decision)
│  🔧 Tool: ...                   │ (Active tool)
└────────┬────────────────────────┘
         │ (decision_made event)
         ├─→ [Pulse animation]
         │   (Update decision + reasoning)
         │
         │ (tool_called event)
         ├─→ [Pulse animation]
         │   (Update tool name + timer)
         │
         │ (tool_finished event)
         ├─→ [Pulse animation]
         │   (Update tool with ✓/✗ + duration)
         │
         │ (task_finished event)
         ↓
┌─────────────────┐
│  Task Complete  │ (No pulse)
│  ✓ 3m 42s       │
└─────────────────┘
```

### GRAPH Tab State Machine
```
┌──────────────────┐
│  No Task         │
│  "Select task"   │
└────────┬─────────┘
         │ (Task selected)
         ↓
┌──────────────────────────────┐
│  Loading Graph               │ (Spinner)
│  Fetching from API...        │
└────────┬─────────────────────┘
         │ (Graph received)
         ↓
┌──────────────────────────────┐
│  Graph Rendered              │ (Interactive)
│  [Node click] [Hover] [Zoom] │
│                              │
│  ∴ Node selected             │ (If clicked)
│    → Inspector shows details │
└──────────────────────────────┘
         │ (New events)
         ├─→ Refresh graph
         │   (Re-fetch /api/graph/:taskId)
         │
         └─→ Update visualization
```

---

## Animation Specifications

### FOCUS: Update Pulse
```
Event: Decision made / Tool started / Tool finished
Animation: Pulse + fade

Timeline:
  0ms:     Opacity: 1.0, Scale: 1.0
  100ms:   Opacity: 0.7, Scale: 1.02
  200ms:   Opacity: 1.0, Scale: 1.0

CSS:
  @keyframes pulse-update {
    0% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.02); }
    100% { opacity: 1; transform: scale(1); }
  }

  .focus-decision-reasoning-card.updated {
    animation: pulse-update 200ms ease-out;
  }
```

### GRAPH: Node Hover Highlight
```
Event: Hover over node
Animation: Highlight connected edges + nodes

Timeline:
  0ms:     Other nodes/edges: opacity 0.3
  200ms:   (Steady state)

CSS:
  .graph-node.connected {
    circle { stroke-width: 3; }
  }
  
  .graph-edge:not(.highlighted) {
    opacity: 0.2;
    transition: opacity 200ms;
  }
```

---

## Responsive Behavior

### FOCUS: Mobile
```
Viewport: 320px width
├─ Status bar: Full width (32px)
├─ Goal: Full width, wrap text (variable height)
├─ Decision+Reasoning: Full width, wrap text
├─ Tool: Full width
└─ Total: Fits in 400px height ✓
```

### FOCUS: Desktop Sidecar (120px)
```
Viewport: 120px width
├─ Status: Abbreviated (task + icon)
├─ Goal: Truncate with ellipsis
├─ Decision: Icon + first line only
├─ Tool: Tool name + icon only
└─ Total: Compact, no scroll ✓
```

### GRAPH: Mobile
```
Viewport: 320px width
├─ SVG scales down
├─ Nodes compress
├─ Pan/zoom still functional
├─ Touch-friendly controls needed
└─ Result: Usable but cramped
```

### GRAPH: Desktop (Full Width)
```
Viewport: Full width
├─ SVG fills width
├─ Hierarchical layout has room
├─ Zoom/pan smooth
├─ Legend below readable
└─ Result: Optimal ✓
```

---

## Keyboard Shortcuts (Proposed)

### FOCUS Tab
| Shortcut | Action |
|----------|--------|
| Alt+F | Toggle Focus sidecar |
| Esc | Close Focus sidecar |
| ↑/↓ | Scroll history (if enabled) |

### GRAPH Tab
| Shortcut | Action |
|----------|--------|
| Shift+0 | Fit graph to view |
| Shift+R | Reset zoom (100%) |
| D | Toggle dev mode |
| ← / → | Pan left/right |
| ↑ / ↓ | Pan up/down |
| +/- | Zoom in/out |
| Esc | Deselect node |

---

## Color Coding (Dev Mode)

### FOCUS
```
Background: var(--bg)
Text: var(--text)
Accent: var(--accent) [for icons, emphasis]
Muted: var(--text-dim) [for secondary info]

Decision icon (∴):  var(--accent)
Goal text:          var(--text)
Reasoning text:     var(--text-dim) [slightly faded]
Tool icon (🔧):     var(--accent)
Timer (⏱):          var(--text-dim)
Status badge:       var(--accent) or var(--error)
```

### GRAPH
```
Decision nodes:     var(--accent) [bright, clear intent]
Tool nodes:         var(--text-dim) [secondary action]
Artifact nodes:     var(--accent-dim) [output]

Caused edges:       var(--accent) [bold, primary relation]
Produced edges:     var(--text-dim) [dashed, secondary]
Followed edges:     var(--border) [faint, temporal]

Selected node:      Stroke width +2, glow effect
Hover edge:         Opacity 1.0 (others fade to 0.2)
Hover node:         Tooltip background: var(--bg-card)
```

---

## Performance Targets

### FOCUS
- Render time: <50ms (no animation lag)
- Update latency: <100ms (feels responsive)
- Animation fps: 60fps (smooth pulse)
- Memory: <1MB (state + DOM)

### GRAPH
- Fetch time: <300ms (API round-trip)
- Layout time: <200ms (node positioning)
- Render time: <100ms (SVG drawing)
- Interaction: <50ms (click/hover handlers)
- Zoom/pan: 60fps (transform only, no reflow)

---

## Accessibility Notes

### FOCUS
- [ ] Tab order: Goal → Decision → Tool
- [ ] Screen reader: Announce status badge
- [ ] Color contrast: WCAG AA minimum
- [ ] Font size: 14px base (readable on 6" screen)
- [ ] Touch targets: 44px minimum (tool button)

### GRAPH
- [ ] Tab order: Node 1 → Node 2 → ... → Legend
- [ ] Screen reader: "Graph with N nodes and M edges. Press ? for help."
- [ ] Keyboard navigation: Arrow keys pan, +/- zoom
- [ ] Color not sole indicator (node shape + text label)
- [ ] Alt text for tooltip content

---

## Measurement & Validation

### FOCUS: After Implementation
```
Checklist:
  ☐ Total height < 200px (no scroll on 400px viewport)
  ☐ Pulse animation visible and smooth
  ☐ Real-time updates trigger pulse (visual feedback)
  ☐ No console errors in dev/prod mode
  ☐ Reasoning not duplicated in UI
  ☐ Works on mobile, tablet, desktop
  ☐ Sidecar display (120px width) is readable
```

### GRAPH: After Implementation
```
Checklist:
  ☐ SVG canvas fills viewport height
  ☐ Zoom works (100% to 400%)
  ☐ Pan works (smooth transform)
  ☐ Click node opens inspector
  ☐ Hover node shows tooltip
  ☐ Hover edge highlights connected
  ☐ [Fit to View] computes correct bounds
  ☐ [Reset] zoom returns to 100%
  ☐ Dev mode toggles ID visibility
  ☐ Graph with 50+ nodes renders in <500ms
```

---

## Conclusion

**FOCUS Tab:** Transforms from "scrollable card stack" → "glanceable real-time viewport"  
**GRAPH Tab:** Transforms from "static 3-column layout" → "interactive visual network"

Both resolve current UX confusion while maintaining distinct purposes in the dashboard.
