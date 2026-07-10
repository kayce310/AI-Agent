/**
 * @file SemanticMemory — Vector embeddings + semantic context retrieval
 * @layer core
 * @created 2026-06-21
 *
 * Responsibility:
 * - Maintain entity embeddings for semantic search
 * - Retrieve top-K contexts by semantic similarity
 * - Assemble context window for agent reasoning
 * - Session-aware context filtering
 *
 * Design: Non-blocking (graceful fallback if embedding service unavailable)
 */

import { Logger } from '../logger.js';
import { EntityStore, EntityRecord, EntityQuery } from './entity-store.js';
import { GraphQuery } from './graph-query.js';

const log = new Logger({ module: 'SemanticMemory' });

export interface SemanticContext {
  entity: EntityRecord;
  relationships: number; // count
  neighbors: number; // count
  relevanceScore: number; // 0-1
  context: string; // summary text
}

export interface RetrievalResult {
  contexts: SemanticContext[];
  totalEntities: number;
  searchTime: number;
}

/**
 * SemanticMemory: Combine entity graph + semantic search
 */
export class SemanticMemory {
  private store: EntityStore;
  private query: GraphQuery;
  private initialized = false;

  constructor(store: EntityStore, query: GraphQuery) {
    this.store = store;
    this.query = query;
  }

