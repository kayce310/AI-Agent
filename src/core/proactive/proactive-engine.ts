/**
 * Proactive Engine — Context-aware, event-driven proactive features
 * 
 * Inspired by JARVIS: Coral can anticipate user needs based on:
 * - Time of day
 * - User location (future: camera integration)
 * - Recent conversations
 * - Keyword detection in messages
 * - External events (weather, calendar)
 * 
 * Architecture:
 *   ContextSignal (location, time, keywords, events)
 *     │
 *     ▼
 *   ProactiveEngine.evaluate(signals)
 *     │
 *     ▼
 *   ProactiveAction (suggest, remind, search, notify)
 *     │
 *     ▼
 *   MessageHandler.sendProactive(action)
 */

import { Logger } from '../logger.js';
import { EventBus } from '../events/bus.js';

const log = new Logger({ module: 'ProactiveEngine' });

// ── Types ──

export interface ContextSignal {
  type: 'time' | 'location' | 'keyword' | 'conversation' | 'external' | 'sentiment';
  data: Record<string, unknown>;
  confidence: number; // 0-1
  timestamp: number;
}

export interface ProactiveAction {
  type: 'suggest' | 'remind' | 'search' | 'notify' | 'adapt' | 'research';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  metadata?: Record<string, unknown>;
  timeout?: number; // Auto-dismiss after ms
}

export interface ProactiveRule {
  id: string;
  name: string;
  description: string;
  triggers: TriggerCondition[];
  actions: ProactiveAction[];
  enabled: boolean;
  cooldownMs: number;
  lastTriggered?: number;
}

export interface TriggerCondition {
  signalType: ContextSignal['type'];
  matcher: (data: Record<string, unknown>) => boolean;
  minConfidence: number;
}

export interface ProactiveConfig {
  enabled: boolean;
  maxConcurrentActions: number;
  defaultCooldownMs: number;
  enableTimeBased: boolean;
  enableKeywordDetection: boolean;
  enableConversationContext: boolean;
  enableExternalEvents: boolean;
}

// ── Keyword Categories ──

const KEYWORD_CATEGORIES = {
  // Research triggers (user is reading about something)
  research: [
    /(?:là gì|what is|define|khái niệm|concept)/i,
    /(?:tại sao|why|lý do|reason)/i,
    /(?:cách|how|làm thế nào|method)/i,
    /(?:so sánh|compare|khác biệt|difference)/i,
    /(?:đánh giá|review|đánh giá|evaluate)/i,
  ],
  
  // Location triggers (user mentions places)
  location: [
    /(?:đi đâu|where|địa điểm|place|restaurant|quán)/i,
    /(?:đường|road|street|address|địa chỉ)/i,
    /(?:gần đây|nearby|lân cận|close)/i,
    /(?:thời tiết|weather|nhiệt độ|temperature)/i,
  ],
  
  // Task triggers (user mentions doing something)
  task: [
    /(?:cần|need|muốn|want|phải|must)/i,
    /(?:làm|do|thực hiện|execute|chạy|run)/i,
    /(?:hoàn thành|complete|xong|done)/i,
    /(?:deadline|hạn|khi nào|when)/i,
  ],
  
  // Learning triggers (user is studying)
  learning: [
    /(?:học|study|learn|tìm hiểu)/i,
    /(?:giải thích|explain|giải|solve)/i,
    /(?:ví dụ|example|minh họa|illustration)/i,
    /(?:tài liệu|document|tham khảo|reference)/i,
  ],
};

// ── Proactive Rules ──

const DEFAULT_RULES: ProactiveRule[] = [
  {
    id: 'weather-suggestion',
    name: 'Weather Suggestion',
    description: 'Suggest weather info when user mentions going out',
    triggers: [
      {
        signalType: 'keyword',
        matcher: (data) => {
          const keywords = data.keywords as string[] || [];
          return keywords.some(k => /đi đâu|ra ngoài|restaurant|quán|gặp bạn/i.test(k));
        },
        minConfidence: 0.7,
      },
    ],
    actions: [
      {
        type: 'suggest',
        priority: 'medium',
        message: 'Bạn muốn mình tra thời tiết không?',
        metadata: { topic: 'weather' },
      },
    ],
    enabled: true,
    cooldownMs: 1800000, // 30 minutes
  },
  
  {
    id: 'keyword-research',
    name: 'Keyword Research',
    description: 'Auto-research when user highlights/mentions technical terms',
    triggers: [
      {
        signalType: 'keyword',
        matcher: (data) => {
          const keywords = data.keywords as string[] || [];
          return keywords.some(k => 
            /(?:là gì|what is|define|khái niệm)/i.test(k) ||
            k.length > 10 // Long keywords often need explanation
          );
        },
        minConfidence: 0.6,
      },
    ],
    actions: [
      {
        type: 'research',
        priority: 'medium',
        message: 'Mình thấy bạn nhắc đến "{keyword}". Bạn muốn mình tra thêm không?',
        metadata: { autoResearch: true },
      },
    ],
    enabled: true,
    cooldownMs: 600000, // 10 minutes
  },
  
  {
    id: 'sentiment-response',
    name: 'Sentiment-Adaptive Response',
    description: 'Adapt response style based on user sentiment',
    triggers: [
      {
        signalType: 'sentiment',
        matcher: (data) => {
          const score = data.score as number || 0;
          return Math.abs(score) > 0.5; // Strong sentiment
        },
        minConfidence: 0.8,
      },
    ],
    actions: [
      {
        type: 'adapt',
        priority: 'low',
        message: 'Adapt tone based on sentiment',
        metadata: { adaptTone: true },
      },
    ],
    enabled: true,
    cooldownMs: 300000, // 5 minutes
  },
  
  {
    id: 'task-deadline-reminder',
    name: 'Task Deadline Reminder',
    description: 'Remind about deadlines when user mentions tasks',
    triggers: [
      {
        signalType: 'keyword',
        matcher: (data) => {
          const keywords = data.keywords as string[] || [];
          return keywords.some(k => /deadline|hạn|khi nào|due/i.test(k));
        },
        minConfidence: 0.7,
      },
    ],
    actions: [
      {
        type: 'remind',
        priority: 'high',
        message: 'Bạn có deadline nào cần mình theo dõi không?',
        metadata: { topic: 'deadline' },
      },
    ],
    enabled: true,
    cooldownMs: 3600000, // 1 hour
  },
  
  {
    id: 'learning-context',
    name: 'Learning Context Detection',
    description: 'Detect learning context and offer relevant resources',
    triggers: [
      {
        signalType: 'keyword',
        matcher: (data) => {
          const keywords = data.keywords as string[] || [];
          return keywords.some(k => /học|learn|tìm hiểu|giải thích/i.test(k));
        },
        minConfidence: 0.6,
      },
    ],
    actions: [
      {
        type: 'search',
        priority: 'medium',
        message: 'Mình thấy bạn đang tìm hiểu về "{topic}". Bạn muốn mình tìm tài liệu không?',
        metadata: { topic: 'learning' },
      },
    ],
    enabled: true,
    cooldownMs: 900000, // 15 minutes
  },
];

