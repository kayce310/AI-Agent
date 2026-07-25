# 🎨 CORAL DASHBOARD REDESIGN — Layout Specification

**Version:** 2.0
**Date:** 2026-06-23
**Reference:** Hermes Dashboard Architecture

---

## 1. NEW HTML STRUCTURE

### Current Structure (461 lines)
```html
<header id="status-bar">  <!-- Horizontal tabs -->
<main id="workspace">
  <section id="mission-view">...</section>
  <section id="trace-view">...</section>
  <!-- ... 4 more sections ... -->
  <aside id="inspector">...</aside>
</main>
```

### New Structure (Target: ~500 lines)
```html
<body>
  <!-- Toast Container -->
  <div id="toast-container"></div>

  <!-- Sidebar Navigation -->
  <aside id="sidebar" class="sidebar">
    <div class="sidebar-header">
      <img src="logo.svg" alt="Coral" class="sidebar-logo">
      <span class="sidebar-title">KATO AGENT</span>
    </div>
    
    <nav class="sidebar-nav">
      <button class="sidebar-link active" data-tab="mission">
        <svg class="sidebar-icon"><!-- Mission icon --></svg>
        <span class="sidebar-label">Mission</span>
      </button>
      <button class="sidebar-link" data-tab="trace">
        <svg class="sidebar-icon"><!-- Trace icon --></svg>
        <span class="sidebar-label">Trace</span>
      </button>
      <button class="sidebar-link" data-tab="focus">
        <svg class="sidebar-icon"><!-- Focus icon --></svg>
        <span class="sidebar-label">Focus</span>
      </button>
      <button class="sidebar-link" data-tab="memory">
        <svg class="sidebar-icon"><!-- Memory icon --></svg>
        <span class="sidebar-label">Memory</span>
      </button>
      <button class="sidebar-link" data-tab="graph">
        <svg class="sidebar-icon"><!-- Graph icon --></svg>
        <span class="sidebar-label">Graph</span>
      </button>
      <button class="sidebar-link" data-tab="brain">
        <svg class="sidebar-icon"><!-- Brain icon --></svg>
        <span class="sidebar-label">Hologram</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div class="sidebar-status" id="ws-status">
        <span class="status-dot"></span>
        <span class="status-text">Connected</span>
      </div>
      <div class="sidebar-controls">
        <button id="lang-toggle" class="sidebar-btn" title="Language">
          <span>🌐</span>
        </button>
        <button id="theme-toggle" class="sidebar-btn" title="Theme">
          <span>◐</span>
        </button>
      </div>
    </div>
  </aside>

  <!-- Mobile Header (shown < 1024px) -->
  <header id="mobile-header" class="mobile-header">
    <button id="menu-toggle" class="menu-btn">
      <svg><!-- Hamburger icon --></svg>
    </button>
    <span class="mobile-title">KATO AGENT</span>
    <div class="mobile-actions">
      <span id="mobile-ws-status" class="status-dot"></span>
    </div>
  </header>

  <!-- Main Content Area -->
  <div id="main-wrapper" class="main-wrapper">
    <!-- Page Header -->
    <header id="page-header" class="page-header">
      <h1 class="page-title" id="page-title">Mission Control</h1>
      <div class="page-actions" id="page-actions">
        <!-- Dynamic actions injected here -->
      </div>
    </header>

    <!-- Tab Content -->
    <main id="workspace" class="workspace">
      <section id="mission-view" class="tab-content active">...</section>
      <section id="trace-view" class="tab-content">...</section>
      <section id="focus-view" class="tab-content">...</section>
      <section id="memory-view" class="tab-content">...</section>
      <section id="graph-view" class="tab-content">...</section>
      <section id="brain-view" class="tab-content">...</section>
    </main>

    <!-- Inspector Panel (toggleable) -->
    <aside id="inspector" class="inspector hidden">
      <div class="inspector-header">
        <h2 id="inspector-title">Details</h2>
        <button id="inspector-close" class="inspector-close">&times;</button>
      </div>
      <div id="inspector-content" class="inspector-content">
        <!-- Dynamic content -->
      </div>
    </aside>
  </div>

  <!-- Mobile Sidebar Overlay -->
  <div id="sidebar-overlay" class="sidebar-overlay hidden"></div>
</body>
```

---

## 2. CSS ARCHITECTURE

