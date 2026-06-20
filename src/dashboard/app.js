/**
 * @file Kato Dashboard v6 — Event Sourcing Architecture
 * @layer dashboard
 * @created 2026-06-21
 */

// ═══ STATE ═══
const state = {
  connected: false,
  events: [],
  currentTab: 'overview',
  currentFilter: 'all',
  theme: localStorage.getItem('theme') || 'dark',
  ws: null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 10,
  reconnectDelay: 1000,
  sessionStartTime: Date.now(),
};

// ═══ DOM HELPERS ═══
const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

// ═══ WEBSOCKET ═══
function connectWebSocket() {
  const wsUrl = $('wsUrl')?.value || 'ws://127.0.0.1:8766/ws/events';
  
  try {
    state.ws = new WebSocket(wsUrl);
    
    state.ws.onopen = () => {
      state.connected = true;
      state.reconnectAttempts = 0;
      updateConnectionStatus(true);
      console.log('[Dashboard] WebSocket connected');
    };
    
    state.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleEvent(data);
      } catch (e) {
        console.error('[Dashboard] Failed to parse event:', e);
      }
    };
    
    state.ws.onclose = () => {
      state.connected = false;
      updateConnectionStatus(false);
      console.log('[Dashboard] WebSocket disconnected');
      attemptReconnect();
    };
    
    state.ws.onerror = (error) => {
      console.error('[Dashboard] WebSocket error:', error);
    };
  } catch (e) {
    console.error('[Dashboard] Failed to connect:', e);
    attemptReconnect();
  }
}

function attemptReconnect() {
  if (state.reconnectAttempts >= state.maxReconnectAttempts) {
    console.log('[Dashboard] Max reconnect attempts reached');
    return;
  }
  
  state.reconnectAttempts++;
  const delay = state.reconnectDelay * Math.pow(2, state.reconnectAttempts - 1);
  
  console.log(`[Dashboard] Reconnecting in ${delay}ms (attempt ${state.reconnectAttempts})`);
  setTimeout(connectWebSocket, delay);
}

function updateConnectionStatus(connected) {
  const dot = $('statusDot');
  const text = $('statusText');
  
  if (connected) {
    dot.className = 'badge-dot online';
    text.textContent = 'Online';
  } else {
    dot.className = 'badge-dot offline';
    text.textContent = 'Offline';
  }
}

// ═══ EVENT HANDLING ═══
function handleEvent(event) {
  // Add to events array
  state.events.unshift(event);
  
  // Keep only last 1000 events
  if (state.events.length > 1000) {
    state.events = state.events.slice(0, 1000);
  }
  
  // Update UI based on event type
  switch (event.type) {
    case 'task_started':
      handleTaskStarted(event);
      break;
    case 'task_finished':
      handleTaskFinished(event);
      break;
    case 'tool_called':
    case 'tool_finished':
      handleToolEvent(event);
      break;
    case 'error':
      handleError(event);
      break;
    case 'memory_write':
      handleMemoryEvent(event);
      break;
  }
  
  // Update timeline
  updateTimeline(event);
  
  // Update status bar
  updateStatusBar();
}

function handleTaskStarted(event) {
  const goal = event.payload?.goal || 'Unknown task';
  $('currentGoal').textContent = goal;
  $('goalContent').textContent = goal;
  
  // Update status to running
  $('statusDot').className = 'badge-dot running';
  $('statusText').textContent = 'Running';
}

function handleTaskFinished(event) {
  const success = event.payload?.success;
  const duration = event.payload?.duration;
  
  // Update status
  if (success) {
    $('statusDot').className = 'badge-dot online';
    $('statusText').textContent = 'Completed';
  } else {
    $('statusDot').className = 'badge-dot offline';
    $('statusText').textContent = 'Failed';
  }
  
  // Clear goal after delay
  setTimeout(() => {
    $('currentGoal').textContent = 'No active goal';
    $('goalContent').textContent = 'No active goal';
  }, 5000);
}

function handleToolEvent(event) {
  // Update tools tab
  updateToolStats();
}

function handleError(event) {
  console.error('[Agent Error]', event.payload);
}

function handleMemoryEvent(event) {
  // Update memory tab
  updateMemoryView();
}

