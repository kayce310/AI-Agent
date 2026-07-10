/**
 * @file Coral Agent — Mission Control Dashboard
 * @version 9.2.0 — Phase 4D.5: Dashboard Architecture Consolidation
 * 
 * Architecture: Events → API → UI
 * Trace building happens ONLY on backend (trace-builder.ts)
 * Frontend fetches trace from GET /api/trace/:taskId
 * No duplicate logic.
 */

(function() {
  'use strict';

  // ═══ CONFIG ═══
  const WS_PROTOCOL = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const WS_HOST = location.host || '127.0.0.1:8766';
  const WS_URL = `${WS_PROTOCOL}//${WS_HOST}/ws/events`;
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
    recentTools: [],  // Tools that just finished (kept visible briefly)
    recentFiles: [],
    lastError: null,
    recentDecisions: [],
    timeline: [],
    
    // FOCUS Tab Streaming (Phase 4E-B)
    focusPaused: false,
    focusEventBuffer: [],
    toolTimer: null,
    toolStartTime: null,
    streamingText: '',
    streamIndex: 0,
    streamTimer: null,
    eventCount: 0,
    lastConfidence: null
  };
  let allEvents = [];
  let ws = null;
  let timelineFilter = 'all';
  let viewMode = 'user';  // 'user' | 'developer'
  let currentTab = 'mission';  // 'mission' | 'trace'
  let traceTaskId = null;  // Currently displayed task in trace
  let lastCompletedTaskId = null;  // Fallback task for trace
  let _renderPending = false;  // RAF debounce flag – batch renders into 60fps frame

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

  // API response cache with TTL (prevents redundant API calls on fast event loops)
  const _apiCache = new Map();
  async function _cachedFetch(url, ttlMs = 5000) {
    const now = Date.now();
    const cached = _apiCache.get(url);
    if (cached && now - cached.ts < ttlMs) return cached.data;
    try {
      const res = await fetch(url);
      const data = await res.json();
      _apiCache.set(url, { data, ts: now });
      return data;
    } catch (e) {
      if (cached) return cached.data;  // stale cache is better than nothing
      throw e;
    }
  }

  const themeToggle = $('#theme-toggle');
  const telemetryDebugEl = $('#telemetry-debug');
  const viewToggleBtn = $('#view-toggle');
  const inspectorPanel = $('#inspector');
  const inspectorTitle = $('#inspector-title');
  const inspectorContent = $('#inspector-content');
  const inspectorClose = $('#inspector-close');
  // Tabs
  const tabMissionBtn = $('#tab-mission');
  const tabTraceBtn = $('#tab-trace');
  const missionView = $('#mission-view');
  const traceView = $('#trace-view');
  const traceContainer = $('#trace-container');
  const traceTaskId$ = $('#trace-task-id');
  const traceTaskStatus = $('#trace-task-status');

  // ═══ INIT ═══
  function init() {
    loadTheme();
    setupFilterButtons();
    setupViewToggle();
    setupThemeToggle();
    setupTabs();
    setupInspector();
    connectWebSocket();
    fetchInitialData();
    // Expose state for brain-tab.js Combined mode
    window.__agentState = agentState;
  }

  // ═══ WEBSOCKET ═══
  function connectWebSocket() {
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        console.log('[Dashboard] WebSocket connected');
        wsIndicator.className = 'ws-connected';
        wsIndicator.title = 'WebSocket connected';
      };
      ws.onclose = (e) => {
        console.log(`[Dashboard] WebSocket closed: code=${e.code} reason=${e.reason}`);
        wsIndicator.className = 'ws-disconnected';
        wsIndicator.title = 'WebSocket disconnected — retrying in 3s';
        setTimeout(connectWebSocket, 3000);
      };
      ws.onerror = (e) => {
        console.error('[Dashboard] WebSocket error:', e);
        wsIndicator.className = 'ws-disconnected';
        wsIndicator.title = 'WebSocket error — check console';
      };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'init' || msg.type === 'event') {
            if (msg.state) {
            // Whitelist merge: only accept backend-owned fields, protect frontend-only state
            const BACKEND_STATE_KEYS = ['status','currentGoal','currentTaskId','currentTaskLabel',
              'activeTools','recentFiles','lastError','recentDecisions','timeline',
              'eventCount','lastConfidence','streamingText'];
            for (const key of BACKEND_STATE_KEYS) {
              if (key in msg.state) agentState[key] = msg.state[key];
            }
            // When task finishes (status → idle), preserve last task display
            // State will be cleared when NEW task starts (see applyEvent task_started)
            // This ensures user can still see what the last task accomplished
          }
          if (msg.event) {
              allEvents = [msg.event, ...allEvents].slice(0, 200);
              // Auto-load graph when new task starts
              if (msg.event.type === 'task_started' && msg.event.payload?.taskId) {
                const newTaskId = msg.event.payload.taskId;
                if (window.HologramBrain && typeof window.HologramBrain.loadGraph === 'function') {
                  window.HologramBrain.loadGraph(newTaskId).catch(err => {
                    console.warn('[Dashboard] Failed to load graph for task:', newTaskId, err.message);
                  });
                }
              }
            }
            if (msg.events && msg.events.length > 0) {
                allEvents = [...msg.events, ...allEvents].slice(0, 200);
                // Also extract last completed task from WS init events
                if (!lastCompletedTaskId) {
                  for (const ev of msg.events) {
                    if (ev.type === 'task_finished' && ev.payload?.taskId) {
                      lastCompletedTaskId = ev.payload.taskId;
                      break;
                    }
                  }
                }
              }
          }
          // RAF debounce – batch rapid WS events into a single 60fps frame
          if (!_renderPending) {
            _renderPending = true;
            requestAnimationFrame(() => {
              _renderPending = false;
              renderAllFromState();
            });
          }
          // Forward agent events to HologramBrain via CustomEvent (no duplicate WebSocket)
          var brainView = document.getElementById('brain-view');
          if (brainView) {
            brainView.dispatchEvent(new CustomEvent('hologram:agent-event', { detail: msg }));
          }
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
        if (stateData.data) Object.assign(agentState, stateData.data);  // Merge, don't replace
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        allEvents = (eventsData.data || []).slice(0, 200);
        // Extract last completed task ID from initial events
        for (const ev of allEvents) {
          if (ev.type === 'task_finished' && ev.payload?.taskId) {
            lastCompletedTaskId = ev.payload.taskId;
            break;
          }
        }
      }

      renderAllFromState();
    } catch {
      // Server might not be ready yet
    }
  }

  // ═══ LOCAL STATE REDUCER (fallback) ═══
  function applyEvent(event) {
    // Buffer events while paused (Priority 5)
    if (agentState.focusPaused) {
      agentState.focusEventBuffer.push(event);
      return;  // Don't render yet
    }
    
    // Increment event counter (Priority 2) — after pause check
    // Backend sends eventCount, but we also increment locally for real-time UI
    agentState.eventCount = (agentState.eventCount || 0) + 1;
    eventCount.textContent = `${agentState.eventCount} events`;
    
    const p = event.payload || {};
    switch (event.type) {
      case 'task_started':
        agentState.status = 'working';
        agentState.currentGoal = p.goal || null;
        agentState.currentTaskId = p.taskId || null;
        agentState.currentTaskLabel = p.goal || null;
        agentState.eventCount = 0;  // Reset counter on new task
        eventCount.textContent = '0 events';
        traceTaskId = p.taskId || null;
        // Clear stale decisions from previous tasks
        agentState.recentDecisions = [];
        agentState.streamingText = '';
        agentState.activeTools = [];
        break;
        
      case 'task_finished':
        agentState.status = p.success ? 'idle' : 'error';
        if (p.taskId) lastCompletedTaskId = p.taskId;
        break;
        
      case 'tool_called':
        agentState.activeTools.unshift({
          callId: p.callId, toolName: p.toolName, args: p.args || {}, startedAt: event.timestamp,
        });
        // Start tool timer (Priority 3)
        agentState.toolStartTime = event.timestamp;
        if (agentState.toolTimer) clearInterval(agentState.toolTimer);
        agentState.toolTimer = setInterval(updateToolDuration, 100);
        break;
        
      case 'tool_finished': {
        const finishedTool = agentState.activeTools.find(t => t.callId === p.callId);
        agentState.activeTools = agentState.activeTools.filter(t => t.callId !== p.callId);
        // Keep finished tool visible briefly (3s) so user can see it
        if (finishedTool) {
          agentState.recentTools.unshift({ ...finishedTool, finishedAt: Date.now() });
          if (agentState.recentTools.length > 5) agentState.recentTools.pop();
        }
        // Stop tool timer
        if (agentState.toolTimer) {
          clearInterval(agentState.toolTimer);
          agentState.toolTimer = null;
        }
        break;
      }
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
          decisionId: p.decisionId,
          decision: p.decision,
          reason: p.reason,
          reasoningSnippet: p.reasoningSnippet,
          nextAction: p.nextAction,
          taskId: p.taskId || null,
          timestamp: event.timestamp,
          confidence: p.confidence || null,
        });
        // Store confidence for bar animation (Priority 4)
        agentState.lastConfidence = p.confidence || null;
        if (agentState.recentDecisions.length > 20) agentState.recentDecisions.pop();
        break;
        
      case 'reasoning_updated':
        // Handle streaming reasoning (Priority 1)
        agentState.streamingText = p.chunk || p.fullReasoning || '';
        agentState.streamIndex = 0;
        startStreamingReasoning();
        break;
        
      case 'error':
        agentState.status = 'error';
        agentState.lastError = { message: p.message, code: p.code, timestamp: event.timestamp };
        break;
    }
  }

  // ═══ RENDER ═══
  
  // Streaming reasoning (Priority 1)
  function startStreamingReasoning() {
    // Clear existing stream timer
    if (agentState.streamTimer) clearTimeout(agentState.streamTimer);
    
    const thoughtEl = document.getElementById('focus-thought');
    if (!thoughtEl) return;
    
    // Fade out previous text
    thoughtEl.style.opacity = '0.5';
    
    // Stream new text character by character
    agentState.streamIndex = 0;
    streamNextChar();
  }
  
  function streamNextChar() {
    if (agentState.streamIndex >= agentState.streamingText.length) {
      // Streaming complete
      const thoughtEl = document.getElementById('focus-thought');
      if (thoughtEl) {
        thoughtEl.style.opacity = '1';
        thoughtEl.classList.remove('streaming');
      }
      return;
    }
    
    const thoughtEl = document.getElementById('focus-thought');
    if (!thoughtEl) return;
    
    // Add next character
    const text = agentState.streamingText.substring(0, agentState.streamIndex + 1);
    thoughtEl.textContent = text;
    thoughtEl.classList.add('streaming');
    thoughtEl.style.opacity = '1';
    
    agentState.streamIndex++;
    
    // Schedule next char (30ms = ~33 chars/sec, natural typing speed)
    agentState.streamTimer = setTimeout(streamNextChar, 30);
  }
  
  // Tool duration timer (Priority 3)
  function updateToolDuration() {
    if (!agentState.toolStartTime) return;
    
    const toolEl = document.getElementById('focus-tool-display');
    if (!toolEl) return;
    
    const elapsed = Date.now() - agentState.toolStartTime;
    const seconds = (elapsed / 1000).toFixed(1);
    
    // Update tool display with live timer
    const toolName = agentState.activeTools[0]?.toolName || 'Unknown';
    toolEl.innerHTML = `<span class="tool-icon">🔧</span><span class="tool-name">${escapeHtml(toolName)}</span><span class="tool-status">Running... (${seconds}s ⏱)</span>`;
  }
  
  // Confidence bar animation (Priority 4)
  function updateConfidenceBar() {
    const confidenceEl = document.getElementById('focus-prediction-confidence');
    if (!confidenceEl) return;
    
    if (agentState.lastConfidence === null || agentState.lastConfidence === undefined) {
      confidenceEl.textContent = 'Confidence: —';
      confidenceEl.style.backgroundColor = 'transparent';
      return;
    }
    
    const percent = Math.round(agentState.lastConfidence * 100);
    confidenceEl.textContent = `Confidence: ${percent}%`;
    
    // Animate bar width
    const barEl = document.getElementById('focus-confidence-bar');
    if (barEl) {
      barEl.style.width = `${agentState.lastConfidence * 100}%`;
      // Color: cyan if >= 0.5, amber if < 0.5
      barEl.style.backgroundColor = agentState.lastConfidence >= 0.5 ? 'var(--accent)' : '#ffb700';
    }
  }
  
  // Pause/Resume control (Priority 5)
  function togglePauseFocus() {
    agentState.focusPaused = !agentState.focusPaused;
    
    const pauseBtn = document.getElementById('focus-pause-btn');
    if (pauseBtn) {
      pauseBtn.textContent = agentState.focusPaused ? 'RESUME' : 'PAUSE';
      pauseBtn.style.borderColor = agentState.focusPaused ? 'var(--accent)' : 'var(--border)';
    }
    
    // If resuming, flush buffered events
    if (!agentState.focusPaused && agentState.focusEventBuffer.length > 0) {
      const buffered = agentState.focusEventBuffer.splice(0);
      buffered.forEach(e => applyEvent(e));
      renderAllFromState();
    }
  }

  function renderAllFromState() {
    renderMission();
    renderActiveTools();
    renderCurrentDecision();
    renderNextAction();
    renderTimeline();
    renderFileChanges();
    renderTelemetryDebug();
    renderError();

    // Tab-aware: skip heavy renders if their tab isn't active
    switch (currentTab) {
      case 'trace':
        renderTrace();
        renderMcpTrace();
        renderCost();
        renderControl();
        break;
      case 'focus':
        renderFocus();
        updateConfidenceBar();
        break;
      case 'graph':
        renderGraph();
        break;
      case 'memory':
        document.dispatchEvent(new CustomEvent('memory-refresh'));
        break;
      // 'mission' and 'brain' — no extra heavy rendering needed in the hot path
    }
  }

  function renderMission() {
    const goal = agentState.currentTaskLabel || agentState.currentGoal;
    missionGoal.textContent = goal || 'Awaiting task';
    const badge = STATUS_BADGES[agentState.status] || STATUS_BADGES.idle;
    missionBadge.textContent = badge.label;
    missionBadge.className = `badge ${badge.class}`;
  }

  function renderActiveTools() {
    // Auto-purge expired recent tools (older than 3s)
    const now = Date.now();
    agentState.recentTools = agentState.recentTools.filter(t => t.finishedAt && (now - t.finishedAt) < 3000);

    const tools = [...agentState.activeTools, ...agentState.recentTools];
    if (tools.length === 0) {
      activeToolsEl.innerHTML = '<div class="empty-state">No active tools</div>';
      return;
    }
    activeToolsEl.innerHTML = tools.map(t => {
      const argsStr = summarizeArgs(t.args);
      const isSelected = selectedEntity && selectedEntity.kind === 'tool' && selectedEntity.tool.callId === t.callId;
      const isRecent = !!t.finishedAt;
      return `<div class="tool-item${isSelected ? ' selected' : ''}${isRecent ? ' recent' : ''}" data-callid="${escapeHtml(t.callId)}" data-toolname="${escapeHtml(t.toolName)}">
        <span class="tool-name">${escapeHtml(t.toolName)}</span>
        ${argsStr ? `<span class="tool-args">${escapeHtml(argsStr)}</span>` : ''}
        ${isRecent ? '<span class="tool-finished">✓</span>' : ''}
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
    let idHtml = '';
    let reasoningHtml = '';
    
    // Developer mode: show IDs
    if (viewMode === 'developer') {
      if (d.decisionId) {
        idHtml = '<div class="decision-debug-id">📋 ' + escapeHtml(d.decisionId) + (d.taskId ? ' | <span class="mono">task:</span> ' + escapeHtml(d.taskId) : '') + '</div>';
      }
    }
    
    // Reasoning-first priority: reasoningSnippet > reason > fallback
    if (d.reasoningSnippet) {
      reasoningHtml = '<div class="decision-reasoning-priority">' + escapeHtml(d.reasoningSnippet.substring(0, 300)) + (d.reasoningSnippet.length > 300 ? '…' : '') + '</div>';
    } else if (d.reason) {
      reasoningHtml = '<div class="decision-reason">' + escapeHtml(d.reason) + '</div>';
    } else {
      reasoningHtml = '<div class="decision-thinking">Agent is thinking...</div>';
    }
    
    currentDecisionEl.innerHTML =
      '<div class="decision-item' + (isSelected ? ' selected' : '') + '" data-decision-index="0">' +
        idHtml +
        '<div class="decision-main">' + escapeHtml(d.decision) + '</div>' +
        reasoningHtml +
      '</div>';
  }

  function renderNextAction() {
    const d = agentState.recentDecisions[0];
    if (!d) {
      nextActionEl.textContent = '— Awaiting action —';
      return;
    }
    nextActionEl.textContent = d.nextAction;
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

    // Render max 50 items (reduced from 100 — fewer DOM nodes = faster layout)
    timelineEl.innerHTML = items.slice(0, 50).map(e => {
      const time = formatTime(e.timestamp);
      const type = e.type.replace('_', ' ');
      const p = e.payload || {};
      let text, devSuffix = '';
      if (viewMode === 'developer') {
        text = summarizeEventDev(e);
        if (p.decisionId || p.callId || p.taskId) {
          const ids = [];
          if (p.taskId) ids.push('t:' + p.taskId.substring(0, 8));
          if (p.decisionId) ids.push('d:' + p.decisionId.substring(0, 8));
          if (p.callId) ids.push('c:' + p.callId.substring(0, 8));
          devSuffix = ' <span class="dev-ids">' + ids.join(' ') + '</span>';
        }
      } else {
        text = summarizeEvent(e);
      }
      const isSelected = selectedEntity && selectedEntity.kind === 'event' && selectedEntity.event.id === e.id;
      return `<div class="timeline-item${isSelected ? ' selected' : ''}" data-event-id="${escapeHtml(e.id)}">
        <span class="timeline-time">${time}</span>
        <span class="timeline-type" ${getTypeAttr(e.type)}>${type}</span>
        <span class="timeline-text">${escapeHtml(text)}${devSuffix}</span>
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

  function renderTelemetryDebug() {
    if (!telemetryDebugEl) return;
    const decisions = agentState.recentDecisions;
    if (decisions.length === 0) {
      telemetryDebugEl.innerHTML = '<div class="empty-state">No decisions yet</div>';
      return;
    }
    telemetryDebugEl.innerHTML = decisions.slice(0, 20).map(d => {
      const hasIds = viewMode === 'developer' && (d.decisionId || d.reasoningSnippet || d.taskId);
      const idLine = hasIds
        ? '<div class="telemetry-ids">' +
          (d.decisionId ? '<span class="mono">📋 ' + escapeHtml(d.decisionId) + '</span>' : '') +
          (d.taskId ? ' <span class="mono">task:' + escapeHtml(d.taskId) + '</span>' : '') +
          '</div>'
        : '';
      const snippet = viewMode === 'developer' && d.reasoningSnippet
        ? '<div class="telemetry-snippet">' + escapeHtml(d.reasoningSnippet.substring(0, 200)) + (d.reasoningSnippet.length > 200 ? '…' : '') + '</div>'
        : '';
      return '<div class="telemetry-item">' +
        idLine +
        '<div class="telemetry-decision">' + escapeHtml(d.decision) + '</div>' +
        '<div class="telemetry-reason">' + escapeHtml(d.reason) + '</div>' +
        snippet +
        '<div class="telemetry-meta">' + formatTime(d.timestamp) + '</div>' +
      '</div>';
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
    
    // If task_started/task_finished, switch to trace view with that task
    if ((event.type === 'task_started' || event.type === 'task_finished') && event.payload?.taskId) {
      traceTaskId = event.payload.taskId;
      switchTab('trace');
      renderTrace();
    }
    
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
    
    // Find linked tool events via decisionId
    let linkedToolsHtml = '';
    if (decision.decisionId) {
      const linkedEvents = allEvents.filter(ev =>
        ev.payload && ev.payload.decisionId === decision.decisionId &&
        (ev.type === 'tool_called' || ev.type === 'tool_finished')
      );
      if (linkedEvents.length > 0) {
        linkedToolsHtml = '<div class="inspector-section"><div class="inspector-section-title">🔧 Linked Tool Calls</div>';
        for (const ev of linkedEvents) {
          const p = ev.payload;
          const success = p.success !== undefined ? (p.success ? '✅' : '❌') : '⏳';
          const dur = p.durationMs ? `${p.durationMs}ms` : '';
          linkedToolsHtml += `<div class="inspector-linked-tool">
            <span class="inspector-tool-icon">${success}</span>
            <span class="inspector-tool-name">${escapeHtml(p.toolName || '?')}</span>
            <span class="inspector-tool-dur">${dur}</span>
          </div>`;
        }
        linkedToolsHtml += '</div>';
      }
    }

    inspectorContent.innerHTML =
      field('Decision', decision.decision) +
      field('Reason', decision.reason) +
      field('Next Action', decision.nextAction, 'mono') +
      (decision.decisionId ? field('Decision ID', decision.decisionId, 'mono') : '') +
      (decision.taskId ? field('Task ID', decision.taskId, 'mono') : '') +
      (decision.reasoningSnippet ? field('Reasoning Snippet', '<div class="inspector-json snippet">' + escapeHtml(decision.reasoningSnippet) + '</div>') : '') +
      linkedToolsHtml +
      field('Timestamp', formatTime(decision.timestamp) + ' (' + decision.timestamp + ')');
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
    // Memoize time formatting: same timestamp → same result
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
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

  function summarizeEventDev(e) {
    const p = e.payload || {};
    switch (e.type) {
      case 'task_started': return `ID:${p.taskId || '—'} Goal:${p.goal || '—'}`;
      case 'task_finished': return `${p.success ? '✓' : '✗'} ID:${p.taskId || '—'}`;
      case 'tool_called': return `${p.toolName}() args:${Object.keys(p.args || {}).slice(0,2).join(',')}`;
      case 'tool_finished': return `${p.toolName} → ${p.success ? '✓' : '✗'} (${p.durationMs || '?'}ms)`;
      case 'decision_made': return `${p.decision || '—'} | reason:${(p.reason || '').substring(0, 60)}`;
      case 'file_created': return `+ ${p.path}`;
      case 'file_modified': return `~ ${p.path}`;
      case 'file_deleted': return `− ${p.path}`;
      case 'error': return `[${p.code || 'ERR'}] ${p.message}`;
      default: return e.type + ' ' + JSON.stringify(p).substring(0, 80);
    }
  }

  function getTypeAttr(type) {
    if (type.startsWith('tool')) return 'data-type="tool"';
    if (type.startsWith('decision')) return 'data-type="decision"';
    if (type.startsWith('task')) return 'data-type="task"';
    if (type.startsWith('file')) return 'data-type="file"';
    if (type === 'error') return 'data-type="error"';
    return '';
  }

  // ═══ THEME ═══
  function loadTheme() {
    const saved = localStorage.getItem('coral-theme');
    if (saved === 'light') document.body.classList.add('light');
  }
  function setupThemeToggle() {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('light');
      localStorage.setItem('coral-theme', document.body.classList.contains('light') ? 'light' : 'dark');
    });
  }

  // ═══ VIEW TOGGLE (User / Developer) ═══
  function setupViewToggle() {
    const btn = viewToggleBtn;
    if (!btn) return;
    btn.addEventListener('click', () => {
      viewMode = viewMode === 'user' ? 'developer' : 'user';
      btn.textContent = viewMode === 'user' ? '👤 User' : '🔧 Dev';
      btn.classList.toggle('dev-active', viewMode === 'developer');
      renderAllFromState();
    });
  }

  // ═══ RENDER GRAPH ═══
  async function renderGraph() {
    const selectEl = document.getElementById('graph-task-select');
    const taskId = selectEl?.value || agentState.currentTaskId || lastCompletedTaskId;
    const graphView = document.getElementById('graph-view');
    const refreshBtn = document.getElementById('graph-refresh-btn');
    
    if (!taskId) {
      // Show placeholder but don't destroy DOM (keep header/selector intact)
      const placeholder = document.getElementById('graph-empty-placeholder');
      const svg = document.getElementById('graph-svg');
      if (placeholder) placeholder.classList.remove('hidden');
      if (svg) svg.style.display = 'none';
      // Still populate the dropdown
      if (selectEl) {
        try {
          const res = await fetch('/api/events/recent');
          const json = await res.json();
          if (json.success && json.data) {
            const taskSet = new Set();
            for (const e of json.data) {
              if (e.payload?.taskId) taskSet.add(e.payload.taskId);
            }
            const taskIds = Array.from(taskSet).sort().reverse();
            selectEl.innerHTML = '<option value="">-- Select Task --</option>';
            for (const id of taskIds) {
              selectEl.innerHTML += `<option value="${escapeHtml(id)}">${escapeHtml(id.substring(0, 30))}</option>`;
            }
            selectEl.onchange = () => { if (selectEl.value) renderGraph(); };
          }
        } catch (e) {}
      }
      return;
    }

    // Populate dropdown with available tasks
    if (selectEl) {
      try {
        const res = await fetch('/api/events/recent');
        const json = await res.json();
        if (json.success && json.data) {
          const taskSet = new Set();
          for (const e of json.data) {
            if (e.payload?.taskId) taskSet.add(e.payload.taskId);
          }
          const taskIds = Array.from(taskSet).sort().reverse();
          selectEl.innerHTML = '<option value="">-- Select Task --</option>';
          for (const id of taskIds) {
            selectEl.innerHTML += `<option value="${escapeHtml(id)}">${escapeHtml(id.substring(0, 30))}</option>`;
          }
          if (taskId && taskIds.includes(taskId)) selectEl.value = taskId;
          // Wire up selection change
          selectEl.onchange = () => {
            if (selectEl.value) renderGraph();
          };
        }
      } catch (e) {
        // Non-critical
      }
    }
    
    // Wire up refresh button
    if (refreshBtn) {
      refreshBtn.onclick = () => renderGraph();
    }

    try {
      // Fetch graph from API (cached 5s — same taskId = same graph data)
      const json = await _cachedFetch(`/api/graph/${taskId}`);
      
      if (!json.success || !json.data) {
        document.getElementById('graph-task-id').textContent = taskId;
        document.getElementById('graph-node-count').textContent = '0 nodes';
        document.getElementById('graph-edge-count').textContent = '0 edges';
        drawEmptyGraph();
        return;
      }

      const graph = json.data;
      document.getElementById('graph-task-id').textContent = taskId;
      document.getElementById('graph-node-count').textContent = `${graph.nodes.length} nodes`;
      document.getElementById('graph-edge-count').textContent = `${graph.edges.length} edges`;

      if (viewMode !== 'developer') {
        // Filter for user mode: hide IDs
        graph.nodes = graph.nodes.map(n => ({
          ...n,
          label: n.label.replace(/:[a-z0-9-]+$/i, ''), // Strip IDs
        }));
      }

      // Hide placeholder, show SVG
      const ph = document.getElementById('graph-empty-placeholder');
      if (ph) ph.classList.add('hidden');
      const svgEl = document.getElementById('graph-svg');
      if (svgEl) svgEl.style.display = '';
      
      drawGraph(graph);
    } catch (err) {
      console.error('[renderGraph]', err);
      document.getElementById('graph-svg').innerHTML = 
        `<text x="50%" y="50%" text-anchor="middle">Error loading graph</text>`;
    }
  }

  function drawEmptyGraph() {
    const svg = document.getElementById('graph-svg');
    svg.innerHTML = `
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="var(--text-dim)" />
        </marker>
      </defs>
      <text x="50%" y="50%" text-anchor="middle" fill="var(--text-dim)" dy=".3em">
        No graph data available
      </text>
    `;
  }

  function drawGraph(graph) {
    const svg = document.getElementById('graph-svg');
    const width = svg.clientWidth || 800;
    const height = 600;
    
    // Clear SVG
    svg.innerHTML = '';

    // Add defs
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L0,6 L9,3 z" fill="var(--text-dim)" />
      </marker>
    `;
    svg.appendChild(defs);

    // Simple layout: arrange nodes vertically by type
    const nodePositions = new Map();
    let y = 60;
    const nodesByType = { decision: [], tool: [], artifact: [] };
    
    for (const node of graph.nodes) {
      nodesByType[node.type]?.push(node);
    }

    // Layout: decisions in column 1, tools in column 2, artifacts in column 3
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
      
      if (!from || !to) continue;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.setAttribute('class', `graph-edge ${edge.relation}-edge`);
      svg.appendChild(line);
    }

    // Draw nodes
    for (const node of graph.nodes) {
      const pos = nodePositions.get(node.id);
      if (!pos) continue;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `graph-node ${node.type}-node`);
      g.setAttribute('data-id', node.id);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', 16);
      g.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos.x);
      text.setAttribute('y', pos.y);
      text.setAttribute('class', 'graph-node-label');
      
      const label = node.label.substring(0, 12);
      text.textContent = label;
      g.appendChild(text);

      // Tooltip on hover
      g.addEventListener('mouseenter', (e) => {
        showNodeTooltip(e, node);
      });

      svg.appendChild(g);
    }
  }

  function showNodeTooltip(e, node) {
    // Dev mode: show full node info
    if (viewMode === 'developer') {
      console.log(`[${node.type}] ${node.label}`, node);
    }
  }

  // ═══ TABS ═══
  function setupTabs() {
    tabMissionBtn?.addEventListener('click', () => switchTab('mission'));
    tabTraceBtn?.addEventListener('click', () => switchTab('trace'));
    document.getElementById('tab-focus')?.addEventListener('click', () => switchTab('focus'));
    document.getElementById('tab-memory')?.addEventListener('click', () => switchTab('memory'));
    // Tab graph riêng đã bỏ - graph nằm trong brain tab
    document.getElementById('tab-brain')?.addEventListener('click', () => switchTab('brain'));
    
    // Setup pause button (Priority 5)
    const pauseBtn = document.getElementById('focus-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', togglePauseFocus);
    }

    // Legend toggle cho brain tab
    const legendToggle = document.getElementById('brain-legend-toggle');
    const legend = document.getElementById('brain-legend');
    if (legendToggle && legend) {
      // Collapse mặc định trên mobile
      if (window.innerWidth < 768) {
        legend.classList.add('collapsed');
        legendToggle.textContent = '▶';
      }
      legendToggle.addEventListener('click', function () {
        legend.classList.toggle('collapsed');
        legendToggle.textContent = legend.classList.contains('collapsed') ? '▶' : '▼';
      });
    }

    // View mode buttons for Brain tab (🧠 Brain / ⚡ Combined / 📊 Graph)
    setupBrainViewModes();
  }

  function setupBrainViewModes() {
    const modes = [
      { btn: 'view-mode-brain', mode: 'brain' },
      { btn: 'view-mode-combined', mode: 'combined' },
      { btn: 'view-mode-graph', mode: 'graph' },
    ];
    modes.forEach(function (m) {
      var el = document.getElementById(m.btn);
      if (!el) return;
      el.addEventListener('click', function () {
        // Update active class
        modes.forEach(function (x) {
          var xel = document.getElementById(x.btn);
          if (xel) xel.classList.remove('active');
        });
        el.classList.add('active');
        // Call CodeGraph if available
        if (window.CodeGraph && typeof window.CodeGraph.setMode === 'function') {
          window.CodeGraph.setMode(m.mode);
        }
      });
    });
  }

  function switchTab(tab) {
    if (currentTab === tab) return;
    currentTab = tab;
    
    tabMissionBtn?.classList.toggle('active', tab === 'mission');
    tabTraceBtn?.classList.toggle('active', tab === 'trace');
    document.getElementById('tab-focus')?.classList.toggle('active', tab === 'focus');
    document.getElementById('tab-memory')?.classList.toggle('active', tab === 'memory');
    document.getElementById('tab-brain')?.classList.toggle('active', tab === 'brain');
    // Tab graph riêng đã bị bỏ - graph nằm trong brain tab
    
    missionView?.classList.toggle('hidden', tab !== 'mission');
    traceView?.classList.toggle('hidden', tab !== 'trace');
    document.getElementById('focus-view')?.classList.toggle('hidden', tab !== 'focus');
    document.getElementById('memory-view')?.classList.toggle('hidden', tab !== 'memory');
    document.getElementById('brain-view')?.classList.toggle('hidden', tab !== 'brain');
    // Graph view riêng không còn - graph nằm trong brain tab
    
    if (tab === 'trace') {
      renderTrace();
      renderMcpTrace();
      renderCost();
      renderControl();
    } else if (tab === 'focus') {
      renderFocus();
    } else if (tab === 'memory') {
      // Signal memory tab to load (handled by memory-tab.js)
      document.dispatchEvent(new CustomEvent('memory-tab-activated'));
    } else if (tab === 'brain') {
      // Initialize CodeGraph on FIRST visit only
      const container = document.getElementById('brain-canvas-container');
      if (container && window.THREE && window.CodeGraph && !container.querySelector('canvas')) {
        window.CodeGraph.init(container);
        // Load graph data automatically
        window.CodeGraph.loadGraph().catch(err => {
          console.warn('[Dashboard] Failed to load graph:', err.message);
        });
      }
    }
  }

  function renderTrace() {
    const taskId = traceTaskId || lastCompletedTaskId;
    
    if (!taskId) {
      traceContainer.innerHTML = `
        <div class="trace-empty-state">
          <div class="trace-empty-icon">📚</div>
          <div class="trace-empty-title">No Task Selected</div>
          <div class="trace-empty-hint">Click a task event in Timeline to view its trace</div>
          <button class="trace-load-latest-btn" id="load-latest-btn">📖 Open Latest Trace</button>
        </div>
      `;
      traceTaskId$.textContent = '—';
      traceTaskStatus.textContent = '—';
      
      // Attach click handler for latest trace button
      const btn = document.getElementById('load-latest-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          if (lastCompletedTaskId) {
            traceTaskId = lastCompletedTaskId;
            renderTrace();
          } else {
            btn.textContent = '⏳ No completed tasks yet';
            btn.disabled = true;
            setTimeout(() => {
              btn.textContent = '📖 Open Latest Trace';
              btn.disabled = false;
            }, 2000);
          }
        });
      }
      return;
    }
    
    // Fetch trace from API (backend builds it)
    _cachedFetch(`/api/trace/${encodeURIComponent(taskId)}`)
      .then(data => {
        if (!data.success) {
          traceContainer.innerHTML = `<div class="empty-state">Error: ${escapeHtml(data.error || 'Unknown error')}</div>`;
          return;
        }
        
        const trace = data.data;
        
        // Update header
        traceTaskId$.textContent = taskId;
        const taskEvent = allEvents.find(e => e.payload?.taskId === taskId && (e.type === 'task_started' || e.type === 'task_finished'));
        traceTaskStatus.textContent = taskEvent?.type === 'task_finished' ? (taskEvent.payload?.success ? '✓ COMPLETED' : '✗ FAILED') : 'RUNNING';
        
        // Render trace
        if (trace.decisions.length === 0) {
          traceContainer.innerHTML = '<div class="empty-state">No decisions recorded for this task</div>';
          return;
        }
        
        let html = '';
        for (let i = 0; i < trace.decisions.length; i++) {
          html += renderDecisionCard(trace.decisions[i], i);
        }
        
        traceContainer.innerHTML = html;
        
        // Attach click handlers
        traceContainer.find('[data-decision-index]').forEach(el => {
          el.addEventListener('click', (e) => onTraceDecisionClick(e, trace.decisions));
        });
        traceContainer.find('[data-trace-tool-idx]').forEach(el => {
          el.addEventListener('click', (e) => onTraceToolClick(e, trace.decisions));
        });
        traceContainer.find('[data-trace-artifact-idx]').forEach(el => {
          el.addEventListener('click', (e) => onTraceArtifactClick(e, trace.decisions));
        });
      })
      .catch(err => {
        traceContainer.innerHTML = `<div class="empty-state">Error loading trace: ${escapeHtml(err.message)}</div>`;
      });
  }

  /**
   * Render MCP Trace — tool call stats + timeline
   */
  function renderMcpTrace() {
    const statsEl = document.getElementById('mcp-trace-stats');
    const timelineEl = document.getElementById('mcp-trace-timeline');
    const summaryEl = document.getElementById('mcp-trace-summary');
    const filterEl = document.getElementById('mcp-trace-tool-filter');
    if (!statsEl || !timelineEl) return;

    const toolFilter = filterEl?.value || 'all';
    const url = toolFilter === 'all' ? '/api/mcp/trace?limit=200' : `/api/mcp/trace?limit=200&tool=${encodeURIComponent(toolFilter)}`;

    _cachedFetch(url)
      .then(data => {
        if (!data.success || !data.data) {
          statsEl.innerHTML = '<div class="empty-state">No tool trace data</div>';
          timelineEl.innerHTML = '';
          if (summaryEl) summaryEl.textContent = '—';
          return;
        }

        const { stats, timeline, summary } = data.data;

        // Summary line
        if (summaryEl) {
          summaryEl.textContent = `${summary.totalCalls} calls \u00B7 ${summary.uniqueToolCount} tools \u00B7 ${(summary.overallSuccessRate * 100).toFixed(0)}% ok \u00B7 avg ${summary.avgDurationMs.toFixed(0)}ms`;
        }

        // Populate filter dropdown
        if (filterEl) {
          const current = filterEl.value;
          filterEl.innerHTML = '<option value="all">All Tools</option>';
          for (const s of stats) {
            filterEl.innerHTML += `<option value="${escapeHtml(s.toolName)}">${escapeHtml(s.toolName)} (${s.totalCount})</option>`;
          }
          filterEl.value = current;
        }

        // Render stats cards
        let statsHtml = '<div class="mcp-stats-grid">';
        for (const s of stats) {
          const barW = Math.min(s.avgDurationMs / 10, 100);
          statsHtml += `<div class="mcp-stat-card" data-tool="${escapeHtml(s.toolName)}">
            <div class="mcp-stat-name">\uD83D\uDD27 ${escapeHtml(s.toolName)}</div>
            <div class="mcp-stat-row"><span>Calls:</span><span>${s.totalCount}</span></div>
            <div class="mcp-stat-row"><span>Success:</span><span class="${s.successRate >= 0.8 ? 'color-ok' : 'color-warn'}">${(s.successRate * 100).toFixed(0)}%</span></div>
            <div class="mcp-stat-row"><span>Avg:</span><span>${s.avgDurationMs.toFixed(0)}ms</span></div>
            <div class="mcp-stat-row"><span>P95:</span><span>${s.p95DurationMs.toFixed(0)}ms</span></div>
            <div class="mcp-stat-row"><span>Min/Max:</span><span>${s.minDurationMs}ms / ${s.maxDurationMs}ms</span></div>
            <div class="mcp-stat-bar"><div class="mcp-stat-bar-fill" style="width:${barW}%"></div></div>
          </div>`;
        }
        statsHtml += '</div>';
        statsEl.innerHTML = statsHtml;

        // Render timeline (newest first, show top 50)
        const visible = timeline.slice(0, 50);
        let timelineHtml = '<div class="mcp-timeline-list">';
        const maxDur = Math.max(...visible.map(t => t.durationMs), 1);
        for (const call of visible) {
          const barPct = (call.durationMs / maxDur * 100).toFixed(1);
          const statusIcon = call.success ? '\u2705' : '\u274C';
          const argsPreview = call.args ? JSON.stringify(call.args).substring(0, 80) : '\u2014';
          const resultPreview = call.result ? call.result.substring(0, 120) : '\u2014';

          timelineHtml += `<div class="mcp-timeline-item ${call.success ? '' : 'mcp-timeline-fail'}">
            <div class="mcp-tl-header">
              <span class="mcp-tl-toolname">${statusIcon} ${escapeHtml(call.toolName)}</span>
              <span class="mcp-tl-duration">${call.durationMs}ms</span>
            </div>
            <div class="mcp-tl-bar-track">
              <div class="mcp-tl-bar-fill ${call.success ? 'mcp-tl-bar-ok' : 'mcp-tl-bar-fail'}" style="width:${barPct}%"></div>
            </div>
            <details class="mcp-tl-details">
              <summary>Args & Result</summary>
              <div class="mcp-tl-args"><strong>Args:</strong> <code>${escapeHtml(argsPreview)}</code></div>
              <div class="mcp-tl-result"><strong>Result:</strong> <code>${escapeHtml(resultPreview)}</code></div>
            </details>
          </div>`;
        }
        timelineHtml += '</div>';
        timelineEl.innerHTML = timelineHtml;

        // Attach filter change handler
        if (filterEl) {
          filterEl.onchange = () => renderMcpTrace();
        }
      })
      .catch(err => {
        statsEl.innerHTML = `<div class="empty-state">Error: ${escapeHtml(err.message)}</div>`;
      });
  }

  /**
   * Render COST panel — budget, spending, alerts
   */
  function renderCost() {
    _cachedFetch('/api/cost/session')
      .then(data => {
        if (!data.success) return;
        const s = data.data;
        const budgetEl = document.getElementById('cost-budget-value');
        const barEl = document.getElementById('cost-progress-bar');
        const pctEl = document.getElementById('cost-budget-pct');
        if (budgetEl) budgetEl.textContent = `$${s.totalCostUsd.toFixed(4)}`;
        _cachedFetch('/api/cost/budget').then(bd => {
          if (!bd.success) return;
          const b = bd.data;
          if (barEl) {
            barEl.style.width = `${Math.min(b.pct, 100)}%`;
            barEl.className = `cost-progress-fill ${b.pct >= 90 ? 'cost-danger' : b.pct >= 70 ? 'cost-warn' : 'cost-ok'}`;
          }
          if (pctEl) pctEl.textContent = `${b.pct.toFixed(1)}% used`;
          if (budgetEl) budgetEl.textContent = `$${b.spentUsd.toFixed(4)} / $${b.budgetUsd}`;
        }).catch(() => {});
        const spentEl = document.getElementById('cost-spent-value');
        const remainEl = document.getElementById('cost-remaining');
        if (spentEl) spentEl.textContent = `$${s.totalCostUsd.toFixed(4)}`;
        if (remainEl) remainEl.textContent = `${s.totalCalls} API calls`;
        const callsEl = document.getElementById('cost-calls-value');
        const tokensEl = document.getElementById('cost-tokens');
        if (callsEl) callsEl.textContent = s.totalCalls;
        if (tokensEl) tokensEl.textContent = `${(s.totalInput + s.totalOutput).toLocaleString()} tokens (in: ${s.totalInput.toLocaleString()}, out: ${s.totalOutput.toLocaleString()})`;
        const modelEl = document.getElementById('cost-by-model');
        if (modelEl && s.byModel && Object.keys(s.byModel).length > 0) {
          let html = '<div class="cost-model-grid">';
          for (const [model, info] of Object.entries(s.byModel)) {
            html += `<div class="cost-model-item">
              <div class="cost-model-name">${escapeHtml(model)}</div>
              <div class="cost-model-calls">${info.calls} calls</div>
              <div class="cost-model-cost">$${info.cost.toFixed(4)}</div>
              <div class="cost-model-tokens">${info.input.toLocaleString()} in / ${info.output.toLocaleString()} out</div>
            </div>`;
          }
          html += '</div>';
          modelEl.innerHTML = html;
        }
        const summaryEl = document.getElementById('cost-summary');
        if (summaryEl) {
          const tok = s.totalInput + s.totalOutput;
          summaryEl.textContent = `${s.totalCalls} calls \u00B7 $${s.totalCostUsd.toFixed(4)} spent \u00B7 ${tok.toLocaleString()} tokens`;
        }
      })
      .catch(() => {});
    _cachedFetch('/api/cost/alerts')
      .then(data => {
        const alertsEl = document.getElementById('cost-alerts');
        if (!alertsEl || !data.success || !data.data?.length) return;
        let html = '<div class="cost-alert-list">';
        for (const alert of data.data.slice(-5)) {
          const icon = alert.severity === 'critical' ? '\u{1F534}' : alert.severity === 'warning' ? '\u{1F7E1}' : '\u{1F535}';
          html += `<div class="cost-alert-item cost-alert-${alert.severity}">${icon} ${escapeHtml(alert.message)}</div>`;
        }
        html += '</div>';
        alertsEl.innerHTML = html;
      })
      .catch(() => {});
  }


  /**
   * Render CONTROL panel — system health, memory management, diagnostics
   */
  function renderControl() {
    // Fetch health status
    _cachedFetch('/api/health')
      .then(data => {
        if (!data.success) return;
        const el = document.getElementById('ctrl-agent-status');
        if (el) el.textContent = data.data?.status || 'OK';
        const uptimeEl = document.getElementById('ctrl-uptime');
        if (uptimeEl) {
          const upMs = Date.now() - (data.data?.timestamp || Date.now());
          uptimeEl.textContent = Math.floor(upMs / 60000) + 'm';
        }
      })
      .catch(() => {});

    // Fetch memory stats
    _cachedFetch('/api/memory/stats')
      .then(data => {
        if (!data.success) return;
        const el = document.getElementById('ctrl-memory-count');
        if (el) el.textContent = data.data?.totalItems || 0;
      })
      .catch(() => {});

    // Fetch event stats
    _cachedFetch('/api/events/stats')
      .then(data => {
        if (!data.success) return;
        const total = Object.values(data.data || {}).reduce((sum, v) => sum + v, 0);
        const el = document.getElementById('ctrl-event-count');
        if (el) el.textContent = total;
      })
      .catch(() => {});

    // Wire up control buttons
    const outputEl = document.getElementById('control-output');
    const showOutput = (msg, type) => {
      if (!outputEl) return;
      outputEl.classList.add('visible');
      const time = new Date().toLocaleTimeString();
      outputEl.textContent += `[${time}] ${msg}
`;
      outputEl.scrollTop = outputEl.scrollHeight;
    };

    const flushBtn = document.getElementById('ctrl-flush-btn');
    if (flushBtn) {
      flushBtn.onclick = async () => {
        flushBtn.classList.add('loading');
        flushBtn.textContent = '⏳ Flushing...';
        try {
          const res = await fetch('/api/memory/flush', { method: 'POST' });
          const data = await res.json();
          flushBtn.classList.remove('loading');
          if (data.success) {
            flushBtn.classList.add('success');
            flushBtn.textContent = '✅ Flushed';
            showOutput(`Memory flushed: ${data.data?.count || 0} items`, 'success');
          } else {
            flushBtn.classList.add('error');
            flushBtn.textContent = '❌ Error';
            showOutput(`Flush failed: ${data.error}`, 'error');
          }
          setTimeout(() => { flushBtn.className = 'control-btn'; flushBtn.textContent = '💾 Flush Memory'; }, 2000);
        } catch (e) {
          flushBtn.classList.remove('loading');
          flushBtn.classList.add('error');
          flushBtn.textContent = '❌ Error';
          showOutput(`Flush error: ${e.message}`, 'error');
          setTimeout(() => { flushBtn.className = 'control-btn'; flushBtn.textContent = '💾 Flush Memory'; }, 2000);
        }
      };
    }

    const cleanupBtn = document.getElementById('ctrl-memory-cleanup-btn');
    if (cleanupBtn) {
      cleanupBtn.onclick = async () => {
        cleanupBtn.classList.add('loading');
        cleanupBtn.textContent = '⏳ Cleaning...';
        try {
          const res = await fetch('/api/memory/cleanup', { method: 'POST' });
          const data = await res.json();
          cleanupBtn.classList.remove('loading');
          if (data.success) {
            cleanupBtn.classList.add('success');
            cleanupBtn.textContent = '✅ Done';
            showOutput(`Cleanup: removed ${data.data?.removed || 0} expired items`, 'success');
          } else {
            cleanupBtn.classList.add('error');
            cleanupBtn.textContent = '❌ Error';
            showOutput(`Cleanup failed: ${data.error}`, 'error');
          }
          setTimeout(() => { cleanupBtn.className = 'control-btn'; cleanupBtn.textContent = '🧹 Cleanup'; }, 2000);
        } catch (e) {
          cleanupBtn.classList.remove('loading');
          cleanupBtn.classList.add('error');
          cleanupBtn.textContent = '❌ Error';
          showOutput(`Cleanup error: ${e.message}`, 'error');
          setTimeout(() => { cleanupBtn.className = 'control-btn'; cleanupBtn.textContent = '🧹 Cleanup'; }, 2000);
        }
      };
    }

    const statsBtn = document.getElementById('ctrl-memory-stats-btn');
    if (statsBtn) {
      statsBtn.onclick = async () => {
        try {
          const res = await fetch('/api/memory/stats');
          const data = await res.json();
          if (data.success) {
            const s = data.data;
            showOutput(`Memory Stats:
  Total: ${s.totalItems} items
  Active: ${s.activeCount}
  Dormant: ${s.dormantCount}
  Beliefs: ${s.beliefCount}
  Pinned: ${s.pinnedCount}
  Types: ${JSON.stringify(s.typeDistribution || {})}`, 'info');
          }
        } catch (e) {
          showOutput(`Stats error: ${e.message}`, 'error');
        }
      };
    }

    const healthBtn = document.getElementById('ctrl-health-btn');
    if (healthBtn) {
      healthBtn.onclick = async () => {
        try {
          const res = await fetch('/api/health');
          const data = await res.json();
          if (data.success) {
            showOutput(`Health: ${JSON.stringify(data.data, null, 2)}`, 'info');
          }
        } catch (e) {
          showOutput(`Health error: ${e.message}`, 'error');
        }
      };
    }
  }

  function renderDecisionCard(decision, decisionIndex) {
    const d = decision.decision.payload;
    const warnings = getDecisionWarnings(decision);
    
    let devInfo = '';
    if (viewMode === 'developer') {
      devInfo = `<div class="trace-dev-info">📋 ${escapeHtml(decision.decisionId)}</div>`;
    }
    
    let reasoningHtml = '';
    if (d.reasoningSnippet) {
      reasoningHtml = `<div class="trace-reasoning">${escapeHtml(d.reasoningSnippet.substring(0, 300))}${d.reasoningSnippet.length > 300 ? '…' : ''}</div>`;
    } else {
      reasoningHtml = '<div class="trace-reasoning no-reasoning">No reasoning captured</div>';
    }
    
    let warningsHtml = '';
    if (warnings.length > 0) {
      warningsHtml = '<div class="trace-warnings">' + warnings.map(w => `<span class="warning-badge ${w.level}">${w.icon} ${w.text}</span>`).join('') + '</div>';
    }
    
    let toolsHtml = '';
    if (decision.tools.length > 0) {
      toolsHtml = '<div class="trace-tools"><div class="trace-section-label">Tools</div>';
      for (let i = 0; i < decision.tools.length; i++) {
        const tool = decision.tools[i];
        const tc = tool.toolCalled?.payload;
        const tf = tool.toolFinished?.payload;
        const toolName = tc?.toolName || tf?.toolName || 'unknown';
        const callId = tc?.callId || tf?.callId || '?';
        const status = tf ? (tf.success ? '✓' : '✗') : '⟳';
        
        let toolDevInfo = '';
        if (viewMode === 'developer' && callId !== '?') {
          toolDevInfo = ` <span class="trace-mono">${callId.substring(0, 8)}</span>`;
        }
        
        toolsHtml += `<div class="trace-tool-item" data-trace-tool-idx="${decisionIndex}-${i}"><span class="trace-tool-name">${escapeHtml(toolName)}</span> <span class="trace-tool-status">${status}</span>${toolDevInfo}</div>`;
      }
      toolsHtml += '</div>';
    }
    
    let artifactsHtml = '';
    if (decision.artifacts.length > 0) {
      artifactsHtml = '<div class="trace-artifacts"><div class="trace-section-label">Artifacts</div>';
      for (let i = 0; i < decision.artifacts.length; i++) {
        const artifact = decision.artifacts[i];
        const p = artifact.payload;
        let icon = '●';
        let text = artifact.type;
        
        switch (artifact.type) {
          case 'file_created': icon = '✚'; text = `Created: ${p.path}`; break;
          case 'file_modified': icon = '✎'; text = `Modified: ${p.path}`; break;
          case 'file_deleted': icon = '✖'; text = `Deleted: ${p.path}`; break;
          case 'memory_write': icon = '💾'; text = `Memory: ${p.key || '?'}`; break;
          case 'error': icon = '⚠'; text = `Error: ${p.message}`; break;
        }
        
        artifactsHtml += `<div class="trace-artifact-item" data-trace-artifact-idx="${decisionIndex}-${i}"><span class="trace-artifact-icon">${icon}</span> <span class="trace-artifact-text">${escapeHtml(text)}</span></div>`;
      }
      artifactsHtml += '</div>';
    }
    
    return `
      <div class="trace-decision-card" data-decision-index="${decisionIndex}">
        ${devInfo}
        <div class="trace-decision-title">${escapeHtml(d.decision)}</div>
        <div class="trace-decision-reason">Reason: ${escapeHtml(d.reason || '—')}</div>
        ${reasoningHtml}
        ${warningsHtml}
        ${toolsHtml}
        ${artifactsHtml}
        <div class="trace-timestamp">${formatTime(decision.decision.timestamp)}</div>
      </div>
    `;
  }

  function getDecisionWarnings(decision) {
    const warnings = [];
    
    for (const tool of decision.tools) {
      if (tool.toolCalled && !tool.toolFinished) {
        warnings.push({ level: 'warn', icon: '🟡', text: 'Missing tool result' });
        break;
      }
    }
    
    for (const tool of decision.tools) {
      if (tool.toolFinished && !tool.toolCalled) {
        warnings.push({ level: 'error', icon: '🔴', text: 'Orphan event' });
        break;
      }
    }
    
    const d = decision.decision.payload;
    if (!d.reasoningSnippet) {
      warnings.push({ level: 'info', icon: '🟠', text: 'No reasoning' });
    }
    
    return warnings;
  }

  function onTraceDecisionClick(e, decisions) {
    const item = e.target.closest('[data-decision-index]');
    if (!item) return;
    const idx = parseInt(item.dataset.decisionIndex, 10);
    const decision = decisions[idx];
    if (!decision) return;
    selectEntity({ kind: 'trace-decision', decision }, item);
  }

  function onTraceToolClick(e, decisions) {
    const item = e.target.closest('[data-trace-tool-idx]');
    if (!item) return;
    const [decIdx, toolIdx] = item.dataset.traceToolIdx.split('-').map(Number);
    const decision = decisions[decIdx];
    if (!decision || !decision.tools[toolIdx]) return;
    const tool = decision.tools[toolIdx];
    selectEntity({ kind: 'trace-tool', tool, decisionId: decision.decisionId }, item);
  }

  function onTraceArtifactClick(e, decisions) {
    const item = e.target.closest('[data-trace-artifact-idx]');
    if (!item) return;
    const [decIdx, artIdx] = item.dataset.traceArtifactIdx.split('-').map(Number);
    const decision = decisions[decIdx];
    if (!decision || !decision.artifacts[artIdx]) return;
    const artifact = decision.artifacts[artIdx];
    selectEntity({ kind: 'trace-artifact', artifact, decisionId: decision.decisionId }, item);
  }

  function renderFocus() {
    const taskId = agentState.currentTaskId || lastCompletedTaskId;
    
    // Update status badge (always, regardless of taskId)
    const statusEl = document.getElementById('focus-status');
    if (statusEl) {
      const badge = STATUS_BADGES[agentState.status] || STATUS_BADGES.idle;
      statusEl.textContent = badge.label;
      statusEl.className = `focus-status ${badge.class}`;
    }
    
    if (!taskId) {
      document.getElementById('focus-thought').textContent = 'Awaiting reasoning...';
      document.getElementById('focus-prediction-action').textContent = 'Evaluating next action...';
      document.getElementById('focus-prediction-confidence').textContent = 'Confidence: —';
      document.getElementById('focus-tool-display').textContent = 'No tool running';
      document.getElementById('focus-context-goal').textContent = '—';
      document.getElementById('focus-context-status').textContent = '—';
      return;
    }

    // PRIMARY: Current Thought (reasoning-first, no truncation)
    // Priority 1: Use streaming text if available, otherwise use latest decision
    const thoughtEl = document.getElementById('focus-thought');
    
    if (agentState.streamingText) {
      // Streaming in progress or just received — text already being rendered by startStreamingReasoning()
      // Don't override it here
    } else {
      // Fallback: use latest decision reasoning
      const latestDecision = agentState.recentDecisions[0];
      
      if (latestDecision) {
        const reasoning = latestDecision.reasoningSnippet || latestDecision.reason || 'Agent is thinking...';
        thoughtEl.textContent = reasoning;
        thoughtEl.classList.add('updated');
        setTimeout(() => thoughtEl.classList.remove('updated'), 400);
      } else {
        thoughtEl.textContent = 'Awaiting reasoning...';
      }
    }

    // PREDICTION: Next Action + Confidence (only real event data, no heuristics)
    const latestDecision = agentState.recentDecisions[0];
    
    if (latestDecision) {
      const nextAction = latestDecision.decision || 'Evaluating next action...';
      document.getElementById('focus-prediction-action').textContent = `Next: ${nextAction}`;
    } else {
      document.getElementById('focus-prediction-action').textContent = 'Evaluating next action...';
    }

    // SECONDARY: Active Tool (Priority 3: with live duration timer)
    if (agentState.activeTools.length > 0) {
      const tool = agentState.activeTools[0];
      // Tool display updated live by updateToolDuration() every 100ms
      // Just ensure it's visible
      if (!document.getElementById('focus-tool-display').textContent.includes('🔧')) {
        updateToolDuration();
      }
    } else {
      document.getElementById('focus-tool-display').textContent = 'No tool running';
    }

    // TERTIARY: Context (Goal + Status)
    const goal = agentState.currentGoal || agentState.currentTaskLabel || '—';
    document.getElementById('focus-context-goal').textContent = goal;
    
    let status = '—';
    if (agentState.status === 'idle') {
      status = '✓ COMPLETED';
    } else if (agentState.status === 'working') {
      status = '⚡ RUNNING';
    } else if (agentState.status === 'error') {
      status = '✗ FAILED';
    }
    document.getElementById('focus-context-status').textContent = status;
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
