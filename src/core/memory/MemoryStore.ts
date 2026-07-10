/**
 * @file MemoryStore — In-memory Map + JSON persistence for MemoryItems
 * @layer core/memory
 * @created 2026-06-21
 * 
 * Architecture:
 *   In-memory Map for O(1) read/write
 *   JSON file for persistence (debounced writes)
 *   Phase 2: migrate to SQLite for scale
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  MemoryItem,
  MemoryQuery,
  MemoryStatus,
  MemorySource,
  calculateMemoryScore,
  calculateEffectiveHalflife,
  ARCHIVE_THRESHOLD,
  MAX_ACTIVE_MEMORIES,
} from './MemoryItem.js';

export class MemoryStore {
  private items: Map<string, MemoryItem> = new Map();
  private filePath: string;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saveDebounceMs: number = 5000;
  private dirty: boolean = false;
  private decayInterval: ReturnType<typeof setInterval> | null = null;
  private patternCounter: Map<string, { callCount: number; uniqueTaskIds: Set<string>; extracted: boolean }> = new Map();

  constructor(dataDir?: string) {
    const dir = dataDir || path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.filePath = path.join(dir, 'memories.json');
    this.loadFromDisk();
    this.enforceLimit();
    this.startDecayInterval();
  }

  // ═══ CRUD ═══

  addMemory(item: Partial<MemoryItem> & { content: string; source: MemorySource; type: MemoryItem['type'] }): MemoryItem {
    const now = Date.now();
    const memory: MemoryItem = {
      id: item.id || randomUUID(),
      type: item.type,
      content: item.content,
      source: item.source,
      confidence: item.confidence ?? 0.7,
      importance: item.importance ?? 0.5,
      decayRate: item.decayRate ?? 0.5,
      createdAt: item.createdAt ?? now,
      lastAccessedAt: now,
      accessCount: 0,
      reinforcementCount: 0,
      linkedMemoryIds: item.linkedMemoryIds ?? [],
      tags: item.tags ?? [],
      status: 'active',
      pinned: item.pinned ?? false,
      archived: false,
    };

    this.items.set(memory.id, memory);
    this.markDirty();
    this.enforceLimit();
    return memory;
  }

  getMemory(id: string): MemoryItem | undefined {
    const item = this.items.get(id);
    if (item) {
      item.lastAccessedAt = Date.now();
      item.accessCount++;
      this.markDirty();
    }
    return item;
  }

  updateMemory(id: string, updates: Partial<MemoryItem>): MemoryItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    
    Object.assign(item, updates);
    item.lastAccessedAt = Date.now();
    this.markDirty();
    
    // Recalculate status
    this.updateStatus(item);
    return item;
  }

  deleteMemory(id: string): boolean {
    const result = this.items.delete(id);
    if (result) this.markDirty();
    return result;
  }

  archiveMemory(id: string): MemoryItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    item.archived = true;
    item.status = 'decaying';
    this.markDirty();
    return item;
  }

  // ═══ QUERY ═══

  query(query: MemoryQuery): { items: MemoryItem[]; total: number } {
    let results = Array.from(this.items.values());

    // Filter
    if (!query.archived) {
      results = results.filter(m => !m.archived);
    }

    if (query.types && query.types.length > 0) {
      results = results.filter(m => query.types!.includes(m.type));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(m => 
        query.tags!.some(tag => m.tags.includes(tag))
      );
    }

    if (query.minConfidence !== undefined) {
      results = results.filter(m => m.confidence >= query.minConfidence!);
    }
    if (query.maxConfidence !== undefined) {
      results = results.filter(m => m.confidence <= query.maxConfidence!);
    }

    if (query.minImportance !== undefined) {
      results = results.filter(m => m.importance >= query.minImportance!);
    }
    if (query.maxImportance !== undefined) {
      results = results.filter(m => m.importance <= query.maxImportance!);
    }

    if (query.status && query.status.length > 0) {
      results = results.filter(m => query.status!.includes(m.status));
    }

    if (query.sourceTaskId) {
      results = results.filter(m => m.source.taskId === query.sourceTaskId);
    }
    if (query.sourceTool) {
      results = results.filter(m => m.source.tool === query.sourceTool);
    }

    // Text search (simple keyword, Phase 1)
    if (query.text && query.text.trim()) {
      const terms = query.text.toLowerCase().split(/\s+/).filter(Boolean);
      results = results.filter(m => {
        const content = m.content.toLowerCase();
        const tags = m.tags.join(' ').toLowerCase();
        return terms.every(t => content.includes(t) || tags.includes(t));
      });
    }

    // Sort
    const sortBy = query.sortBy || 'score';
    const sortDir = query.sortDir || 'desc';
    results.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'score':
          cmp = calculateMemoryScore(b) - calculateMemoryScore(a);
          break;
        case 'confidence':
          cmp = b.confidence - a.confidence;
          break;
        case 'importance':
          cmp = b.importance - a.importance;
          break;
        case 'createdAt':
          cmp = b.createdAt - a.createdAt;
          break;
        case 'lastAccessedAt':
          cmp = b.lastAccessedAt - a.lastAccessedAt;
          break;
      }
      return sortDir === 'desc' ? cmp : -cmp;
    });

    const total = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    results = results.slice(offset, offset + limit);

    return { items: results, total };
  }

  getAll(): MemoryItem[] {
    return Array.from(this.items.values());
  }

  getCount(): { active: number; archived: number; total: number } {
    let active = 0, archived = 0;
    for (const item of Array.from(this.items.values())) {
      if (item.archived) archived++;
      else active++;
    }
    return { active, archived, total: this.items.size };
  }

  // ═══ MEMORY OPERATIONS ═══

  pinMemory(id: string): MemoryItem | null {
    return this.updateMemory(id, { pinned: true });
  }

  unpinMemory(id: string): MemoryItem | null {
    return this.updateMemory(id, { pinned: false });
  }

  forgetMemory(id: string): boolean {
    return this.deleteMemory(id);
  }

  promoteMemory(id: string, newType: MemoryItem['type']): MemoryItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    
    // Promotion chain: fact → belief → skill
    const promotionChain: MemoryItem['type'][] = ['fact', 'belief', 'skill'];
    const currentIdx = promotionChain.indexOf(item.type);
    const newIdx = promotionChain.indexOf(newType);
    
    if (currentIdx === -1 || newIdx === -1 || newIdx <= currentIdx) {
      // Allow any valid promotion (not demotion)
      if (newType === 'preference' || newType === 'summary') {
        return this.updateMemory(id, { type: newType });
      }
      return null;
    }
    
    return this.updateMemory(id, { type: newType, importance: Math.min(1, item.importance + 0.1) });
  }

  linkMemories(id1: string, id2: string): boolean {
    const m1 = this.items.get(id1);
    const m2 = this.items.get(id2);
    if (!m1 || !m2) return false;
    
    if (!m1.linkedMemoryIds.includes(id2)) {
      m1.linkedMemoryIds.push(id2);
    }
    if (!m2.linkedMemoryIds.includes(id1)) {
      m2.linkedMemoryIds.push(id1);
    }
    this.markDirty();
    return true;
  }

  unlinkMemories(id1: string, id2: string): boolean {
    const m1 = this.items.get(id1);
    const m2 = this.items.get(id2);
    if (!m1 || !m2) return false;
    
    m1.linkedMemoryIds = m1.linkedMemoryIds.filter(id => id !== id2);
    m2.linkedMemoryIds = m2.linkedMemoryIds.filter(id => id !== id1);
    this.markDirty();
    return true;
  }

  reinforceMemory(id: string, delta: number = 0.05): MemoryItem | null {
    const item = this.items.get(id);
    if (!item) return null;
    
    item.confidence = Math.min(1, item.confidence + delta);
    item.reinforcementCount++;
    item.lastAccessedAt = Date.now();
    item.status = 'reinforced';
    this.markDirty();
    return item;
  }

  // ═══ PATTERN DETECTION (Belief Formation) ═══

  /**
   * Track tool usage for belief formation.
   * Returns true if a belief was formed (first time pattern detected)
   */
  recordToolUsage(toolName: string, taskId: string): boolean {
    const key = `tool:${toolName}`;
    let counter = this.patternCounter.get(key);
    if (!counter) {
      counter = { callCount: 0, uniqueTaskIds: new Set(), extracted: false };
      this.patternCounter.set(key, counter);
    }
    
    counter.callCount++;
    counter.uniqueTaskIds.add(taskId);
    
    // Check threshold
    if (!counter.extracted && 
        counter.callCount >= 3 && 
        counter.uniqueTaskIds.size >= 2) {
      counter.extracted = true;
      return true;  // Signal: form belief
    }
    
    return false;
  }

  // ═══ PERSISTENCE ═══

  private loadFromDisk(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          for (const item of data) {
            this.items.set(item.id, item);
          }
          console.log(`[MemoryStore] Loaded ${data.length} memories from disk`);
        }
      }
    } catch (err) {
      console.error('[MemoryStore] Failed to load from disk, starting fresh:', (err as Error).message);
      this.items.clear();
    }
  }

  private saveToDisk(): void {
    try {
      const data = Array.from(this.items.values());
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      this.dirty = false;
    } catch (err) {
      console.error('[MemoryStore] Failed to save to disk:', (err as Error).message);
    }
  }

  private markDirty(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      if (this.dirty) this.saveToDisk();
      this.saveTimer = null;
    }, this.saveDebounceMs);
  }

  private enforceLimit(): void {
    if (this.items.size <= MAX_ACTIVE_MEMORIES) {
      // Even if under the active limit, evict stale archived items
      let evicted = 0;
      for (const [id, item] of this.items) {
        if (item.archived && !item.pinned && this.items.size - evicted > MAX_ACTIVE_MEMORIES / 2) {
          this.items.delete(id);
          evicted++;
        }
      }
      if (evicted > 0) this.markDirty();
      return;
    }
    
    // Archive oldest/lowest-scoring items
    const sorted = Array.from(this.items.values())
      .filter(m => !m.pinned && !m.archived)
      .sort((a, b) => calculateMemoryScore(a) - calculateMemoryScore(b));
    
    const toRemove = this.items.size - MAX_ACTIVE_MEMORIES;
    for (let i = 0; i < Math.min(toRemove, sorted.length); i++) {
      sorted[i].archived = true;
    }
    
    // Also remove archived items to free memory
    let evicted = 0;
    for (const [id, item] of this.items) {
      if (item.archived && !item.pinned && evicted < toRemove) {
        this.items.delete(id);
        evicted++;
      }
    }
    if (toRemove > 0 || evicted > 0) this.markDirty();
  }

  private startDecayInterval(): void {
    // Apply decay every 10 minutes
    this.decayInterval = setInterval(() => {
      this.applyDecay();
    }, 10 * 60 * 1000);
    // Allow cleanup
    if (this.decayInterval && typeof this.decayInterval === 'object') {
      this.decayInterval.unref?.();
    }
  }

  /**
   * Apply decay to all active memories
   */
  applyDecay(): void {
    const now = Date.now();
    const HOUR_MS = 3600_000;
    let changed = false;

    for (const item of Array.from(this.items.values())) {
      if (item.pinned) continue;
      
      const ageHours = (now - item.createdAt) / HOUR_MS;
      const halfLife = calculateEffectiveHalflife(item.importance, item.accessCount);
      const decayFactor = Math.exp((-Math.LN2 / halfLife) * ageHours);
      const newConfidence = Math.max(0, item.confidence * decayFactor);
      
      if (newConfidence < item.confidence) {
        item.confidence = newConfidence;
        this.updateStatus(item);
        changed = true;
      }
    }

    if (changed) this.markDirty();
  }

  private updateStatus(item: MemoryItem): void {
    if (item.pinned || item.archived) return;
    
    const score = calculateMemoryScore(item);
    
    if (item.reinforcementCount >= 3 && score > 0.5) {
      item.status = 'reinforced';
    } else if (score > 0.3 && item.accessCount > 0) {
      item.status = 'active';
    } else if (score > ARCHIVE_THRESHOLD) {
      item.status = 'dormant';
    } else {
      item.status = 'decaying';
      if (score < ARCHIVE_THRESHOLD && !item.pinned) {
        item.archived = true;
      }
    }
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    if (this.decayInterval) {
      clearInterval(this.decayInterval);
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    if (this.dirty) {
      this.saveToDisk();
    }
  }
}
