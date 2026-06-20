/**
 * @file Kato Dashboard v7 — Event Sourcing + AgentState Architecture
 * @layer dashboard
 * @created 2026-06-21
 * @updated 2026-06-21 — Phase 1: AgentState-driven UI (Tools, Files, Decisions)
 */

// ═══ STATE ═══
const state = {
  connected: false,
  events: [],
  agentState: null,  // AgentState from server (Events → State)
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

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

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
        handleWebSocketMessage(data);
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

// ═══ WEBSOCKET MESSAGE HANDLER ═══
function handleWebSocketMessage(data) {
  // Handle init message (includes state + events)
  if (data.type === 'init') {
    if (data.state) {
      state.agentState = data.state;
      renderAllFromState();
    }
    if (Array.isArray(data.events)) {
      data.events.reverse().forEach(e => addEvent(e));
    }
    updateStatusBar();
    return;
  }

  // Handle real-time event (includes state update)
  if (data.type === 'event' && data.event) {
    if (data.state) {
      state.agentState = data.state;
    }
    addEvent(data.event);
    renderAllFromState();
    updateStatusBar();
  }
}

// ═══ EVENT MANAGEMENT ═══
function addEvent(event) {
  if (!event || !event.type || !event.timestamp) return;
  
  state.events.unshift(event);
  if (state.events.length > 1000) {
    state.events = state.events.slice(0, 1000);
  }
  
  updateTimeline(event);
}

// ═══ STATE-DRIVEN RENDERING ═══
function renderAllFromState() {
  const s = state.agentState;
  if (!s) return;
  
  // Update status bar from state
  renderStatusFromState(s);
  
  // Update goal display
  renderGoalFromState(s);
  
  // Update active tools
  renderActiveTools(s);
  
  // Update tool history (from events)
  renderToolHistory();
  
  // Update files tab
  renderFiles(s);
  
  // Update decisions
  renderDecisions(s);
  
  // Update error display
  renderError(s);
}

function renderStatusFromState(s) {
  const dot = $('statusDot');
  const text = $('statusText');
  if (!dot || !text) return;
  
  switch (s.status) {
    case 'working':
      dot.className = 'badge-dot running';
      text.textContent = 'Working';
      break;
    case 'error':
      dot.className = 'badge-dot error';
      text.textContent = 'Error';
      break;
    case 'offline':
      dot.className = 'badge-dot offline';
      text.textContent = 'Offline';
      break;
    default:
      dot.className = 'badge-dot online';
      text.textContent = 'Idle';
  }
}

function renderGoalFromState(s) {
  const currentGoal = $('currentGoal');
  const goalContent = $('goalContent');
  
  if (currentGoal) {
    currentGoal.textContent = s.currentGoal || 'No active goal';
  }
  if (goalContent) {
    goalContent.textContent = s.currentGoal || 'No active goal';
  }
}

function renderActiveTools(s) {
  const container = $('activeToolsList');
  if (!container) return;
  
  if (s.activeTools.length === 0) {
    container.innerHTML = '<div class="empty-state">No active tools</div>';
    return;
  }
  
  container.innerHTML = s.activeTools.map(t => `
    <div class="tool-active-item">
      <span class="tool-name">${escapeHtml(t.toolName)}</span>
      <span class="tool-status running">Running</span>
    </div>
  `).join('');
}

function renderToolHistory() {
  const container = $('toolHistoryList');
  if (!container) return;
  
  const toolEvents = state.events.filter(e => 
    e.type === 'tool_called' || e.type === 'tool_finished'
  ).slice(0, 50);
  
  if (toolEvents.length === 0) {
    container.innerHTML = '<div class="empty-state">No tool calls yet</div>';
    return;
  }
  
  container.innerHTML = toolEvents.map(e => {
    const time = new Date(e.timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const toolName = e.payload?.toolName || 'unknown';
    const isFinished = e.type === 'tool_finished';
    const success = e.payload?.success;
    const statusClass = !isFinished ? 'running' : (success ? 'success' : 'failed');
    const statusText = !isFinished ? 'Running' : (success ? 'OK' : 'Failed');
    
    return `
      <div class="tool-history-item">
        <span class="tool-time">${time}</span>
        <span class="tool-name">${escapeHtml(toolName)}</span>
        <span class="tool-status ${statusClass}">${statusText}</span>
      </div>
    `;
  }).join('');
}

function renderFiles(s) {
  const container = $('filesList');
  if (!container) return;
  
  if (s.recentFiles.length === 0) {
    container.innerHTML = '<div class="empty-state">No file changes yet</div>';
    return;
  }
  
  container.innerHTML = s.recentFiles.map(f => {
    const time = new Date(f.timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const icon = f.event === 'created' ? '📄' : f.event === 'modified' ? '✏️' : '🗑️';
    
    return `
      <div class="file-item">
        <span class="file-icon">${icon}</span>
        <span class="file-path">${escapeHtml(f.path)}</span>
        <span class="file-time">${time}</span>
      </div>
    `;
  }).join('');
}

function renderDecisions(s) {
  const container = $('decisionsList');
  if (!container) return;
  
  if (s.recentDecisions.length === 0) {
    container.innerHTML = '<div class="empty-state">No decisions recorded</div>';
    return;
  }
  
  container.innerHTML = s.recentDecisions.map(d => {
    const time = new Date(d.timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    
    return `
      <div class="decision-item">
        <div class="decision-header">
          <span class="decision-time">${time}</span>
          <span class="decision-action">${escapeHtml(d.decision)}</span>
        </div>
        <div class="decision-reason">${escapeHtml(d.reason)}</div>
        <div class="decision-next">→ ${escapeHtml(d.nextAction)}</div>
      </div>
    `;
  }).join('');
}

function renderError(s) {
  const container = $('errorDisplay');
  if (!container) return;
  
  if (!s.lastError) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  const time = new Date(s.lastError.timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  
  container.innerHTML = `
    <div class="error-item">
      <div class="error-header">
        <span class="error-time">${time}</span>
        <span class="error-code">${escapeHtml(s.lastError.code || 'UNKNOWN')}</span>
      </div>
      <div class="error-message">${escapeHtml(s.lastError.message)}</div>
    </div>
  `;
}

// ═══ STATUS BAR ═══
function updateStatusBar() {
  const elapsed = Math.floor((Date.now() - state.sessionStartTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  const sessionTime = $('sessionTime');
  if (sessionTime) {
    sessionTime.textContent = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  
  // Update event count
  const eventCount = $('eventCount');
  if (eventCount) {
    eventCount.textContent = `${state.events.length} events`;
  }
}

// ═══ TIMELINE ═══
function updateTimeline(event) {
  const timeline = $('timelineBody');
  if (!timeline) return;
  
  const emptyState = timeline.querySelector('.empty-state');
  if (emptyState) emptyState.remove();
  
  if (!event || !event.timestamp || !event.type) return;
  
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
                   event.type.includes('file') ? 'file' :
                   event.type === 'decision_made' ? 'decision' : 'task';
  
  const message = event.payload?.goal || 
                  event.payload?.toolName ||
                  event.payload?.decision ||
                  event.payload?.message ||
                  (event.payload?.result ? String(event.payload.result).substring(0, 100) : '') ||
                  event.type;
  
  item.innerHTML = `
    <span class="event-time">${time}</span>
    <span class="event-type ${typeClass}">${escapeHtml(event.type)}</span>
    <span class="event-message">${escapeHtml(message)}</span>
  `;
  
  timeline.insertBefore(item, timeline.firstChild);
  
  while (timeline.children.length > 100) {
    timeline.removeChild(timeline.lastChild);
  }
  
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
    } else if (filter === 'decisions' && type.includes('decision')) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
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
  
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });
  
  $$('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tab}`);
  });
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
  $('themeToggle')?.addEventListener('click', toggleTheme);
  $('closeInspector')?.addEventListener('click', closeInspector);
  
  $$('.timeline-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentFilter = btn.dataset.filter;
      $$('.timeline-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterTimeline();
    });
  });
  
  $('clearTimeline')?.addEventListener('click', () => {
    $('timelineBody').innerHTML = '<div class="empty-state">Timeline cleared</div>';
    state.events = [];
  });
  
  $('btnResume')?.addEventListener('click', () => sendControl('resume'));
  $('btnPause')?.addEventListener('click', () => sendControl('pause'));
  $('btnStop')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to stop the agent?')) {
      sendControl('stop');
    }
  });
  
  $('resetSettings')?.addEventListener('click', () => {
    if (confirm('Reset all settings to defaults?')) {
      localStorage.clear();
      location.reload();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeInspector();
    }
  });
}

