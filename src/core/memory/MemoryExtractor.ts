/**
 * @file MemoryExtractor — Event-driven memory extraction pipeline
 * @layer core/memory
 * @created 2026-06-21
 * 
 * Architecture:
 *   EventBus → [MemoryExtractor] → MemoryStore
 *   
 *   TRACE = raw event stream
 *   MEMORY = distilled knowledge from events
 *   
 * Rules:
 *   tool_finished (success) → skill / fact
 *   task_finished (success) → fact
 *   decision_made (user-preference) → preference
 *   reasoning_updated (summarization) → summary
 *   repeated tool pattern → belief
 */

import { EventBus } from '../events/bus.js';
import { AgentEvent } from '../events/types.js';
import { MemoryStore } from './MemoryStore.js';
import { MemoryItem } from './MemoryItem.js';

export interface ExtractionResult {
  extracted: number;  // Number of memories created
  reinforced: number; // Number of existing memories reinforced
  beliefs: number;    // Number of beliefs formed
}

export class MemoryExtractor {
  private store: MemoryStore;
  private bus: EventBus;
  private unsubscribers: (() => void)[] = [];

  constructor(store: MemoryStore, bus: EventBus) {
    this.store = store;
    this.bus = bus;
  }

  /**
   * Start listening to EventBus and extracting memories
   */
  start(): void {
    // Tool finished → skill / fact
    this.unsubscribers.push(
      this.bus.subscribe('tool_finished', (event) => this.extractFromTool(event))
    );

    // Task finished → fact
    this.unsubscribers.push(
      this.bus.subscribe('task_finished', (event) => this.extractFromTask(event))
    );

    // Decision made → preference
    this.unsubscribers.push(
      this.bus.subscribe('decision_made', (event) => this.extractFromDecision(event))
    );

    // Reasoning updated → summary (if contains summarization markers)
    this.unsubscribers.push(
      this.bus.subscribe('reasoning_updated', (event) => this.extractFromReasoning(event))
    );

    console.log('[MemoryExtractor] Started — listening for events');
  }

