/**
 * @file memory-tab.js — MEMORY Tab Controller
 * @created 2026-06-21
 * 
 * 3-panel layout:
 *   ┌──────────────────────────────────────────┐
 *   │ SEARCH BAR + FILTER CHIPS                │
 *   ├───────────────────┬──────────────────────┤
 *   │ MEMORY LIST       │ MEMORY DETAIL        │
 *   │ (left)            │ (right)              │
 *   │ cards grouped     │ content + meta       │
 *   │ by type           │ operations           │
 *   ├───────────────────┴──────────────────────┤
 *   │ MINI GRAPH (memory graph links)          │
 *   └──────────────────────────────────────────┘
 */

// ═══ STATE ═══
const memoryState = {
  memories: [],
  total: 0,
  selectedId: null,
  filters: {
    type: 'all',
    text: '',
    minConfidence: 0,
    minImportance: 0,
    sortBy: 'score',
    archived: false,
  },
};

// ═══ MEMORY TYPE CONFIG ═══
const MEMORY_CONFIG = {
  fact:      { color: '#58a6ff', icon: '📄', label: 'Fact' },
  belief:    { color: '#d29922', icon: '💡', label: 'Belief' },
  preference:{ color: '#3fb950', icon: '⭐', label: 'Preference' },
  skill:     { color: '#bc8cff', icon: '🔧', label: 'Skill' },
  summary:   { color: '#f0883e', icon: '📝', label: 'Summary' },
};

const STATUS_CONFIG = {
  active:     { label: 'Active',     class: 'memory-state-active' },
  dormant:    { label: 'Dormant',    class: 'memory-state-dormant' },
  reinforced: { label: 'Reinforced', class: 'memory-state-reinforced' },
  decaying:   { label: 'Decaying',   class: 'memory-state-decaying' },
};

// ═══ DOM REFS ═══
const $ = (id) => document.getElementById(id);

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded', () => {
  setupMemoryListeners();
});

// Listen for tab activation from app.js
let memoryLoaded = false;
document.addEventListener('memory-tab-activated', () => {
  if (!memoryLoaded || memoryState.memories.length === 0) {
    loadMemories();
    loadMemoryStats();
    memoryLoaded = true;
  }
  // If already loaded, keep existing data — don't re-fetch and reset
});

// Listen for memory refresh from renderAllFromState (throttled — max once per 3s)
let memoryRefreshTimer = null;
document.addEventListener('memory-refresh', () => {
  if (memoryRefreshTimer) return; // Already scheduled
  memoryRefreshTimer = setTimeout(() => {
    memoryRefreshTimer = null;
    loadMemories();
    loadMemoryStats();
  }, 3000);
});

// ═══ SETUP ═══
function setupMemoryListeners() {
  // Search input (debounced)
  const searchInput = $('memory-search-input');
  let searchTimer;
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      memoryState.filters.text = searchInput.value;
      loadMemories();
    }, 300);
  });

  // Type chips
  document.querySelectorAll('.memory-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.memory-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      memoryState.filters.type = chip.dataset.filter;
      loadMemories();
    });
  });

  // Advanced filter toggle
  $('memory-filter-toggle')?.addEventListener('click', () => {
    const adv = $('memory-advanced-filters');
    adv?.classList.toggle('hidden');
  });

  // Confidence slider
  $('memory-filter-conf-min')?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    $('memory-filter-conf-label').textContent = `${val} - 1.0`;
    memoryState.filters.minConfidence = val;
  });

  // Importance slider
  $('memory-filter-imp-min')?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    $('memory-filter-imp-label').textContent = `${val} - 1.0`;
    memoryState.filters.minImportance = val;
  });

  // Sort dropdown
  $('memory-filter-sort')?.addEventListener('change', (e) => {
    memoryState.filters.sortBy = e.target.value;
  });

  // Apply button
  $('memory-filter-apply')?.addEventListener('click', () => {
    loadMemories();
  });

  // Keyboard: close detail with Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && memoryState.selectedId) {
      deselectMemory();
    }
  });
}

