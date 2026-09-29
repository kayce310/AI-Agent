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
            'tab.verification': '🛡️ XÁC THỰC',
            'tab.recovery': '🔄 KHÔI PHỤC',
            'tab.provider': '🔌 NHÀ CUNG CẤP',
            'tab.runtime': '📊 THỜI GIAN THỰC',
            'tab.delegation': '🤖 UY QUYỀN',
            'tab.memory': '💾 TRÍ NHỚ',
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

            // Verification tab
            'verification.title': 'CỬA XÁC THỰC',
            'verification.refresh': 'Làm mới',
            'verification.no_plan': 'Không có kế hoạch hoạt động',
            'verification.no_data': 'Không có dữ liệu xác thực',
            'verification.evidence_title': 'NHẬT KÝ BẰNG CHỨNG',
            'verification.no_evidence': 'Không có bản ghi bằng chứng',
            'verification.item_status': 'Trạng thái mục',
            'verification.can_complete': 'Có thể hoàn thành',
            'verification.completion_reason': 'Lý do hoàn thành',
            'verification.evaluation': 'Đánh giá',
            'verification.eligible': 'Đủ điều kiện',
            'verification.can_auto_complete': 'Tự động hoàn thành',
            'verification.has_semantic': 'Có tiêu chí ngữ nghĩa',
            'verification.blocked_required': 'Bị chặn bởi bắt buộc',
            'verification.criteria': 'Tiêu chí',
            'verification.on_demand': 'Theo yêu cầu',

            // Recovery tab
            'recovery.title': 'KHÔI PHỤC QUAN SÁT',
            'recovery.refresh': 'Làm mới',
            'recovery.checkpoints': 'CHECKPOINT ĐANG TIẾN HÀNH',
            'recovery.no_checkpoints': 'Không có checkpoint đang tiến hành',
            'recovery.session_state': 'TRẠNG THÁI KHÔI PHỤC SESSION',
            'recovery.no_session': 'Không có session hoạt động',
            'recovery.restart': 'KHỞI ĐỘNG LẠI / REHYDRATION',
            'recovery.no_restart': 'Không có dữ liệu khởi động lại',

            // Provider tab
            'provider.title': 'NHÀ CUNG CẤP / CƠ SỞ HẠ TẦNG',
            'provider.refresh': 'Làm mới',
            'provider.activity': 'HOẠT ĐỘNG MODEL / NHÀ CUNG CẤP',
            'provider.no_activity': 'Chưa có hoạt động nhà cung cấp',
            'provider.latency': 'ĐỘ TRỄ & THỬ LẠI / FALLBACK',
            'provider.no_latency': 'Chưa có dữ liệu độ trễ',
            'provider.circuit': 'TRẠNG THÁI CIRCUIT',
            'provider.no_circuit': 'Trạng thái circuit breaker không khả dụng',
            'provider.summary': 'THỐNG KÊ TỔNG HỢP',
            'provider.no_summary': 'Không có dữ liệu tóm tắt',

            // Runtime tab
            'runtime.title': 'THỜI GIAN THỰC QUAN SÁT',
            'runtime.refresh': 'Làm mới',
            'runtime.uptime': 'THỜI GIAN HOẠT ĐỘNG',
            'runtime.no_uptime': 'Thời gian hoạt động không khả dụng',
            'runtime.executions': 'THỰC THI ĐANG HOẠT ĐỘNG',
            'runtime.no_executions': 'Không có thực thi hoạt động',
            'runtime.heartbeat': 'NHỊP ĐẤU / VÒNG ĐỜI',
            'runtime.no_heartbeat': 'Không có dữ liệu nhịp đập',
            'runtime.alerts': 'CẢNH BÁO THỜI GIAN THỰC',
            'runtime.no_alerts': 'Không có cảnh báo thời gian thực',
            'runtime.event_bus': 'THỐNG KÊ EVENT BUS',
            'runtime.no_eventbus': 'Thống kê event bus không khả dụng',

            // Delegation tab
            'delegation.title': 'TELEMETRY UY QUYỀN',
            'delegation.refresh': 'Làm mới',
            'delegation.sessions': 'PHIÊN UY QUYỀN',
            'delegation.no_sessions': 'Không có phiên uy quyền',
            'delegation.tool_activity': 'HOẠT ĐỘNG CÔNG CỤ / GÁN NHIỆM VỤ',
            'delegation.no_tools': 'Không có hoạt động công cụ uy quyền',

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
          'tab.verification': '🛡️ VERIFICATION',
          'tab.recovery': '🔄 RECOVERY',
          'tab.provider': '🔌 PROVIDER',
          'tab.runtime': '📊 RUNTIME',
          'tab.delegation': '🤖 DELEGATION',
          'tab.memory': '💾 MEMORY',
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

            // Verification tab
            'verification.title': 'VERIFICATION GATE',
            'verification.refresh': 'Refresh',
            'verification.no_plan': 'No active plan',
            'verification.no_data': 'No verification data available',
            'verification.evidence_title': 'EVIDENCE LOG',
            'verification.no_evidence': 'No evidence records',
            'verification.item_status': 'Item Status',
            'verification.can_complete': 'Can Complete',
            'verification.completion_reason': 'Completion Reason',
            'verification.evaluation': 'Evaluation',
            'verification.eligible': 'Eligible',
            'verification.can_auto_complete': 'Can Auto Complete',
            'verification.has_semantic': 'Has Semantic Criteria',
            'verification.blocked_required': 'Blocked by Required',
            'verification.criteria': 'Criteria',
            'verification.on_demand': 'On Demand',

            // Recovery tab
            'recovery.title': 'RECOVERY OBSERVABILITY',
            'recovery.refresh': 'Refresh',
            'recovery.checkpoints': 'IN-PROGRESS CHECKPOINTS',
            'recovery.no_checkpoints': 'No in-progress checkpoints',
            'recovery.session_state': 'SESSION RECOVERY STATE',
            'recovery.no_session': 'No active session',
            'recovery.restart': 'RESTART / REHYDRATION VISIBILITY',
            'recovery.no_restart': 'No restart data available',

            // Provider tab
            'provider.title': 'PROVIDER / INFRASTRUCTURE',
            'provider.refresh': 'Refresh',
            'provider.activity': 'MODEL / PROVIDER ACTIVITY',
            'provider.no_activity': 'No provider activity yet',
            'provider.latency': 'LATENCY & RETRY / FALLBACK',
            'provider.no_latency': 'No latency data yet',
            'provider.circuit': 'CIRCUIT STATE',
            'provider.no_circuit': 'Circuit breaker status unavailable',
            'provider.summary': 'SUMMARY STATISTICS',
            'provider.no_summary': 'No summary data',

            // Runtime tab
            'runtime.title': 'RUNTIME OBSERVABILITY',
            'runtime.refresh': 'Refresh',
            'runtime.uptime': 'UPTIME',
            'runtime.no_uptime': 'Uptime unavailable',
            'runtime.executions': 'ACTIVE EXECUTIONS',
            'runtime.no_executions': 'No active executions',
            'runtime.heartbeat': 'HEARTBEAT / LIFECYCLE',
            'runtime.no_heartbeat': 'No heartbeat data',
            'runtime.alerts': 'RUNTIME ALERTS',
            'runtime.no_alerts': 'No runtime alerts',
            'runtime.event_bus': 'EVENT BUS STATISTICS',
            'runtime.no_eventbus': 'Event bus stats unavailable',

            // Delegation tab
            'delegation.title': 'DELEGATION TELEMETRY',
            'delegation.refresh': 'Refresh',
            'delegation.sessions': 'DELEGATION SESSIONS',
            'delegation.no_sessions': 'No delegation sessions',
            'delegation.tool_activity': 'TOOL ACTIVITY / ATTRIBUTION',
            'delegation.no_tools': 'No delegation tool activity',

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
