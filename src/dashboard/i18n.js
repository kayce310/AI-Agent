/**
 * @file i18n.js — Language system for Coral Dashboard
 * @description Simple i18n with VN/US support, localStorage persistence
 */

const I18N = {
  // Language data
  translations: {
    vi: {
      // Header
      'dashboard.title': 'Coral Agent — Trung tâm Điều khiển',
      'tab.mission': '🎯 NHIỆM VỤ',
      'tab.trace': '🧠 DẤU VẾT',
      'tab.focus': '⚡ TẬP TRUNG',
      'tab.memory': '💾 TRÍ NHỚ',
      'tab.graph': '🔗 ĐỒ THỊ',
      'tab.hologram': '🧠 NÃO',
      
      // Mission tab
      'mission.current': 'NHIỆM VỤ HIỆN TẠI',
      'mission.status': 'TRẠNG THÁI',
      'mission.tools': 'CÔNG CỤ ĐANG CHẠY',
      'mission.decision': 'QUYẾT ĐỊNH HIỆN TẠI',
      'mission.action': 'HÀNH ĐỘNG TIẾP THEO',
      'mission.awaiting': 'Chờ task...',
      'mission.idle': 'ĐANG CHỜ',
      'mission.working': 'ĐANG LÀM VIỆC',
      'mission.notools': 'Không có tool',
      'mission.nodecision': 'Chưa có quyết định',
      'mission.noevents': 'Chưa có sự kiện',
      'mission.nofiles': 'Chưa có file thay đổi',
      'mission.nodecisions': 'Chưa có quyết định',
      'mission.filechanges': 'THAY ĐỔI FILE',
      'mission.telemetry': 'GỠ LỖI TELEMETRY',
      
      // Trace tab
      'trace.timeline': 'DÒNG THỜI GIAN',
      'trace.filter': 'Lọc',
      'trace.all': 'Tất cả',
      'trace.task': 'Task',
      'trace.tool': 'Tool',
      'trace.decision': 'Quyết định',
      'trace.file': 'File',
      'trace.user': '👤 Người dùng',
      'trace.notask': 'Không có task',
      'trace.click': 'Click task để xem chi tiết',
      'trace.context': 'NGỮ CẢNH TRACE',
      'trace.mcp': 'MCP TRACE',
      'trace.cost': 'THEO DÕI CHI PHÍ',
      'trace.alltools': 'Tất cả Tools',
      'trace.select': 'Chọn task để xem trace',
      'trace.notools': 'Chưa có dữ liệu tool trace',
      'trace.notimeline': 'Chạy task agent để xem timeline tool call',
      
      // Focus tab
      'focus.thought': 'TÍNH TOÁN',
      'focus.next': 'HÀNH ĐỘNG TIẾP',
      'focus.tool': 'CÔNG CỤ',
      'focus.context': 'NGỮ CẢNH',
      'focus.goal': 'Mục tiêu:',
      'focus.status': 'Trạng thái:',
      'focus.awaiting': 'Chờ reasoning...',
      'focus.notool': 'Không có tool',
      'focus.completed': '✓ HOÀN THÀNH',
      'focus.running': '⚡ ĐANG CHẠY',
      'focus.failed': '✗ THẤT BẠI',
      'focus.nextaction': 'Hành động tiếp',
      'focus.activetool': 'Công cụ',
      'focus.missioncontext': 'Ngữ cảnh nhiệm vụ',
      
      // Memory tab
      'memory.search': 'Tìm kiếm trí nhớ...',
      'memory.filter': 'Lọc',
      'memory.all': 'Tất cả',
      'memory.fact': 'Sự kiện',
      'memory.belief': 'Niềm tin',
      'memory.preference': 'Sở thích',
      'memory.skill': 'Kỹ năng',
      'memory.summary': 'Tóm tắt',
      'memory.confidence': 'Độ tin cậy',
      'memory.importance': 'Tầm quan trọng',
      'memory.sort': 'Sắp xếp',
      'memory.score': 'Điểm',
      'memory.count': 'trí nhớ',
      'memory.pin': '📌',
      'memory.forget': '🗑️',
      'memory.link': '🔗',
      'memory.none': 'Chưa có trí nhớ. Chạy task!',
      'memory.select': 'Chọn memory để xem',
      'memory.graph': 'Đồ thị trí nhớ',
      
      // Graph tab
      'graph.title': 'ĐỒ THỊ NHẬN THỨC',
      'graph.select': 'Chọn task',
      'graph.notask': 'Không có task',
      'graph.legend': 'Chú thích',
      'graph.decision': 'Quyết định',
      'graph.tool': 'Tool',
      'graph.artifact': 'Artifact',
      'graph.caused': 'Gây ra',
      'graph.produced': 'Sản phẩm',
      
      // Hologram tab
      'hologram.title': 'NÃO NHÂN TẠO',
      'hologram.events': 'Sự kiện',
      'hologram.tools': 'Tool',
      'hologram.decisions': 'Quyết định',
      'hologram.memories': 'Trí nhớ',
      'hologram.errors': 'Lỗi',
      'hologram.status': 'Trạng thái',
      'hologram.activity': 'Hoạt động',
      'hologram.connected': 'ĐÃ KẾT NỐI',
      'hologram.idle': 'CHỜ ĐỢI',
      'hologram.working': 'ĐANG LÀM',
      'hologram.log': 'NHẬT KÝ THẦN KINH',
      'hologram.noactivity': 'Đang chờ hoạt động thần kinh...',
      
      // Control panel
      'control.title': 'ĐIỀU KHIỂN HỆ THỐNG',
      'control.flush': '💾 LƯU TRÍ NHỚ',
      'control.cleanup': '🧹 DỌN DẸP',
      'control.restart': '🔄 KHỞI ĐỘNG LẠI',
      'control.stop': '⏹️ DỪNG',
      'control.logs': '📋 NHẬT KÝ',
      
      // Inspector
      'inspector.title': 'Thanh tra',
    },
    en: {
      // Header
      'dashboard.title': 'Coral Agent — Mission Control',
      'tab.mission': '🎯 MISSION',
      'tab.trace': '🧠 TRACE',
      'tab.focus': '⚡ FOCUS',
      'tab.memory': '💾 MEMORY',
      'tab.graph': '🔗 GRAPH',
      'tab.hologram': '🧠 HOLOGRAM',
      
      // Mission tab
      'mission.current': 'CURRENT MISSION',
      'mission.status': 'STATUS',
      'mission.tools': 'ACTIVE TOOLS',
      'mission.decision': 'CURRENT DECISION',
      'mission.action': 'NEXT ACTION',
      'mission.awaiting': 'Awaiting task',
      'mission.idle': 'IDLE',
      'mission.working': 'WORKING',
      'mission.notools': 'No active tools',
      'mission.nodecision': 'No decision yet',
      'mission.noevents': 'No events yet',
      'mission.nofiles': 'No file changes',
      'mission.nodecisions': 'No decisions yet',
      'mission.filechanges': 'FILE CHANGES',
      'mission.telemetry': 'TELEMETRY DEBUG',
      
      // Trace tab
      'trace.timeline': 'TIMELINE',
      'trace.filter': 'Filter',
      'trace.all': 'All',
      'trace.task': 'Task',
      'trace.tool': 'Tool',
      'trace.decision': 'Decision',
      'trace.file': 'File',
      'trace.user': '👤 User',
      'trace.notask': 'No task',
      'trace.click': 'Click task to view trace',
      'trace.context': 'TRACE CONTEXT',
      'trace.mcp': 'MCP TRACE',
      'trace.cost': 'COST TRACKING',
      'trace.alltools': 'All Tools',
      'trace.select': 'Select a task to view cognitive trace',
      'trace.notools': 'No tool trace data yet',
      'trace.notimeline': 'Run an agent task to see tool call timeline',
      
      // Focus tab
      'focus.thought': 'THOUGHT',
      'focus.next': 'NEXT ACTION',
      'focus.tool': 'ACTIVE TOOL',
      'focus.context': 'CONTEXT',
      'focus.goal': 'Goal:',
      'focus.status': 'Status:',
      'focus.awaiting': 'Awaiting reasoning...',
      'focus.notool': 'No tool running',
      'focus.completed': '✓ COMPLETED',
      'focus.running': '⚡ RUNNING',
      'focus.failed': '✗ FAILED',
      'focus.nextaction': 'Next Action',
      'focus.activetool': 'Active Tool',
      'focus.missioncontext': 'Mission Context',
      
      // Memory tab
      'memory.search': 'Search memories...',
      'memory.filter': 'Filter',
      'memory.all': 'All',
      'memory.fact': 'Fact',
      'memory.belief': 'Belief',
      'memory.preference': 'Preference',
      'memory.skill': 'Skill',
      'memory.summary': 'Summary',
      'memory.confidence': 'Confidence',
      'memory.importance': 'Importance',
      'memory.sort': 'Sort',
      'memory.score': 'Score',
      'memory.count': 'memories',
      'memory.pin': '📌',
      'memory.forget': '🗑️',
      'memory.link': '🔗',
      'memory.none': 'No memories yet. Run some tasks!',
      'memory.select': 'Select a memory to inspect',
      'memory.graph': 'Memory Graph',
      
      // Graph tab
      'graph.title': 'COGNITIVE GRAPH',
      'graph.select': '-- Select Task --',
      'graph.notask': 'No task selected',
      'graph.legend': 'Legend',
      'graph.decision': 'Decision',
      'graph.tool': 'Tool',
      'graph.artifact': 'Artifact',
      'graph.caused': 'Caused',
      'graph.produced': 'Produced',
      
      // Hologram tab
      'hologram.title': '🧠 NEURAL CORTEX',
      'hologram.events': 'Events',
      'hologram.tools': 'Tools',
      'hologram.decisions': 'Decisions',
      'hologram.memories': 'Memories',
      'hologram.errors': 'Errors',
      'hologram.status': 'Status',
      'hologram.activity': 'ACTIVITY',
      'hologram.connected': 'CONNECTED',
      'hologram.idle': 'IDLE',
      'hologram.working': 'WORKING',
      'hologram.log': 'NEURAL ACTIVITY LOG',
      'hologram.noactivity': 'Awaiting neural activity...',
      
      // Control panel
      'control.title': '⚙️ SYSTEM CONTROL',
      'control.flush': '💾 FLUSH MEMORY',
      'control.cleanup': '🧹 CLEANUP',
      'control.restart': '🔄 RESTART',
      'control.stop': '⏹️ STOP',
      'control.logs': '📋 LOGS',
      
      // Inspector
      'inspector.title': 'Inspector',
    }
  },

  // Current language
  currentLang: localStorage.getItem('dashboardLang') || 'en',

  /**
   * Get translated string
   */
  t(key) {
    return this.translations[this.currentLang][key] || this.translations.en[key] || key;
  },

  /**
   * Set language
   */
  setLang(lang) {
    if (!this.translations[lang]) return;
    this.currentLang = lang;
    localStorage.setItem('dashboardLang', lang);
    this.applyTranslations();
  },

  /**
   * Apply translations to DOM
   */
  applyTranslations() {
    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = this.t(key);
    });

    // Update all elements with data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      el.placeholder = this.t(key);
    });

    // Update title
    document.title = this.t('dashboard.title');
  },

  /**
   * Initialize i18n system
   */
  init() {
    // Create language toggle button
    const header = document.querySelector('header') || document.getElementById('status-bar');
    if (header) {
      const statusRight = header.querySelector('.status-right');
      if (statusRight) {
        const langToggle = document.getElementById('lang-toggle');
        if (!langToggle) {
          const btn = document.createElement('button');
          btn.id = 'lang-toggle';
          btn.className = 'lang-toggle';
          btn.textContent = this.currentLang === 'vi' ? '🇺🇸 EN' : '🇻🇳 VN';
          btn.title = 'Switch language / Chuyển ngôn ngữ';
          btn.addEventListener('click', () => {
            const newLang = this.currentLang === 'vi' ? 'en' : 'vi';
            this.setLang(newLang);
            btn.textContent = newLang === 'vi' ? '🇺🇸 EN' : '🇻🇳 VN';
          });
          const themeToggle = document.getElementById('theme-toggle');
          if (themeToggle) {
            statusRight.insertBefore(btn, themeToggle);
          } else {
            statusRight.appendChild(btn);
          }
        }
      }
    }

    // Remove old event-count if present (conflicts with new layout)
    const eventCount = document.getElementById('event-count');
    if (eventCount && eventCount.parentElement) {
      // Keep it, don't remove
    }

    // Apply initial translations
    this.applyTranslations();
  }
};

// Auto-init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18N.init());
} else {
  I18N.init();
}
