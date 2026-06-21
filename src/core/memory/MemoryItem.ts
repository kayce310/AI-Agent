/**
 * @file MemoryItem — Core data model for agent memory
 * @layer core/memory
 * @created 2026-06-21
 * 
 * Memory is distilled knowledge from events (NOT raw trace/log).
 * TRACE = raw event stream
 * MEMORY = structured, queryable, weighted belief/state store
 */

// ═══ MEMORY TYPES ═══

export type MemoryType = 'fact' | 'belief' | 'preference' | 'skill' | 'summary';
export type MemoryStatus = 'active' | 'dormant' | 'reinforced' | 'decaying';

/**
 * Cognitive metadata — governs memory lifecycle
 */
export interface CognitiveMetadata {
  confidence: number;  // 0..1 — How sure are we this is true?
  importance: number;  // 0..1 — How important is this memory?
  decayRate: number;   // Base decay factor per half-life period
}

/**
 * Provenance — where this memory came from
 */
export interface MemorySource {
  taskId: string;
  traceId?: string;
  tool?: string;
  decisionId?: string;
}

/**
 * A single cognitive shard — one piece of distilled knowledge
 */
export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  
  // Provenance
  source: MemorySource;
  
  // Cognitive metadata
  confidence: number;
  importance: number;
  decayRate: number;
  
  // Lifecycle
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  reinforcementCount: number;
  
  // Relations
  linkedMemoryIds: string[];
  tags: string[];
  
  // State
  status: MemoryStatus;
  pinned: boolean;
  archived: boolean;
}

// ═══ QUERY ═══

export interface MemoryQuery {
  text?: string;
  types?: MemoryType[];
  tags?: string[];
  minConfidence?: number;
  maxConfidence?: number;
  minImportance?: number;
  maxImportance?: number;
  status?: MemoryStatus[];
  sourceTaskId?: string;
  sourceTool?: string;
  archived?: boolean;
  sortBy?: 'score' | 'createdAt' | 'lastAccessedAt' | 'confidence' | 'importance';
  sortDir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// ═══ CONSTANTS ═══

export const DEFAULT_DECAY_RATE = 0.5; // Base half-life: 24h
export const ARCHIVE_THRESHOLD = 0.1;
export const MAX_ACTIVE_MEMORIES = 10000;
export const REINFORCEMENT_BONUS = 0.05;
export const BELIEF_PATTERN_MIN_CALLS = 3;
export const BELIEF_PATTERN_MIN_TASKS = 2;

// ═══ HELPERS ═══

export function calculateMemoryScore(memory: MemoryItem): number {
  return memory.confidence * memory.importance;
}

export function calculateEffectiveHalflife(
  importance: number,
  accessCount: number
): number {
  // Higher importance + more access = slower decay
  return 24 * (1 + importance * 10) * (1 + Math.log2(1 + accessCount));
}

export function currentConfidence(
  initialConfidence: number,
  importance: number,
  accessCount: number,
  ageHours: number
): number {
  const halfLife = calculateEffectiveHalflife(importance, accessCount);
  const decayFactor = Math.exp((-Math.LN2 / halfLife) * ageHours);
  return Math.max(0, initialConfidence * decayFactor);
}