// ═══ API ═══
async function fetchMemoryList(params = {}) {
  const query = new URLSearchParams();
  if (params.text) query.set('text', params.text);
  if (params.types) query.set('types', params.types);
  if (params.minConfidence > 0) query.set('minConfidence', params.minConfidence);
  if (params.minImportance > 0) query.set('minImportance', params.minImportance);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.limit) query.set('limit', params.limit);
  if (params.archived) query.set('archived', 'true');
  
  const url = `/api/memory/list${query.toString() ? '?' + query.toString() : ''}`;
  const res = await fetch(url);
  return res.json();
}

async function fetchMemoryDetail(id) {
  const res = await fetch(`/api/memory/${encodeURIComponent(id)}`);
  return res.json();
}

async function fetchMemoryStats() {
  const res = await fetch('/api/memory/stats');
  return res.json();
}

async function fetchMemoryGraph() {
  const res = await fetch('/api/memory/graph');
  return res.json();
}

async function postAction(id, action, body = null) {
  const res = await fetch(`/api/memory/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function updateMemory(id, data) {
  const res = await fetch(`/api/memory/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ═══ LOAD ═══
async function loadMemories() {
  try {
    const params = {
      text: memoryState.filters.text,
      minConfidence: memoryState.filters.minConfidence,
      minImportance: memoryState.filters.minImportance,
      sortBy: memoryState.filters.sortBy,
      limit: 200,
      archived: memoryState.filters.archived,
    };
    
    if (memoryState.filters.type !== 'all') {
      params.types = memoryState.filters.type;
    }
    
    const result = await fetchMemoryList(params);
    if (result.success) {
      memoryState.memories = result.data.items;
      memoryState.total = result.data.total;
      renderMemoryList();
      updateMemoryCount();
    }
  } catch (err) {
    console.error('[MemoryTab] Failed to load memories:', err);
    const list = $('memory-list');
    if (list) list.innerHTML = `<div class="empty-state error">Failed to load memories: ${escapeHtml(err.message)}</div>`;
  }
}

async function loadMemoryStats() {
  try {
    const result = await fetchMemoryStats();
    if (result.success) {
      const count = result.data;
      const el = $('memory-count');
      if (el) el.textContent = `${count.active} active, ${count.archived} archived`;
    }
  } catch (err) {
    console.error('[MemoryTab] Failed to load stats:', err);
  }
}

// ═══ RENDER: LIST ═══
function renderMemoryList() {
  const list = $('memory-list');
  if (!list) return;

  if (memoryState.memories.length === 0) {
    list.innerHTML = '<div class="empty-state">No memories found</div>';
    return;
  }

  let html = '';
  for (const mem of memoryState.memories) {
    const config = MEMORY_CONFIG[mem.type] || MEMORY_CONFIG.fact;
    const status = STATUS_CONFIG[mem.status] || STATUS_CONFIG.dormant;
    const score = (mem.confidence * mem.importance * 100).toFixed(0);
    const isSelected = mem.id === memoryState.selectedId;

    // Visual encoding: brightness = confidence, opacity = 1-decay
    const brightness = Math.max(25, Math.round(mem.confidence * 100));
    const opacity = Math.max(0.2, Math.min(1, mem.confidence));

    html += `
      <div class="memory-card ${isSelected ? 'selected' : ''}" 
           data-id="${escapeHtml(mem.id)}"
           style="--mem-brightness: ${brightness}%; --mem-opacity: ${opacity};">
        <div class="memory-card-header">
          <span class="memory-type-badge" style="--type-color: ${config.color}">${config.icon} ${config.label}</span>
          <span class="memory-status-dot ${status.class}" title="${status.label}">●</span>
        </div>
        <div class="memory-card-content">${escapeHtml(mem.content.substring(0, 120))}${mem.content.length > 120 ? '…' : ''}</div>
        <div class="memory-card-meta">
          <span class="memory-score" title="Score: ${score}%">🎯 ${score}%</span>
          <span class="memory-conf" title="Confidence: ${(mem.confidence * 100).toFixed(0)}%">📊 ${(mem.confidence * 100).toFixed(0)}%</span>
          <span class="memory-reinforce" title="Reinforced ${mem.reinforcementCount}x">🔄 ${mem.reinforcementCount}</span>
          <span class="memory-time" title="${new Date(mem.createdAt).toLocaleString()}">${formatAgo(mem.createdAt)}</span>
        </div>
      </div>
    `;
  }

  list.innerHTML = html;

  // Click handler with delegation
  list.addEventListener('click', (e) => {
    const card = e.target.closest('.memory-card');
    if (card) {
      const id = card.dataset.id;
      selectMemory(id);
    }
  });
}

// ═══ RENDER: DETAIL ═══
async function selectMemory(id) {
  memoryState.selectedId = id;
  
  // Update list selection
  document.querySelectorAll('.memory-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`.memory-card[data-id="${id}"]`);
  if (card) card.classList.add('selected');

  // Fetch full detail
  try {
    const result = await fetchMemoryDetail(id);
    if (result.success) {
      renderMemoryDetail(result.data.memory, result.data.linked || []);
      renderMiniGraph(result.data.memory, result.data.linked || []);
    }
  } catch (err) {
    console.error('[MemoryTab] Failed to load detail:', err);
  }
}

function deselectMemory() {
  memoryState.selectedId = null;
  document.querySelectorAll('.memory-card').forEach(c => c.classList.remove('selected'));
  
  const detail = $('memory-detail');
  if (detail) {
    detail.innerHTML = `
      <div class="memory-detail-empty">
        <div class="memory-detail-empty-icon">🧠</div>
        <div class="memory-detail-empty-text">Select a memory to inspect</div>
      </div>
    `;
  }
}

function renderMemoryDetail(mem, linked) {
  const detail = $('memory-detail');
  if (!detail) return;

  const config = MEMORY_CONFIG[mem.type] || MEMORY_CONFIG.fact;
  const status = STATUS_CONFIG[mem.status] || STATUS_CONFIG.dormant;
  const score = (mem.confidence * mem.importance * 100).toFixed(0);
  const age = formatAgo(mem.createdAt);
  const lastAccess = formatAgo(mem.lastAccessedAt);

  detail.innerHTML = `
    <div class="memory-detail-header">
      <div class="memory-detail-type" style="--type-color: ${config.color}">
        ${config.icon} ${config.label}
      </div>
      <div class="memory-detail-status ${status.class}">${status.label}</div>
    </div>

    <div class="memory-detail-section">
      <div class="memory-detail-content">${escapeHtml(mem.content)}</div>
    </div>

    <div class="memory-detail-section">
      <div class="memory-detail-section-title">Cognitive Metrics</div>
      <div class="memory-metrics">
        <div class="metric-bar">
          <span class="metric-label">Confidence</span>
          <div class="metric-track">
            <div class="metric-fill" style="width: ${(mem.confidence * 100).toFixed(0)}%"></div>
          </div>
          <span class="metric-value">${(mem.confidence * 100).toFixed(0)}%</span>
        </div>
        <div class="metric-bar">
          <span class="metric-label">Importance</span>
          <div class="metric-track">
            <div class="metric-fill importance-fill" style="width: ${(mem.importance * 100).toFixed(0)}%"></div>
          </div>
          <span class="metric-value">${(mem.importance * 100).toFixed(0)}%</span>
        </div>
        <div class="metric-bar">
          <span class="metric-label">Score</span>
          <div class="metric-track">
            <div class="metric-fill score-fill" style="width: ${score}%"></div>
          </div>
          <span class="metric-value">${score}%</span>
        </div>
      </div>
    </div>

    <div class="memory-detail-section">
      <div class="memory-detail-section-title">Lifecycle</div>
      <div class="memory-lifecycle">
        <div class="lifecycle-row"><span class="lifecycle-label">Created</span><span class="lifecycle-value">${age}</span></div>
        <div class="lifecycle-row"><span class="lifecycle-label">Last Accessed</span><span class="lifecycle-value">${lastAccess}</span></div>
        <div class="lifecycle-row"><span class="lifecycle-label">Access Count</span><span class="lifecycle-value">${mem.accessCount}x</span></div>
        <div class="lifecycle-row"><span class="lifecycle-label">Reinforcements</span><span class="lifecycle-value">${mem.reinforcementCount}x</span></div>
        <div class="lifecycle-row"><span class="lifecycle-label">Pinned</span><span class="lifecycle-value">${mem.pinned ? '✅ Yes' : '❌ No'}</span></div>
      </div>
    </div>

    <div class="memory-detail-section">
      <div class="memory-detail-section-title">Provenance</div>
      <div class="memory-provenance">
        <div class="provenance-row"><span class="provenance-label">Task</span><span class="provenance-value">${escapeHtml(mem.source.taskId || '—')}</span></div>
        <div class="provenance-row"><span class="provenance-label">Tool</span><span class="provenance-value">${escapeHtml(mem.source.tool || '—')}</span></div>
        <div class="provenance-row"><span class="provenance-label">Decision</span><span class="provenance-value">${escapeHtml(mem.source.decisionId || '—')}</span></div>
      </div>
    </div>

    <div class="memory-detail-section">
      <div class="memory-detail-section-title">Tags</div>
      <div class="memory-tags">
        ${(mem.tags || []).map(t => `<span class="memory-tag">${escapeHtml(t)}</span>`).join('') || '<span class="memory-tag-none">No tags</span>'}
      </div>
    </div>

    ${linked.length > 0 ? `
    <div class="memory-detail-section">
      <div class="memory-detail-section-title">Linked Memories (${linked.length})</div>
      <div class="memory-linked-list">
        ${linked.map(l => `
          <div class="memory-linked-item" data-id="${escapeHtml(l.id)}">
            <span class="linked-type">${MEMORY_CONFIG[l.type]?.icon || '📄'}</span>
            <span class="linked-content">${escapeHtml(l.content.substring(0, 60))}</span>
          </div>
        `).join('')}
      </div>
    </div>` : ''}

    <div class="memory-detail-actions">
      <button class="mem-action-btn pin-btn" data-action="${mem.pinned ? 'unpin' : 'pin'}">
        ${mem.pinned ? '📌 Unpin' : '📌 Pin'}
      </button>
      <button class="mem-action-btn promote-btn" data-action="promote">
        ⬆️ Promote
      </button>
      <button class="mem-action-btn link-btn" data-action="link">
        🔗 Link
      </button>
      <button class="mem-action-btn forget-btn" data-action="forget">
        🗑️ Forget
      </button>
    </div>

    <div id="memory-action-feedback" class="memory-action-feedback hidden"></div>
  `;

  // Attach action handlers
  detail.querySelectorAll('.mem-action-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await handleMemoryAction(mem.id, btn.dataset.action, mem);
    });
  });

  // Linked items are clickable
  detail.querySelectorAll('.memory-linked-item').forEach(item => {
    item.addEventListener('click', () => {
      const linkedId = item.dataset.id;
      if (linkedId) selectMemory(linkedId);
    });
  });
}