### Design Tokens (CSS Custom Properties)
```css
:root {
  /* === Color System === */
  /* Backgrounds */
  --bg-base: #0d1117;
  --bg-surface: #161b22;
  --bg-elevated: #1c2330;
  --bg-overlay: rgba(0, 0, 0, 0.5);
  
  /* Text */
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  
  /* Accent */
  --accent-primary: #58a6ff;
  --accent-hover: #79c0ff;
  --accent-bg: rgba(88, 166, 255, 0.1);
  
  /* Semantic */
  --color-success: #3fb950;
  --color-warning: #d29922;
  --color-error: #f85149;
  --color-info: #58a6ff;
  
  /* Borders */
  --border-default: #30363d;
  --border-muted: #21262d;
  --border-accent: #58a6ff;
  
  /* === Typography === */
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  
  /* === Spacing === */
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  
  /* === Layout === */
  --sidebar-width: 256px;
  --sidebar-collapsed-width: 64px;
  --header-height: 56px;
  --inspector-width: 360px;
  
  /* === Borders === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  
  /* === Shadows === */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  
  /* === Transitions === */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

/* Light Theme */
body.light {
  --bg-base: #ffffff;
  --bg-surface: #f6f8fa;
  --bg-elevated: #ffffff;
  --bg-overlay: rgba(0, 0, 0, 0.3);
  
  --text-primary: #1f2328;
  --text-secondary: #656d76;
  --text-muted: #8c959f;
  
  --accent-primary: #0969da;
  --accent-hover: #0550ae;
  --accent-bg: rgba(9, 105, 218, 0.1);
  
  --border-default: #d0d7de;
  --border-muted: #d8dee4;
  --border-accent: #0969da;
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.15);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.2);
}
```

### Layout System
```css
/* === Base Layout === */
body {
  display: flex;
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.5;
  margin: 0;
  padding: 0;
}

/* === Sidebar === */
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-surface);
  border-right: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width var(--transition-base);
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-default);
}

.sidebar-logo {
  width: 32px;
  height: 32px;
}

.sidebar-title {
  font-weight: 600;
  font-size: var(--text-lg);
  white-space: nowrap;
  overflow: hidden;
}

.sidebar.collapsed .sidebar-title {
  display: none;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-2);
  overflow-y: auto;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
}

.sidebar-link:hover {
  background: var(--accent-bg);
  color: var(--text-primary);
}

.sidebar-link.active {
  background: var(--accent-bg);
  color: var(--accent-primary);
  font-weight: 500;
}

.sidebar-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.sidebar-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar.collapsed .sidebar-label {
  display: none;
}

.sidebar-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border-default);
}

.sidebar-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  font-size: var(--text-xs);
  color: var(--text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-success);
}

.status-dot.disconnected {
  background: var(--color-error);
}

.sidebar-controls {
  display: flex;
  gap: var(--space-2);
}

.sidebar-btn {
  flex: 1;
  padding: var(--space-2);
  background: transparent;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.sidebar-btn:hover {
  background: var(--accent-bg);
  border-color: var(--accent-primary);
  color: var(--accent-primary);
}

/* === Main Wrapper === */
.main-wrapper {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  min-height: 100vh;
  transition: margin-left var(--transition-base);
}

.sidebar.collapsed ~ .main-wrapper {
  margin-left: var(--sidebar-collapsed-width);
}

/* === Page Header === */
.page-header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
  z-index: 50;
}

.page-title {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 600;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* === Workspace === */
.workspace {
  flex: 1;
  padding: var(--space-6);
  overflow-y: auto;
}

.tab-content {
  display: none;
}

.tab-content.active {
  display: block;
}

/* === Inspector Panel === */
.inspector {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: var(--inspector-width);
  background: var(--bg-surface);
  border-left: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transform: translateX(100%);
  transition: transform var(--transition-base);
}

.inspector.visible {
  transform: translateX(0);
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-default);
}

.inspector-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
}

.inspector-close {
  background: transparent;
  border: none;
  font-size: var(--text-xl);
  color: var(--text-secondary);
  cursor: pointer;
}

.inspector-content {
  flex: 1;
  padding: var(--space-4);
  overflow-y: auto;
}

/* === Mobile Header === */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
  padding: 0 var(--space-4);
  align-items: center;
  justify-content: space-between;
  z-index: 90;
}

.menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
}

.mobile-title {
  font-weight: 600;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  z-index: 95;
}

/* === Responsive === */
@media (max-width: 1024px) {
  .sidebar {
    transform: translateX(-100%);
  }
  
  .sidebar.mobile-open {
    transform: translateX(0);
  }
  
  .main-wrapper {
    margin-left: 0;
    padding-top: var(--header-height);
  }
  
  .mobile-header {
    display: flex;
  }
  
  .sidebar-overlay.visible {
    display: block;
  }
}

@media (max-width: 640px) {
  .workspace {
    padding: var(--space-4);
  }
  
  .inspector {
    width: 100%;
  }
}
```