  /**
   * Initialize semantic memory
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.store.init();
    await this.query.init();
    this.initialized = true;
    log.info('SemanticMemory initialized');
  }

  // ──────────────────────────────────────────────
  // Context Retrieval
  // ──────────────────────────────────────────────

  /**
   * Get semantic context for a user across all known entities
   * Returns top-K entities by relevance (recency + relationship count)
   */
  async getUserContext(userId: string, topK: number = 10): Promise<RetrievalResult> {
    const startTime = Date.now();

    try {
      // Get all entities for user
      const entities = this.store.queryEntities({
        userId,
        limit: topK * 2, // Fetch extra for scoring
      });

      if (entities.length === 0) {
        return {
          contexts: [],
          totalEntities: 0,
          searchTime: Date.now() - startTime,
        };
      }

      // Score entities by recency + relationship count
      const scored = entities.map(entity => {
        const rels = this.query.findRelationshipsForEntity(entity.id);
        const neighbors = this.query.findNeighbors(entity.id);
        const context = this.query.getEntityContext(entity.id);

        // Relevance: recent entities + highly connected = higher score
        const recencyScore = this.getRecencyScore(entity.lastSeen);
        const connectivityScore = Math.min(neighbors.length / 10, 1.0); // normalized 0-1
        const confidenceScore = entity.confidence;
        const relevanceScore = (recencyScore * 0.5) + (connectivityScore * 0.3) + (confidenceScore * 0.2);

        return {
          entity,
          relationships: rels.length,
          neighbors: neighbors.length,
          relevanceScore,
          context: this.query.getEntitySummary(entity.id) || '',
        };
      });

      // Sort by relevance, take top-K
      scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const contexts = scored.slice(0, topK);

      return {
        contexts,
        totalEntities: entities.length,
        searchTime: Date.now() - startTime,
      };
    } catch (error: any) {
      log.warn('Failed to retrieve user context (non-blocking):', error);
      return {
        contexts: [],
        totalEntities: 0,
        searchTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get context for a specific entity
   * Returns entity + all connected entities + relationships
   */
  async getEntityFullContext(entityId: string): Promise<SemanticContext | null> {
    try {
      const entity = this.store.getEntity(entityId);
      if (!entity) return null;

      const context = this.query.getEntityContext(entityId);
      const summary = this.query.getEntitySummary(entityId) || '';

      return {
        entity,
        relationships: context.relationships.length,
        neighbors: context.neighbors.length,
        relevanceScore: entity.confidence,
        context: summary,
      };
    } catch (error: any) {
      log.warn('Failed to get entity context (non-blocking):', error);
      return null;
    }
  }

  /**
   * Find contextually relevant entities by type + user
   * Useful for: "Find all preferences for this user"
   */
  async findRelevantEntities(
    userId: string,
    entityType: string,
    topK: number = 5
  ): Promise<SemanticContext[]> {
    const entities = this.store.queryEntities({
      userId,
      type: entityType as any,
      limit: topK,
    });
    return entities.map(entity => ({
      entity,
      relationships: this.query.findRelationshipsForEntity(entity.id).length,
      neighbors: this.query.findNeighbors(entity.id).length,
      relevanceScore: entity.confidence * this.getRecencyScore(entity.lastSeen),
      context: this.query.getEntitySummary(entity.id) || '',
    }));
  }

  /**
   * Assemble context window for agent reasoning
   * Combines user context + entity facts + recent interactions
   */
  async assembleContextWindow(
    userId: string,
    sessionId: string,
    maxTokens: number = 1000
  ): Promise<string> {
    try {
      const result = await this.getUserContext(userId, 5); // Top 5 entities

      if (result.contexts.length === 0) {
        return ''; // No context available
      }

      const lines: string[] = [
        '### Known Context for This User',
        '',
      ];

      let tokenCount = 0;
      const tokensPerEntity = Math.floor(maxTokens / result.contexts.length);

      for (const ctx of result.contexts) {
        if (tokenCount >= maxTokens) break;

        const entityLines = [
          `• **${ctx.entity.text}** (${ctx.entity.type})`,
          `  Confidence: ${Math.round(ctx.entity.confidence * 100)}% | Mentions: ${ctx.entity.mentionCount}`,
          `  Relationships: ${ctx.relationships} | Connected to: ${ctx.neighbors} other entities`,
        ];

        tokenCount += entityLines.join('\n').length / 4; // rough token estimate

        if (ctx.context && tokenCount < maxTokens) {
          entityLines.push(`  Context: ${ctx.context.split('\n')[0]}`);
          tokenCount += ctx.context.length / 4;
        }

        lines.push(entityLines.join('\n'));
      }

      lines.push('');
      return lines.join('\n');
    } catch (error: any) {
      log.warn('Failed to assemble context window (non-blocking):', error);
      return '';
    }
  }

  /**
   * Get relationship-based context
   * Find all entities connected to a given entity
   */
  async getRelationshipContext(entityId: string, maxDepth: number = 2): Promise<string> {
    try {
      const entity = this.store.getEntity(entityId);
      if (!entity) return '';

      const lines: string[] = [
        `### Relationship Context for "${entity.text}"`,
        '',
      ];

      // Get immediate relationships
      const rels = this.query.findRelationshipsForEntity(entityId);
      if (rels.length > 0) {
        lines.push(`Direct Connections (${rels.length}):`);
        for (const rel of rels.slice(0, 5)) {
          const other = rel.entityA_id === entityId ? rel.entityB_id : rel.entityA_id;
          const otherEntity = this.store.getEntity(other);
          if (otherEntity) {
            lines.push(`  • [${rel.relation}] ${otherEntity.text}`);
          }
        }
        lines.push('');
      }

      // Get paths to other entities
      if (maxDepth > 1) {
        const neighbors = this.query.findNeighbors(entityId);
        if (neighbors.length > 0) {
          lines.push(`Nearby Entities (${neighbors.length}):`);
          for (const neighbor of neighbors.slice(0, 5)) {
            lines.push(`  • ${neighbor.entity.text} (${neighbor.entity.type})`);
          }
        }
      }

      lines.push('');
      return lines.join('\n');
    } catch (error: any) {
      log.warn('Failed to get relationship context (non-blocking):', error);
      return '';
    }
  }

  // ──────────────────────────────────────────────
  // Scoring Helpers
  // ──────────────────────────────────────────────

  /**
   * Score entity by recency (0-1, higher = more recent)
   * Uses exponential decay over 7 days
   */
  private getRecencyScore(lastSeenMs: number): number {
    const now = Date.now();
    const ageMs = now - lastSeenMs;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    // Exponential decay: score = e^(-age/7)
    // 1 day old = 0.87, 7 days old = 0.37, 30 days old = 0.01
    const decay = Math.exp(-ageDays / 7);
    return Math.max(0, Math.min(1, decay));
  }

  /**
   * Calculate similarity between entities (stub for future vector embedding)
   * Returns 0-1 similarity score
   */
  private calculateSimilarity(entityA: EntityRecord, entityB: EntityRecord): number {
    // TODO: Implement proper vector embedding similarity
    // For now, simple heuristic based on shared relationships
    const relsA = this.query.findRelationshipsForEntity(entityA.id).length;
    const relsB = this.query.findRelationshipsForEntity(entityB.id).length;

    if (relsA === 0 || relsB === 0) return 0;

    // Rough overlap estimate
    const maxRels = Math.max(relsA, relsB);
    const minRels = Math.min(relsA, relsB);
    return minRels / maxRels; // 0-1
  }

  // ──────────────────────────────────────────────
  // Stats & Debug
  // ──────────────────────────────────────────────

  /**
   * Get semantic memory statistics
   */
  getStats(): {
    entityCount: number;
    relationshipCount: number;
    avgConnectionsPerEntity: number;
    typeDistribution: Record<string, number>;
  } {
    const stats = this.query.getGraphStats();
    return {
      entityCount: stats.entities,
      relationshipCount: stats.relationships,
      avgConnectionsPerEntity: stats.avgRelationshipsPerEntity,
      typeDistribution: stats.entityTypeDistribution,
    };
  }

  /**
   * Get debug summary
   */
  getSummary(): string {
    const stats = this.getStats();
    const lines = [
      'SemanticMemory Status:',
      `  Entities: ${stats.entityCount}`,
      `  Relationships: ${stats.relationshipCount}`,
      `  Avg connections/entity: ${stats.avgConnectionsPerEntity}`,
      `  Types: ${JSON.stringify(stats.typeDistribution)}`,
    ];
    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let semanticMemoryInstance: SemanticMemory | null = null;

export async function getSemanticMemory(): Promise<SemanticMemory> {
  if (!semanticMemoryInstance) {
    const store = await (await import('./entity-store.js')).getEntityStore();
    const query = new (await import('./graph-query.js')).GraphQuery(store);
    semanticMemoryInstance = new SemanticMemory(store, query);
    await semanticMemoryInstance.init();
  }
  return semanticMemoryInstance;
}