// ── ProactiveEngine Class ──

export class ProactiveEngine {
  private config: ProactiveConfig;
  private rules: ProactiveRule[];
  private eventBus: EventBus | null;
  private pendingActions: Map<string, ProactiveAction[]> = new Map();
  
  constructor(
    config?: Partial<ProactiveConfig>,
    eventBus?: EventBus
  ) {
    this.config = {
      enabled: true,
      maxConcurrentActions: 3,
      defaultCooldownMs: 600000, // 10 minutes
      enableTimeBased: true,
      enableKeywordDetection: true,
      enableConversationContext: true,
      enableExternalEvents: true,
      ...config,
    };
    
    this.rules = [...DEFAULT_RULES];
    this.eventBus = eventBus || null;
  }
  
  /**
   * Evaluate context signals and generate proactive actions
   */
  evaluate(signals: ContextSignal[], userId: string): ProactiveAction[] {
    if (!this.config.enabled) return [];
    
    const actions: ProactiveAction[] = [];
    const now = Date.now();
    
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldownMs) {
        continue;
      }
      
      // Check if any signal matches this rule
      const matchingSignals = signals.filter(signal => {
        if (signal.type !== rule.triggers[0]?.signalType) return false;
        if (signal.confidence < rule.triggers[0]?.minConfidence) return false;
        return rule.triggers[0]?.matcher(signal.data) ?? false;
      });
      
      if (matchingSignals.length > 0) {
        // Execute rule actions
        for (const action of rule.actions) {
          actions.push({
            ...action,
            metadata: {
              ...action.metadata,
              ruleId: rule.id,
              ruleName: rule.name,
              matchedSignals: matchingSignals.map(s => s.type),
            },
          });
        }
        
        // Update cooldown
        rule.lastTriggered = now;
        
        // Record event
        this.recordEvent('proactive_rule_triggered', {
          ruleId: rule.id,
          ruleName: rule.name,
          userId,
          signalCount: matchingSignals.length,
        });
      }
    }
    
    // Sort by priority
    actions.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    });
    
    // Limit concurrent actions
    return actions.slice(0, this.config.maxConcurrentActions);
  }
  
  /**
   * Extract keywords from message for proactive analysis
   */
  extractKeywords(message: string): string[] {
    const keywords: string[] = [];
    
    // Extract all keyword categories
    for (const [category, patterns] of Object.entries(KEYWORD_CATEGORIES)) {
      for (const pattern of patterns) {
        const matches = message.match(new RegExp(pattern.source, 'gi'));
        if (matches) {
          keywords.push(...matches);
        }
      }
    }
    
    // Extract unique keywords
    const unique: string[] = [];
    for (const kw of keywords) {
      if (!unique.includes(kw)) unique.push(kw);
    }
    return unique;
  }
  
  /**
   * Generate proactive suggestions based on message context
   */
  suggestFromMessage(message: string, userId: string): ProactiveAction[] {
    const keywords = this.extractKeywords(message);
    
    if (keywords.length === 0) return [];
    
    const signals: ContextSignal[] = [
      {
        type: 'keyword',
        data: { keywords, message },
        confidence: 0.8,
        timestamp: Date.now(),
      },
    ];
    
    return this.evaluate(signals, userId);
  }
  
  /**
   * Add a custom proactive rule
   */
  addRule(rule: ProactiveRule): void {
    this.rules.push(rule);
  }
  
  /**
   * Remove a proactive rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Enable/disable a rule
   */
  toggleRule(ruleId: string, enabled: boolean): void {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }
  
  /**
   * Get all rules (for debugging)
   */
  getRules(): ProactiveRule[] {
    return [...this.rules];
  }
  
  /**
   * Get config (for debugging)
   */
  getConfig(): ProactiveConfig {
    return { ...this.config };
  }
  
  /**
   * Record event (placeholder for future integration)
   */
  private recordEvent(type: string, data: Record<string, unknown>): void {
    log.debug('Proactive event', { type, ...data });
  }
}

// ── Singleton ──

export const proactiveEngine = new ProactiveEngine();