// ═══ ACTIONS ═══
async function handleMemoryAction(id, action, mem) {
  const feedback = $('memory-action-feedback');
  
  try {
    let result;
    switch (action) {
      case 'pin':
        result = await postAction(id, 'pin');
        showFeedback(feedback, result.success ? '📌 Pinned' : `Failed: ${result.error}`, result.success);
        break;
      case 'unpin':
        result = await postAction(id, 'unpin');
        showFeedback(feedback, result.success ? '📌 Unpinned' : `Failed: ${result.error}`, result.success);
        break;
      case 'forget':
        if (confirm('Forget this memory permanently?')) {
          result = await postAction(id, 'forget');
          showFeedback(feedback, result.success ? '🗑️ Forgotten' : `Failed: ${result.error}`, result.success);
          if (result.success) {
            deselectMemory();
            loadMemories();
            return;
          }
        }
        return;
      case 'promote':
        result = await postAction(id, 'promote', { type: nextPromotionType(mem.type) });
        showFeedback(feedback, result.success ? `⬆️ Promoted to ${result.data?.type}` : `Failed: ${result.error}`, result.success);
        break;
      case 'link':
        const targetId = prompt('Enter target memory ID to link:');
        if (targetId) {
          result = await postAction(id, 'link', { targetId });
          showFeedback(feedback, result.success ? '🔗 Linked' : `Failed: ${result.error}`, result.success);
        }
        return;
    }
    
    // Reload if successful
    if (result?.success) {
      setTimeout(() => {
        selectMemory(id);
        loadMemories();
      }, 500);
    }
  } catch (err) {
    showFeedback(feedback, `Error: ${err.message}`, false);
  }
}