---

## 3. COMPONENT PATTERNS

### Card Component
```css
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border-muted);
}

.card-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
}

.card-content {
  color: var(--text-secondary);
}

.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) 0;
}

.card-row + .card-row {
  border-top: 1px solid var(--border-muted);
}
```

### Badge Component
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-full);
  line-height: 1;
}

.badge-secondary {
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.badge-success {
  background: rgba(63, 185, 80, 0.2);
  color: var(--color-success);
}

.badge-warning {
  background: rgba(210, 153, 34, 0.2);
  color: var(--color-warning);
}

.badge-error {
  background: rgba(248, 81, 73, 0.2);
  color: var(--color-error);
}

.badge-info {
  background: var(--accent-bg);
  color: var(--accent-primary);
}
```

### Button Component
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--accent-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: transparent;
  border-color: var(--border-default);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Input Component
```css
.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  background: var(--bg-base);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  transition: border-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

.input::placeholder {
  color: var(--text-muted);
}
```

### Toast Component
```css
.toast-container {
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  z-index: 1000;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  animation: slideIn 0.3s ease;
}

.toast-success {
  border-left: 3px solid var(--color-success);
}

.toast-error {
  border-left: 3px solid var(--color-error);
}

.toast-warning {
  border-left: 3px solid var(--color-warning);
}

.toast-info {
  border-left: 3px solid var(--color-info);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Loading Spinner
```css
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-default);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.spinner-lg {
  width: 32px;
  height: 32px;
  border-width: 3px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  z-index: 10;
}
```

---

## 4. RESPONSIVE BREAKPOINTS

### Mobile (< 640px)
- Sidebar: Hidden (hamburger menu)
- Header: Mobile header with hamburger
- Content: Single column, full width
- Inspector: Full screen overlay

### Tablet (640px - 1024px)
- Sidebar: Hidden (hamburger menu)
- Header: Mobile header with hamburger
- Content: Single column, padded
- Inspector: 80% width overlay

### Desktop (> 1024px)
- Sidebar: Visible (collapsible)
- Header: Page header with title + actions
- Content: Full width with padding
- Inspector: 360px fixed panel

---

## 5. JS MODULE STRUCTURE

### New File Organization
```
src/dashboard/
├── index.html          # Main HTML (updated structure)
├── styles.css          # CSS (design tokens + components)
├── app.js              # Core orchestrator (refactored)
├── api.js              # Centralized API client (NEW)
├── state.js            # State management (NEW)
├── toast.js            # Toast notifications (NEW)
├── sidebar.js          # Sidebar logic (NEW)
├── tabs.js             # Tab switching (NEW)
├── inspector.js        # Inspector panel (extracted)
├── mission-tab.js      # Mission tab logic (extracted)
├── trace-tab.js        # Trace tab logic (extracted)
├── focus-tab.js        # Focus tab logic (extracted)
├── memory-tab.js       # Memory tab (existing)
├── graph-tab.js        # Graph tab logic (extracted)
├── brain-tab.js        # Brain/Hologram (existing)
├── i18n.js             # Translations (existing)
└── utils.js            # Shared utilities (NEW)
```

### Module Responsibilities
| Module | Responsibility |
|--------|----------------|
| `app.js` | Boot, WebSocket, orchestration |
| `api.js` | fetchJSON, error handling, toast integration |
| `state.js` | State store, listeners, updates |
| `toast.js` | Toast creation, auto-dismiss |
| `sidebar.js` | Collapse, mobile toggle, active state |
| `tabs.js` | Tab switching, lazy loading |
| `inspector.js` | Open/close, render content |
| `*-tab.js` | Tab-specific logic |
| `utils.js` | escapeHtml, formatTime, truncate, etc. |

---

## 6. MIGRATION PLAN

### Phase 1: HTML Restructure
1. Create new HTML structure with sidebar
2. Keep all existing tab content sections
3. Add toast container and mobile header
4. Test basic layout works

### Phase 2: CSS Refactor
1. Add design tokens (CSS custom properties)
2. Create component styles (card, badge, button, etc.)
3. Add responsive breakpoints
4. Remove duplicate CSS

### Phase 3: JS Modularization
1. Create `api.js` - centralized fetch wrapper
2. Create `state.js` - state management
3. Create `toast.js` - notification system
4. Extract tab logic into separate files
5. Refactor `app.js` to orchestrate modules

### Phase 4: Feature Implementation
1. Implement sidebar navigation
2. Add loading states
3. Add keyboard shortcuts
4. Add empty states
5. Test all tabs

---

*Design specification by Tor — Hermes Agent*
