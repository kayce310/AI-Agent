/**
 * @file Kato Agent — Mission Control Dashboard
 * @version 9.0.0 — Phase 3: Inspector (Right Slide Panel)
 * 
 * Architecture: Events → AgentState → UI
 * Inspector renders from selectedEntity — NO fetch, NO API calls.
 */

(function() {
  'use strict';

  // ═══ CONFIG ═══
  const WS_URL = `ws://${location.host}/ws/events`;
  const STATUS_BADGES = {
    idle: { label: 'IDLE', class: 'badge-idle' },
    working: { label: 'RUNNING', class: 'badge-working' },
    error: { label: 'ERROR', class: 'badge-error' },
    paused: { label: 'PAUSED', class: 'badge-paused' },
    offline: { label: 'OFFLINE', class: 'badge-offline' },
  };

  // ═══ STATE ═══
  let agentState = {
    status: 'idle',
    currentGoal: null,
    currentTaskId: null,
    currentTaskLabel: null,
    activeTools: [],
    recentFiles: [],
    lastError: null,
    recentDecisions: [],
    timeline: [],
  };
  let allEvents = [];
  let ws = null;
  let timelineFilter = 'all';

  // Inspector state
  let selectedEntity = null;
  let selectedElement = null;
  let selectedEntityHistory = []; // Prepared for Back/Forward — not yet exposed in UI

  // ═══ DOM REFS ═══
  const $ = (sel) => document.querySelector(sel);
  const wsIndicator = $('#ws-indicator');
  const eventCount = $('#event-count');
  const missionGoal = $('#mission-goal');
  const missionBadge = $('#mission-status-badge');
  const activeToolsEl = $('#active-tools');
  const currentDecisionEl = $('#current-decision');
  const nextActionEl = $('#next-action');
  const timelineEl = $('#timeline');
  const fileChangesEl = $('#file-changes');
  const errorDisplay = $('#error-display');
  const errorMessage = $('#error-message');
  const themeToggle = $('#theme-toggle');
  const inspectorPanel = $('#inspector');
  const inspectorTitle = $('#inspector-title');
  const inspectorContent = $('#inspector-content');
  const inspectorClose = $('#inspector-close');

  // ═══ INIT ═══
  function init() {
    loadTheme();
    setupFilterButtons();
    setupThemeToggle();
    setupInspector();
    connectWebSocket();
    fetchInitialData();
  }

  // ═══ WEBSOCKET ═══
  function connectWebSocket() {
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        wsIndicator.className = 'ws-connected';
        wsIndicator.title = 'WebSocket connected';
      };
      ws.onclose = () => {
        wsIndicator.className = 'ws-disconnected';
        wsIndicator.title = 'WebSocket disconnected — retrying in 3s';
        setTimeout(connectWebSocket, 3000);
      };
      ws.onerror = () => {};
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'init' || msg.type === 'event') {
            if (msg.state) agentState = msg.state;
            if (msg.event) {
              allEvents = [msg.event, ...allEvents].slice(0, 200);
            }
            if (msg.events && msg.events.length > 0) {
              allEvents = [...msg.events, ...allEvents].slice(0, 200);
            }
          }
          renderAllFromState();
          // If inspector is open and selectedEntity is an event, check if it was updated
          if (selectedEntity && selectedEntity.kind === 'event') {
            const freshEvent = findEventById(selectedEntity.event.id);
            if (freshEvent) {
              selectedEntity = { kind: 'event', event: freshEvent };
              renderInspectorContent();
            }
          }
        } catch { /* malformed message */ }
      };
    } catch {
      setTimeout(connectWebSocket, 3000);
    }
  }

  function findEventById(id) {
    // Check allEvents first, then agentState.timeline
    return allEvents.find(e => e.id === id) ||
           agentState.timeline.find(e => e.id === id) ||
           null;
  }

  // ═══ INITIAL DATA ═══
  async function fetchInitialData() {
    try {
      const [eventsRes, stateRes] = await Promise.all([
        fetch('/api/events/recent'),
        fetch('/api/state'),
      ]);

      if (stateRes.ok) {
        const stateData = await stateRes.json();
        if (stateData.data) agentState = stateData.data;
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        allEvents = (eventsData.data || []).slice(0, 200);
      }

      renderAllFromState();
    } catch {
      // Server might not be ready yet
    }
  }

  // ═══ LOCAL STATE REDUCER (fallback) ═══
  function applyEvent(event) {
    const p = event.payload || {};
    switch (event.type) {
      case 'task_started':
        agentState.status = 'working';
        agentState.currentGoal = p.goal || null;
        agentState.currentTaskId = p.taskId || null;
        agentState.currentTaskLabel = p.goal || null;
        break;
      case 'task_finished':
        agentState.status = p.success ? 'idle' : 'error';
        agentState.currentGoal = null;
        agentState.currentTaskId = null;
        agentState.currentTaskLabel = null;
        break;
      case 'tool_called':
        agentState.activeTools.unshift({
          callId: p.callId, toolName: p.toolName, args: p.args || {}, startedAt: event.timestamp,
        });
        break;
      case 'tool_finished':
        agentState.activeTools = agentState.activeTools.filter(t => t.callId !== p.callId);
        break;
      case 'file_created':
        agentState.recentFiles.unshift({ path: p.path, event: 'created', timestamp: event.timestamp });
        if (agentState.recentFiles.length > 50) agentState.recentFiles.pop();
        break;
      case 'file_modified':
        agentState.recentFiles.unshift({ path: p.path, event: 'modified', timestamp: event.timestamp });
        if (agentState.recentFiles.length > 50) agentState.recentFiles.pop();
        break;
      case 'file_deleted':
        agentState.recentFiles.unshift({ path: p.path, event: 'deleted', timestamp: event.timestamp });
        if (agentState.recentFiles.length > 50) agentState.recentFiles.pop();
        break;
      case 'decision_made':
        agentState.recentDecisions.unshift({
          decision: p.decision, reason: p.reason, nextAction: p.nextAction, timestamp: event.timestamp,
        });
        if (agentState.recentDecisions.length > 20) agentState.recentDecisions.pop();
        break;
      case 'error':
        agentState.status = 'error';
        agentState.lastError = { message: p.message, code: p.code, timestamp: event.timestamp };
        break;
    }
  }

  // ═══ RENDER ═══
  function renderAllFromState() {
    renderMission();
    renderActiveTools();
    renderCurrentDecision();
    renderNextAction();
    renderTimeline();
    renderFileChanges();
    renderError();
    eventCount.textContent = `${allEvents.length} events`;
  }

  function renderMission() {
    const goal = agentState.currentTaskLabel || agentState.currentGoal;
    missionGoal.textContent = goal || 'Awaiting task';
    const badge = STATUS_BADGES[agentState.status] || STATUS_BADGES.idle;
    missionBadge.textContent = badge.label;
    missionBadge.className = `badge ${badge.class}`;
  }

  function renderActiveTools() {
    if (agentState.activeTools.length === 0) {
      activeToolsEl.innerHTML = '<div class="empty-state">No active tools</div>';
      return;
    }
    activeToolsEl.innerHTML = agentState.activeTools.map(t => {
      const argsStr = summarizeArgs(t.args);
      const isSelected = selectedEntity && selectedEntity.kind === 'tool' && selectedEntity.tool.callId === t.callId;
      return `<div class="tool-item${isSelected ? ' selected' : ''}" data-callid="${escapeHtml(t.callId)}" data-toolname="${escapeHtml(t.toolName)}">
        <span class="tool-name">${escapeHtml(t.toolName)}</span>
        ${argsStr ? `<span class="tool-args">${escapeHtml(argsStr)}</span>` : ''}
      </div>`;
    }).join('');
  }

  function renderCurrentDecision() {
    const d = agentState.recentDecisions[0];
    if (!d) {
      currentDecisionEl.innerHTML = '<div class="empty-state">No decision yet</div>';
      return;
    }
    const isSelected = selectedEntity && selectedEntity.kind === 'decision';
    currentDecisionEl.innerHTML = `
      <div class="decision-item${isSelected ? ' selected' : ''}" data-decision-index="0">
        <div class="decision-main">${escapeHtml(d.decision)}</div>
        <div class="decision-reason">${escapeHtml(d.reason)}</div>
      </div>
    `;
  }

  function renderNextAction() {
    const d = agentState.recentDecisions[0];
    nextActionEl.textContent = d ? d.nextAction : '—';
  }

  function renderTimeline() {
    let items = agentState.timeline;
    if (timelineFilter !== 'all') {
      items = items.filter(e => e.type.startsWith(timelineFilter));
    }

    if (items.length === 0) {
      timelineEl.innerHTML = '<div class="empty-state">No events yet</div>';
      return;
    }

    timelineEl.innerHTML = items.slice(0, 100).map(e => {
      const time = formatTime(e.timestamp);
      const type = e.type.replace('_', ' ');
      const text = summarizeEvent(e);
      const isSelected = selectedEntity && selectedEntity.kind === 'event' && selectedEntity.event.id === e.id;
      return `<div class="timeline-item${isSelected ? ' selected' : ''}" data-event-id="${escapeHtml(e.id)}">
        <span class="timeline-time">${time}</span>
        <span class="timeline-type" ${getTypeAttr(e.type)}>${type}</span>
        <span class="timeline-text">${escapeHtml(text)}</span>
      </div>`;
    }).join('');
  }

  function renderFileChanges() {
    if (agentState.recentFiles.length === 0) {
      fileChangesEl.innerHTML = '<div class="empty-state">No file changes</div>';
      return;
    }
    fileChangesEl.innerHTML = agentState.recentFiles.slice(0, 30).map((f, idx) => {
      const icon = f.event === 'created' ? '+' : f.event === 'deleted' ? '−' : '~';
      const isSelected = selectedEntity && selectedEntity.kind === 'file' && selectedEntity.fileIndex === idx;
      return `<div class="file-item${isSelected ? ' selected' : ''}" data-file-index="${idx}">
        <span class="file-icon ${f.event}">${icon}</span>
        <span class="file-path">${escapeHtml(f.path)}</span>
      </div>`;
    }).join('');
  }

  function renderError() {
    if (!agentState.lastError) {
      errorDisplay.classList.add('hidden');
      return;
    }
    errorDisplay.classList.remove('hidden');
    const e = agentState.lastError;
    errorMessage.textContent = e.code ? `[${e.code}] ${e.message}` : e.message;
  }

  // ═══ INSPECTOR ═══
  function setupInspector() {
    // Close button
    inspectorClose.addEventListener('click', closeInspector);

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !inspectorPanel.classList.contains('hidden')) {
        closeInspector();
      }
    });

    // Click handlers — delegated on container elements
    timelineEl.addEventListener('click', onTimelineClick);
    activeToolsEl.addEventListener('click', onToolClick);
    currentDecisionEl.addEventListener('click', onDecisionClick);
    fileChangesEl.addEventListener('click', onFileClick);
  }

  function openInspector() {
    inspectorPanel.classList.remove('hidden');
    renderInspectorContent();
  }

  function closeInspector() {
    inspectorPanel.classList.add('hidden');
    selectedEntity = null;
    selectedEntityHistory = [];
    clearSelectionHighlights();
  }

  function selectEntity(entity, element) {
    clearSelectionHighlights();
    selectedEntity = entity;
    selectedElement = element;
    if (element) element.classList.add('selected');
    // Track history for future Back/Forward
    selectedEntityHistory.push(entity);
    if (selectedEntityHistory.length > 50) selectedEntityHistory.shift();
    openInspector();
  }

  function clearSelectionHighlights() {
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
  }

  // ─── Click Handlers ───
  function onTimelineClick(e) {
    const item = e.target.closest('.timeline-item');
    if (!item) return;
    const eventId = item.dataset.eventId;
    const event = findEventById(eventId);
    if (!event) return;
    selectEntity({ kind: 'event', event }, item);
  }

  function onToolClick(e) {
    const item = e.target.closest('.tool-item');
    if (!item) return;
    const callId = item.dataset.callid;
    const tool = agentState.activeTools.find(t => t.callId === callId);
    if (!tool) return;
    // Also look in timeline for the tool_called event to get full payload
    const toolEvent = agentState.timeline.find(
      ev => ev.type === 'tool_called' && ev.payload && ev.payload.callId === callId
    );
    selectEntity({ kind: 'tool', tool, event: toolEvent || null }, item);
  }

  function onDecisionClick(e) {
    const item = e.target.closest('.decision-item');
    if (!item) return;
    const decision = agentState.recentDecisions[0]; // Always the latest
    if (!decision) return;
    selectEntity({ kind: 'decision', decision }, item);
  }

  function onFileClick(e) {
    const item = e.target.closest('.file-item');
    if (!item) return;
    const idx = parseInt(item.dataset.fileIndex, 10);
    const file = agentState.recentFiles[idx];
    if (!file) return;
    selectEntity({ kind: 'file', file, fileIndex: idx }, item);
  }

  // ─── Inspector Content Renderer ───
  function renderInspectorContent() {
    if (!selectedEntity) {
      inspectorContent.innerHTML = '<div class="inspector-empty">Click any item to inspect</div>';
      return;
    }

    switch (selectedEntity.kind) {
      case 'event':
        renderEventInspector(selectedEntity.event);
        break;
      case 'tool':
        renderToolInspector(selectedEntity.tool, selectedEntity.event);
        break;
      case 'decision':
        renderDecisionInspector(selectedEntity.decision);
        break;
      case 'file':
        renderFileInspector(selectedEntity.file);
        break;
    }
  }

  function renderEventInspector(event) {
    inspectorTitle.textContent = event.type.replace(/_/g, ' ').toUpperCase();
    const p = event.payload || {};
    inspectorContent.innerHTML = `
      ${field('Type', event.type)}
      ${field('Timestamp', formatTime(event.timestamp) + ' (' + event.timestamp + ')')}
      ${p.taskId ? field('Task ID', p.taskId, 'mono') : ''}
      ${field('Payload', jsonBlock(p))}
    `;
  }

  function renderToolInspector(tool, event) {
    inspectorTitle.textContent = 'TOOL CALL';
    const p = event ? event.payload : tool;
    inspectorContent.innerHTML = `
      ${field('Tool Name', tool.toolName)}
      ${field('Call ID', tool.callId, 'mono')}
      ${field('Arguments', jsonBlock(tool.args))}
      ${field('Started At', formatTime(tool.startedAt) + ' (' + tool.startedAt + ')')}
      ${event ? field('Task ID', event.payload.taskId, 'mono') : ''}
      ${event ? field('Full Event', jsonBlock(event), 'mono') : ''}
    `;
  }

  function renderDecisionInspector(decision) {
    inspectorTitle.textContent = 'DECISION';
    inspectorContent.innerHTML = `
      ${field('Decision', decision.decision)}
      ${field('Reason', decision.reason)}
      ${field('Next Action', decision.nextAction, 'mono')}
      ${field('Timestamp', formatTime(decision.timestamp) + ' (' + decision.timestamp + ')')}
    `;
  }

  function renderFileInspector(file) {
    inspectorTitle.textContent = 'FILE CHANGE';
    inspectorContent.innerHTML = `
      ${field('Path', file.path, 'mono')}
      ${field('Action', file.event)}
      ${field('Timestamp', formatTime(file.timestamp) + ' (' + file.timestamp + ')')}
    `;
  }

  // ─── Inspector Helpers ───
  function field(label, value, cls) {
    const valueHtml = typeof value === 'string' ? escapeHtml(value) : value;
    return `<div class="inspector-field">
      <div class="inspector-field-label">${escapeHtml(label)}</div>
      <div class="inspector-field-value${cls ? ' ' + cls : ''}">${valueHtml}</div>
    </div>`;
  }

  function jsonBlock(obj) {
    try {
      return `<div class="inspector-json">${escapeHtml(JSON.stringify(obj, null, 2))}</div>`;
    } catch {
      return `<div class="inspector-json">${escapeHtml(String(obj))}</div>`;
    }
  }

  // ═══ HELPERS ═══
  function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str);
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function summarizeArgs(args) {
    if (!args) return '';
    const keys = Object.keys(args);
    if (keys.length === 0) return '';
    return keys.slice(0, 3).map(k => `${k}=${truncate(String(args[k]), 30)}`).join(', ');
  }

  function truncate(str, max) {
    return str.length > max ? str.substring(0, max) + '…' : str;
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function summarizeEvent(e) {
    const p = e.payload || {};
    switch (e.type) {
      case 'task_started': return `Goal: ${p.goal || '—'}`;
      case 'task_finished': return `${p.success ? '✓' : '✗'} ${p.goal || ''}`;
      case 'tool_called': return `${p.toolName}(${summarizeArgs(p.args)})`;
      case 'tool_finished': return `${p.toolName} → ${p.success ? '✓' : '✗'}`;
      case 'decision_made': return p.decision;
      case 'file_created': return `+ ${p.path}`;
      case 'file_modified': return `~ ${p.path}`;
      case 'file_deleted': return `− ${p.path}`;
      case 'error': return `[${p.code || 'ERR'}] ${p.message}`;
      default: return e.type;
    }
  }

  function getTypeAttr(type) {
    if (type.startsWith('tool')) return 'tool';
    if (type.startsWith('decision')) return 'decision';
    if (type.startsWith('task')) return 'task';
    if (type.startsWith('file')) return 'file';
    if (type === 'error') return 'error';
    return '';
  }

  // ═══ THEME ═══
  function loadTheme() {
    const saved = localStorage.getItem('kato-theme');
    if (saved === 'light') document.body.classList.add('light');
  }
  function setupThemeToggle() {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem('kato-theme', document.body.classList.contains('light') ? 'light' : 'dark');
    });
  }

  // ═══ FILTERS ═══
  function setupFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        timelineFilter = btn.dataset.filter;
        renderTimeline();
      });
    });
  }

  // ═══ BOOT ═══
  document.addEventListener('DOMContentLoaded', init);
})();