function nextPromotionType(currentType) {
  const chain = ['fact', 'belief', 'skill'];
  const idx = chain.indexOf(currentType);
  if (idx >= 0 && idx < chain.length - 1) {
    return chain[idx + 1];
  }
  return 'skill'; // Default promotion target
}

function showFeedback(el, message, success) {
  if (!el) return;
  el.textContent = message;
  el.className = `memory-action-feedback ${success ? 'feedback-success' : 'feedback-error'}`;
  setTimeout(() => el.classList.add('hidden'), 2500);
}

// ═══ RENDER: MINI GRAPH ═══
function renderMiniGraph(center, linked) {
  const svg = $('memory-graph-svg');
  if (!svg) return;
  
  const width = svg.clientWidth || 600;
  const height = 120;
  const cx = width / 2;
  const cy = height / 2;
  
  let html = `
    <defs>
      <marker id="mem-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
        <path d="M0,0 L0,6 L7,3 z" fill="var(--text-dim)" />
      </marker>
    </defs>
  `;
  
  if (!linked || linked.length === 0) {
    html += `<text x="${cx}" y="${cy}" text-anchor="middle" fill="var(--text-dim)" font-size="12">No linked memories</text>`;
    svg.innerHTML = html;
    return;
  }
  
  // Center node
  const radius = 12;
  const linkedCount = Math.min(linked.length, 6);
  const angleStep = (Math.PI * 2) / linkedCount;
  
  // Draw edges (center → linked)
  for (let i = 0; i < linkedCount; i++) {
    const angle = angleStep * i - Math.PI / 2;
    const lx = cx + Math.cos(angle) * 80;
    const ly = cy + Math.sin(angle) * 45;
    html += `<line x1="${cx}" y1="${cy}" x2="${lx}" y2="${ly}" stroke="var(--text-dim)" stroke-width="1" marker-end="url(#mem-arrow)" />`;
  }
  
  // Draw center node (glowing)
  const centerColor = MEMORY_CONFIG[center.type]?.color || '#58a6ff';
  html += `<circle cx="${cx}" cy="${cy}" r="${radius + 2}" fill="${centerColor}" opacity="0.2" />`;
  html += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${centerColor}" />`;
  html += `<text x="${cx}" y="${cy}" text-anchor="middle" dy=".3em" fill="#fff" font-size="10" font-weight="bold">${center.type[0].toUpperCase()}</text>`;
  
  // Draw linked nodes
  for (let i = 0; i < linkedCount; i++) {
    const angle = angleStep * i - Math.PI / 2;
    const lx = cx + Math.cos(angle) * 80;
    const ly = cy + Math.sin(angle) * 45;
    const l = linked[i];
    const lColor = MEMORY_CONFIG[l.type]?.color || '#58a6ff';
    
    html += `<circle cx="${lx}" cy="${ly}" r="${radius - 2}" fill="${lColor}" opacity="${l.confidence}" />`;
    html += `<text x="${lx}" y="${ly + 16}" text-anchor="middle" fill="var(--text-dim)" font-size="9">${l.content.substring(0, 10)}…</text>`;
  }
  
  svg.innerHTML = html;
  
  const countEl = $('memory-graph-count');
  if (countEl) countEl.textContent = `${linked.length} linked`;
}

// ═══ HELPERS ═══
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function updateMemoryCount() {
  const el = $('memory-count');
  if (el) el.textContent = `${memoryState.memories.length} / ${memoryState.total} memories`;
}