  /**
   * Stop listening and cleanup
   */
  stop(): void {
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];
    console.log('[MemoryExtractor] Stopped');
  }

  /**
   * Extract memories from all recent events (for initial sync)
   */
  extractFromHistory(events: AgentEvent[]): ExtractionResult {
    const result: ExtractionResult = { extracted: 0, reinforced: 0, beliefs: 0 };
    
    for (const event of events) {
      switch ((event as any).type) {
        case 'tool_finished':
          if (this.extractFromTool(event)) result.extracted++;
          break;
        case 'task_finished':
          if (this.extractFromTask(event)) result.extracted++;
          break;
        case 'decision_made':
          if (this.extractFromDecision(event)) result.extracted++;
          break;
        case 'reasoning_updated':
          if (this.extractFromReasoning(event)) result.extracted++;
          break;
      }
    }
    
    return result;
  }

  // ═══ EXTRACTION RULES ═══

  private extractFromTool(event: AgentEvent): boolean {
    const p = event.payload as any;
    if (!p.toolName || !p.success) return false;

    const taskId = p.taskId || 'unknown';
    const toolName = p.toolName;
    const content = this.summarizeToolResult(toolName, p);

    // Check for belief formation (repeated pattern)
    const formedBelief = this.store.recordToolUsage(toolName, taskId);
    if (formedBelief) {
      this.store.addMemory({
        type: 'belief',
        content: `Belief: Tool "${toolName}" is frequently relied upon across tasks. ${content}`,
        source: { taskId, tool: toolName },
        confidence: 0.7,  // Initial belief confidence
        importance: 0.5,
        tags: ['pattern', 'tool', toolName],
      });
    }

    // Check if we already have a similar fact/skill for this tool
    const existing = this.findExistingToolMemory(event);
    if (existing) {
      // Reinforce existing
      this.store.reinforceMemory(existing.id, 0.03);
      return false;
    }

    // Determine memory type based on tool nature
    const memoryType = this.determineToolMemoryType(toolName, p);
    
    // Create memory
    this.store.addMemory({
      type: memoryType,
      content,
      source: { taskId, tool: toolName, decisionId: p.decisionId },
      confidence: memoryType === 'skill' ? 0.75 : 0.65,
      importance: this.calculateToolImportance(toolName, p),
      tags: [memoryType, 'tool', toolName],
    });

    return true;
  }

  private extractFromTask(event: AgentEvent): boolean {
    const p = event.payload as any;
    if (!p.taskId || !p.success) return false;

    const content = `Completed task: ${p.goal || 'Unnamed'} (${p.duration || '?'}ms)`;
    const taskId = p.taskId;

    // Create summary fact
    this.store.addMemory({
      type: 'fact',
      content,
      source: { taskId },
      confidence: 0.8,
      importance: 0.6,
      tags: ['task', 'completed'],
    });

    return true;
  }

  private extractFromDecision(event: AgentEvent): boolean {
    const p = event.payload as any;
    if (!p.decision) return false;

    const taskId = p.taskId || 'unknown';
    const content = p.reason 
      ? `Decision: ${p.decision} — Reason: ${p.reason}`
      : `Decision: ${p.decision}`;

    // Check if this looks like a user preference or generic decision
    const isPreference = this.isUserPreference(event);

    this.store.addMemory({
      type: isPreference ? 'preference' : 'fact',
      content,
      source: { taskId, decisionId: p.decisionId },
      confidence: isPreference ? 0.9 : 0.6,
      importance: isPreference ? 0.7 : 0.4,
      tags: isPreference ? ['preference', 'user'] : ['decision'],
    });

    return true;
  }

  private extractFromReasoning(event: AgentEvent): boolean {
    const p = event.payload as any;
    if (!p.chunk && !p.fullReasoning) return false;

    const taskId = p.taskId || 'unknown';
    const text = p.fullReasoning || p.chunk || '';

    // Only extract summaries (reasoning that looks like synthesis)
    if (!this.isSummaryReasoning(text)) return false;

    const taskEvent = this.findTaskEvent(event);
    const taskGoal = (taskEvent?.payload as any)?.goal || '';

    this.store.addMemory({
      type: 'summary',
      content: text.substring(0, 500), // Truncate long summaries
      source: { taskId, traceId: p.traceId },
      confidence: 0.6,  // Summary needs reinforcement to become reliable
      importance: 0.5,
      tags: ['summary', taskGoal ? `goal:${taskGoal.substring(0, 30)}` : ''].filter(Boolean),
    });

    return true;
  }

  // ═══ HELPERS ═══

  private summarizeToolResult(toolName: string, payload: any): string {
    const result = payload.result || '';
    const resultStr = typeof result === 'string' 
      ? result.substring(0, 200) 
      : JSON.stringify(result).substring(0, 200);
    
    return `Tool "${toolName}" returned: ${resultStr}`;
  }

  private determineToolMemoryType(toolName: string, payload: any): MemoryItem['type'] {
    // Tools that read/write knowledge → skill
    const skillTools = ['write_wiki_page', 'read_file', 'web_search', 'fetch_url', 'search_knowledge_graph'];
    // Tools that execute actions → fact
    const factTools = ['list_directory', 'execute_code', 'terminal'];

    if (skillTools.includes(toolName)) return 'skill';
    if (factTools.includes(toolName)) return 'fact';
    
    // Default: tools with result length > 200 chars = skill (knowledge gained)
    const resultLen = (payload.result || '').length;
    return resultLen > 200 ? 'skill' : 'fact';
  }

  private calculateToolImportance(toolName: string, payload: any): number {
    // Web search and knowledge access → higher importance
    const highImportance = ['web_search', 'search_knowledge_graph', 'write_wiki_page'];
    if (highImportance.includes(toolName)) return 0.7;
    
    // Execution tools → moderate
    const moderate = ['read_file', 'fetch_url', 'execute_code'];
    if (moderate.includes(toolName)) return 0.5;
    
    return 0.4;
  }

  private findExistingToolMemory(event: AgentEvent): MemoryItem | undefined {
    const p = event.payload as any;
    const toolName = p.toolName;
    
    // Look in store for a similar tool memory
    const query = this.store.query({
      sourceTool: toolName,
      types: ['skill', 'fact'],
      limit: 5,
    });
    
    return query.items.find(m => 
      m.source.tool === toolName && 
      m.reinforcementCount < 3 // Only reinforce if not already reinforced multiple times
    );
  }

  private isUserPreference(event: AgentEvent): boolean {
    const p = event.payload as any;
    const decision = (p.decision || '').toLowerCase();
    const reason = (p.reason || '').toLowerCase();
    
    const preferenceKeywords = ['prefer', 'like', 'use', 'want', 'need', 'would rather', 'better'];
    return preferenceKeywords.some(kw => 
      decision.includes(kw) || reason.includes(kw)
    );
  }

  private isSummaryReasoning(text: string): boolean {
    // Summarization markers
    const summaryPatterns = [
      /summar/i, /conclusion/i, /overview/i,
      /in summary/i, /to summarize/i, /brief/i,
      /to sum up/i, /key (point|takeaway|finding)/i,
    ];
    
    // Only treat as summary if text is substantial
    if (text.length < 100) return false;
    
    return summaryPatterns.some(pattern => pattern.test(text));
  }

  private findTaskEvent(event: AgentEvent): AgentEvent | undefined {
    // Try to get task context from bus
    const taskId = (event.payload as any)?.taskId;
    if (!taskId) return undefined;
    
    const events = this.bus.getRecent(200);
    return events.find(e => 
      (e.payload as any)?.taskId === taskId && 
      (e.type === 'task_started' || e.type === 'task_finished')
    );
  }
}

// Augment EventBus type to include getRecent
// (It already exists in the actual EventBus implementation)