// ═══ UI UPDATES ═══
function updateStatusBar() {
  // Update session time
  const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  $('sessionTime').textContent = 
    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimeline(event) {
  const timeline = $('timelineBody');
  
  // Remove empty state
  const emptyState = timeline.querySelector('.empty-state');
  if (emptyState) {
    emptyState.remove();
  }
  
  // Create event item
  const item = document.createElement('div');
  item.className = 'event-item';
  
  const time = new Date(event.timestamp).toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
  
  const typeClass = event.type.includes('task') ? 'task' :
                   event.type.includes('tool') ? 'tool' :
                   event.type === 'error' ? 'error' :
                   event.type.includes('file') ? 'file' : 'task';
  
  item.innerHTML = `
    <span class="event-time">${time}</span>
    <span class="event-type ${typeClass}">${event.type}</span>
    <span class="event-message">${event.payload?.goal || event.payload?.toolName || event.payload?.message || JSON.stringify(event.payload)}</span>
  `;
  
  // Add to top
  timeline.insertBefore(item, timeline.firstChild);
  
  // Keep only last 100 items in DOM
  while (timeline.children.length > 100) {
    timeline.removeChild(timeline.lastChild);
  }
  
  // Filter if needed
  filterTimeline();
}

function filterTimeline() {
  const filter = state.currentFilter;
  const items = $$('.timeline-body .event-item');
  
  items.forEach(item => {
    const type = item.querySelector('.event-type')?.className || '';
    
    if (filter === 'all') {
      item.style.display = 'flex';
    } else if (filter === 'tasks' && type.includes('task')) {
      item.style.display = 'flex';
    } else if (filter === 'tools' && type.includes('tool')) {
      item.style.display = 'flex';
    } else if (filter === 'errors' && type.includes('error')) {
      item.style.display = 'flex';
    } else if (filter === 'files' && type.includes('file')) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

function updateToolStats() {
  // Count tool usage from events
  const toolCounts = {};
  state.events
    .filter(e => e.type === 'tool_called' || e.type === 'tool_finished')
    .forEach(e => {
      const tool = e.payload?.toolName || 'unknown';
      toolCounts[tool] = (toolCounts[tool] || 0) + 1;
    });
  
  // Update chart if canvas exists
  const canvas = $('toolChart');
  if (canvas && Object.keys(toolCounts).length > 0) {
    // Chart.js will be initialized here
  }
}

function updateMemoryView() {
  // This would fetch from API in production
  // For now, show placeholder
}

// ═══ TAB NAVIGATION ═══
function initNavigation() {
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  state.currentTab = tab;
  
  // Update nav
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });
  
  // Update content
  $$('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tab}`);
  });
  
  // Open inspector if needed
  if (tab !== 'settings') {
    // Don't open inspector for settings
  }
}

// ═══ INSPECTOR ═══
function openInspector(content) {
  const inspector = $('inspector');
  $('inspectorContent').innerHTML = content;
  inspector.classList.add('open');
}

function closeInspector() {
  $('inspector').classList.remove('open');
}

// ═══ THEME ═══
function initTheme() {
  document.body.setAttribute('data-theme', state.theme);
  updateThemeButton();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  document.body.setAttribute('data-theme', state.theme);
  updateThemeButton();
}

function updateThemeButton() {
  const btn = $('themeToggle');
  if (btn) {
    btn.textContent = state.theme === 'dark' ? '🌙 Dark' : '☀️ Light';
  }
}

// ═══ EVENT LISTENERS ═══
function initEventListeners() {
  // Theme toggle
  $('themeToggle')?.addEventListener('click', toggleTheme);
  
  // Inspector close
  $('closeInspector')?.addEventListener('click', closeInspector);
  
  // Timeline filters
  $$('.timeline-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentFilter = btn.dataset.filter;
      $$('.timeline-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterTimeline();
    });
  });
  
  // Clear timeline
  $('clearTimeline')?.addEventListener('click', () => {
    $('timelineBody').innerHTML = '<div class="empty-state">Timeline cleared</div>';
    state.events = [];
  });
  
  // Task filters
  $$('#tab-tasks .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#tab-tasks .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Filter tasks
    });
  });
  
  // Agent controls
  $('btnResume')?.addEventListener('click', () => sendControl('resume'));
  $('btnPause')?.addEventListener('click', () => sendControl('pause'));
  $('btnStop')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to stop the agent?')) {
      sendControl('stop');
    }
  });
  
  // Settings
  $('resetSettings')?.addEventListener('click', () => {
    if (confirm('Reset all settings to defaults?')) {
      localStorage.clear();
      location.reload();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeInspector();
    }
  });
}

function sendControl(action) {
  // Send control command via REST API
  fetch(`http://127.0.0.1:8766/api/agent/${action}`, { method: 'POST' })
    .then(r => r.json())
    .then(data => console.log('[Dashboard] Control response:', data))
    .catch(e => console.error('[Dashboard] Control error:', e));
}

// ═══ INIT ═══
function init() {
  console.log('[Dashboard] Initializing...');
  
  initTheme();
  initNavigation();
  initEventListeners();
  
  // Connect WebSocket
  connectWebSocket();
  
  // Start session timer
  setInterval(updateStatusBar, 1000);
  
  console.log('[Dashboard] Ready');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