function sendControl(action) {
  fetch(`http://127.0.0.1:8766/api/agent/${action}`, { method: 'POST' })
    .then(r => r.json())
    .then(data => console.log('[Dashboard] Control response:', data))
    .catch(e => console.error('[Dashboard] Control error:', e));
}

// ═══ INIT ═══
function init() {
  console.log('[Dashboard v7] Initializing...');
  
  initTheme();
  initNavigation();
  initEventListeners();
  
  connectWebSocket();
  fetchInitialData();
  
  setInterval(updateStatusBar, 1000);
  
  console.log('[Dashboard v7] Ready');
}

async function fetchInitialData() {
  try {
    // Fetch AgentState first (primary source)
    const stateRes = await fetch('http://127.0.0.1:8766/api/state');
    const stateData = await stateRes.json();
    if (stateData.success && stateData.data) {
      state.agentState = stateData.data;
      renderAllFromState();
    }
    
    // Fetch recent events for timeline
    const eventsRes = await fetch('http://127.0.0.1:8766/api/events/recent');
    const eventsData = await eventsRes.json();
    if (eventsData.success && eventsData.data) {
      eventsData.data.forEach(event => addEvent(event));
    }
    
    console.log('[Dashboard v7] Initial data loaded');
  } catch (e) {
    console.error('[Dashboard v7] Failed to load initial data:', e);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
