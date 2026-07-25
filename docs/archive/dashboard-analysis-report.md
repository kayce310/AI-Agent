# 📊 CORAL DASHBOARD vs HERMES DASHBOARD — Full Analysis Report

**Date:** 2026-06-23
**Author:** Tor (Hermes Agent)
**Purpose:** Deep analysis for Coral Dashboard redesign

---

## 1. HERMES DASHBOARD — Architecture Summary

### Tech Stack
- **Framework:** React 19 + TypeScript + Vite + Tailwind CSS v4
- **Design System:** `@nous-research/ui` (shadcn-compat)
- **State:** Pure React (useState + Context + localStorage)
- **API:** Singleton `fetchJSON<T>` with auth headers
- **Theme:** CSS Custom Properties (3-layer color model: background/midground/foreground)
- **i18n:** 16 locales, bundled at build time
- **Plugin System:** Dynamic script loading with slot injection (34 injection points)
- **Routing:** React Router v6 with lazy loading

### Key Patterns
| Pattern | Implementation |
|---------|---------------|
| **No tables** | All data = Cards, ListItems, flex rows |
| **`rounded-none`** | Default card style (sharp corners) |
| **`cn()` utility** | Conditional class merging |
| **PluginSlot** | `:top` and `:bottom` injection on every page |
| **usePageHeader** | Pages push controls into shared header |
| **Persistent chat** | `display:none` preserves WebSocket/PTY state |
| **Debounced search** | 300ms debounce on search inputs |
| **CSS-var theming** | `applyTheme()` writes flat CSS vars to `:root` |

### Component Hierarchy
```
@nous-research/ui atoms → App-level shared components → Page components
Card, Button, Badge,    Markdown, ToolCall,            SessionsPage, SkillsPage,
ListItem, Spinner,       ModelPickerDialog,             ConfigPage, CronPage,
Switch, Input, Select    PluginSlot, DeleteConfirmDialog
```

---

## 2. CORAL DASHBOARD — Current State

### Tech Stack
- **Framework:** Vanilla JavaScript (IIFE pattern, no build tool)
- **HTML:** Single monolithic file (461 lines, 6 tabs inline)
- **CSS:** Single file (3,260 lines)
- **JS Files:** app.js (1,759 lines), brain-tab.js (861 lines), memory-tab.js (598 lines), i18n.js (268 lines)
- **Total:** ~8,346 lines across 4 files
- **3D:** Three.js r128 via CDN
- **API:** Native `fetch()` with no shared client
- **WebSocket:** `ws://localhost:8766/ws/events`
- **i18n:** 2 languages (vi/en), 97 keys, DOM-scan approach

### Architecture
```
app.js (IIFE) ← Core orchestrator
├── State: flat mutable object (agentState)
├── WebSocket: auto-reconnect (3s flat retry)
├── Tabs: show/hide via .hidden class
├── Render: innerHTML replacement (no diffing)
├── Inspector: slide-out right panel
└── Memory Filters: client-side chip filtering

brain-tab.js (IIFE) ← Three.js 3D hologram
├── 120 neural nodes, 400 particles, 4 orbital rings
├── WebSocket: separate connection for brain events
├── Activity decay: 0.995/frame
└── Public API: window.HologramBrain

memory-tab.js (IIFE) ← Memory CRUD browser
├── 3-panel: search + list + detail
├── CRUD: list, detail, update, forget, pin, promote, link
├── Mini graph: SVG radial node visualization
└── Lazy-loaded on first tab activation

i18n.js ← Translation system
├── 2 languages, 97 keys
├── DOM scan: data-i18n attributes
└── Fallback: key → en → raw key
```

### Tab Structure
| Tab | Purpose | Unique Feature |
|-----|---------|----------------|
| Mission | Goal + status + timeline + files | Developer mode toggle |
| Trace | Decision trace + MCP + cost | Budget tracking, alert system |
| Focus | Real-time reasoning stream | Character-by-character streaming |
| Memory | CRUD memory browser | 3-panel layout, mini graph |
| Graph | Cognitive graph visualization | SVG node/edge rendering |
| Hologram | 3D neural network | Three.js JARVIS/Ultron theme |

---

## 3. COMPARATIVE ANALYSIS — Feature Gap Matrix

### UI/UX Features

| Feature | Hermes ✅ | Coral 🔲 | Priority |
|---------|-----------|----------|----------|
| **Sidebar navigation** | Vertical sidebar with icons + labels | ❌ Horizontal tabs only | 🔴 High |
| **Responsive design** | Mobile-first, breakpoints at 640/1024px | ⚠️ Basic (640/768/1024px) | 🔴 High |
| **Loading states** | Spinner component per page | ❌ No loading indicators | 🔴 High |
| **Toast notifications** | useToast hook + Toast component | ❌ No notification system | 🟡 Medium |
| **Search** | Debounced search with results | ⚠️ Basic text filter (memory only) | 🟡 Medium |
| **Dialog/Modal** | Backdrop blur + portal + Escape close | ⚠️ Inspector panel only | 🟡 Medium |
| **Keyboard shortcuts** | Escape to close modals | Escape only (inspector) | 🟢 Low |
| **Collapsible sidebar** | Desktop collapse + tooltip | ❌ No sidebar to collapse | 🟢 Low |
| **Page header injection** | usePageHeader for dynamic controls | ❌ Static header | 🟢 Low |
| **Empty states** | Card with centered message | ⚠️ Some tabs have empty states | 🟡 Medium |
| **Badge system** | Tones: secondary/success/warning/destructive | ⚠️ 5 badge classes only | 🟡 Medium |
| **Rounded corners** | `rounded-none` (sharp design) | `--radius: 8px` (rounded) | 🟢 Low |

### Architecture Features

| Feature | Hermes ✅ | Coral 🔲 | Priority |
|---------|-----------|----------|----------|
| **TypeScript** | Full type safety | ❌ Plain JS | 🔴 High |
| **Component library** | @nous-research/ui atoms | ❌ No shared components | 🔴 High |
| **Plugin system** | Dynamic script loading + 34 slots | ❌ No extensibility | 🟡 Medium |
| **State management** | React Context + useState | ❌ Flat mutable object | 🔴 High |
| **CSS architecture** | Tailwind v4 + design tokens | ⚠️ Custom properties (30+ vars) | 🟡 Medium |
| **API client** | Singleton fetchJSON<T> with auth | ❌ Raw fetch() scattered | 🔴 High |
| **Error handling** | Per-method catch + toast | ⚠️ Mostly silent failures | 🔴 High |
| **Theme system** | 7 themes, CSS vars, custom CSS | ⚠️ Light/dark only | 🟡 Medium |
| **Routing** | React Router v6 | ❌ Show/hide sections | 🟡 Medium |
| **Build system** | Vite (HMR, bundling) | ❌ No build (CDN scripts) | 🟡 Medium |

### Unique Features (Coral only)

| Feature | Description | Value |
|---------|-------------|-------|
| **3D Hologram** | Three.js JARVIS neural network | 🔴 High — unique differentiator |
| **Developer mode** | Toggle for detailed IDs/telemetry | 🟡 Medium |
| **Inspector panel** | Slide-out detail view | 🟡 Medium |
| **Focus streaming** | Character-by-character reasoning | 🟡 Medium |
| **Memory CRUD** | Full create/read/update/delete | 🔴 High |
| **Cost tracking** | Budget + model breakdown | 🟡 Medium |

---

## 4. RECOMMENDED REDESIGN STRATEGY

### Phase 1: Foundation (Must Do)
1. **Sidebar navigation** — Replace horizontal tabs with vertical sidebar (like Hermes)
2. **CSS refactoring** — Clean up duplicate styles, establish design tokens
3. **Loading states** — Add spinners/skeletons for all API calls
4. **Error handling** — Toast notification system for user feedback
5. **API client** — Centralized fetch wrapper with error handling

### Phase 2: Enhancement (Should Do)
6. **Responsive design** — Mobile-first approach with proper breakpoints
7. **Component library** — Extract reusable Card, Badge, Button, Input components
8. **State management** — Organized state with clear update patterns
9. **Keyboard shortcuts** — Escape, Tab navigation, hotkeys
10. **Empty states** — Consistent empty state design across all tabs

### Phase 3: Innovation (Nice to Have)
11. **Plugin system** — Extensibility for custom tabs/panels
12. **Theme system** — Multiple themes beyond light/dark
13. **Routing** — URL-based tab navigation (deep linking)
14. **Build system** — Vite for HMR and bundling
15. **TypeScript** — Type safety and better DX

---

## 5. LAYOUT DESIGN PROPOSAL

### Current Coral Layout
```
┌─────────────────────────────────────────┐
│ HEADER: WS | Tabs | Theme | Lang       │
├─────────────────────────────────────────┤
│                                         │
│           TAB CONTENT AREA              │
│           (show/hide)                   │
│                                         │
│                          ┌──────────────┤
│                          │ INSPECTOR    │
│                          │ (slide-out)  │
└─────────────────────────────────────────┘
```

### Proposed Coral Layout (Hermes-inspired)
```
┌──────────┬──────────────────────────────┐
│ SIDEBAR  │ HEADER: Status | Actions     │
│          ├──────────────────────────────┤
│ 🎯 Mission│                              │
│ 🧠 Trace  │      MAIN CONTENT AREA      │
│ ⚡ Focus  │      (tab content)           │
│ 💾 Memory │                              │
│ 🔗 Graph  │                              │
│ 🧠 Brain  │                              │
│          ├──────────────────────────────┤
│ ──────── │                              │
│ 🌐 Lang  │      DETAIL PANEL            │
│ ◐ Theme  │      (inspector/context)     │
└──────────┴──────────────────────────────┘
```

### Key Design Decisions
1. **Sidebar** = navigation + controls (theme/lang at bottom)
2. **Header** = status bar + contextual actions
3. **Main area** = primary content (scrollable)
4. **Detail panel** = inspector/context (toggleable right panel)
5. **Mobile** = sidebar collapses to hamburger menu

---

## 6. IMPLEMENTATION CHECKLIST

### Week 1: Foundation
- [ ] Refactor HTML structure (sidebar + header + main + detail)
- [ ] Refactor CSS (design tokens, remove duplicates, responsive)
- [ ] Create centralized API client (api.js)
- [ ] Add toast notification system
- [ ] Add loading states for all tabs

### Week 2: Components
- [ ] Extract Card component pattern
- [ ] Extract Badge component pattern
- [ ] Extract Button component pattern
- [ ] Extract Input/Select components
- [ ] Create shared empty state component

### Week 3: Features
- [ ] Implement sidebar navigation
- [ ] Add responsive breakpoints (mobile/tablet/desktop)
- [ ] Add keyboard shortcuts
- [ ] Improve error handling across all tabs
- [ ] Add context menus / right-click actions

### Week 4: Polish
- [ ] Add animations/transitions
- [ ] Optimize performance (debounce, throttle, virtual scroll)
- [ ] Accessibility audit (ARIA labels, focus management)
- [ ] Documentation (README, inline comments)
- [ ] Testing (manual + automated)

---

*Report generated by Tor — Hermes Agent*
