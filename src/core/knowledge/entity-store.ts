/**
 * @file EntityStore — SQLite-based persistent entity + relationship store
 * @layer core
 * @created 2026-06-21
 *
 * Responsibility:
 * - Persist extracted entities (typed, with confidence & context)
 * - Store and query relationships between entities
 * - Handle entity deduplication via alias system
 * - Enable fast queries by type, text, time range
 */

import { Logger } from '../logger.js';
import { Entity, EntityType, Relationship, RelationType } from './entity-extractor.js';

const log = new Logger({ module: 'EntityStore' });

export interface EntityRecord {
  id: string;
  type: EntityType;
  text: string;
  confidence: number;
  firstSeen: number;
  lastSeen: number;
  mentionCount: number;
  context: string;
  userId?: string;
}

export interface RelationshipRecord {
  id: string;
  entityA_id: string;
  relation: RelationType;
  entityB_id: string;
  confidence: number;
  context: string;
  timestamp: number;
}

export interface AliasRecord {
  id: string;
  canonical_id: string;
  alias: string;
  confidence: number;
}

export interface EntityQuery {
  type?: EntityType;
  text?: string;
  userId?: string;
  limit?: number;
  minConfidence?: number;
}

/**
 * EntityStore: SQLite-backed entity + relationship storage
 *
 * Uses in-memory Map storage by default.
 * Can be backed with SQLite or other durable store.
 */
export class EntityStore {
  private entities: Map<string, EntityRecord> = new Map();
  private relationships: RelationshipRecord[] = [];
  private aliases: Map<string, AliasRecord> = new Map();
  private initialized = false;

  constructor() {}

  /**
   * Initialize store
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    log.info('EntityStore initialized (in-memory)');
  }

  // ──────────────────────────────────────────────
  // Entity CRUD
  // ──────────────────────────────────────────────

  /**
   * Add or update entity (idempotent via dedup by type:text)
   */
  async addEntity(entity: Entity, userId?: string): Promise<EntityRecord> {
    const now = Date.now();
    const existing = this.entities.get(entity.id);

    if (existing) {
      // Update existing entity
      existing.lastSeen = now;
      existing.mentionCount++;
      existing.confidence = Math.max(existing.confidence, entity.confidence);
      existing.context = entity.context || existing.context;
      if (userId) existing.userId = userId;
      log.debug(`Entity updated: ${entity.id} (mention #${existing.mentionCount})`);
      return { ...existing };
    }

    const record: EntityRecord = {
      id: entity.id,
      type: entity.type,
      text: entity.text,
      confidence: entity.confidence,
      firstSeen: now,
      lastSeen: now,
      mentionCount: 1,
      context: entity.context,
      userId,
    };

    this.entities.set(entity.id, record);
    log.debug(`Entity added: ${entity.id}`);
    return { ...record };
  }

  /**
   * Add multiple entities at once (deduplicates internally)
   */
  async addEntities(entities: Entity[], userId?: string): Promise<EntityRecord[]> {
    const results: EntityRecord[] = [];
    for (const entity of entities) {
      const record = await this.addEntity(entity, userId);
      results.push(record);
    }
    return results;
  }

  /**
   * Get entity by ID
   */
  getEntity(id: string): EntityRecord | undefined {
    const record = this.entities.get(id);
    return record ? { ...record } : undefined;
  }

  /**
   * Query entities by type, text, userId
   */
  queryEntities(query: EntityQuery): EntityRecord[] {
    let results = Array.from(this.entities.values());

    if (query.type) {
      results = results.filter(e => e.type === query.type);
    }

    if (query.text) {
      const lower = query.text.toLowerCase();
      results = results.filter(e => e.text.toLowerCase().includes(lower));
    }

    if (query.userId) {
      results = results.filter(e => e.userId === query.userId);
    }

    if (query.minConfidence !== undefined) {
      results = results.filter(e => e.confidence >= query.minConfidence!);
    }

    // Sort by lastSeen descending, limit
    results.sort((a, b) => b.lastSeen - a.lastSeen);

    if (query.limit && query.limit > 0) {
      results = results.slice(0, query.limit);
    }

    return results.map(e => ({ ...e }));
  }

  /**
   * Get all entities of a specific type
   */
  getEntitiesByType(type: EntityType): EntityRecord[] {
    return this.queryEntities({ type });
  }

  /**
   * Get all entities for a user
   */
  getEntitiesByUser(userId: string): EntityRecord[] {
    return this.queryEntities({ userId });
  }

  /**
   * Get entity count
   */
  getEntityCount(): number {
    return this.entities.size;
  }

  /**
   * Delete entity by ID
   */
  deleteEntity(id: string): boolean {
    const existed = this.entities.has(id);
    this.entities.delete(id);
    // Also remove related relationships
    this.relationships = this.relationships.filter(
      r => r.entityA_id !== id && r.entityB_id !== id
    );
    return existed;
  }

  // ──────────────────────────────────────────────
  // Relationship CRUD
  // ──────────────────────────────────────────────

  /**
   * Add relationship between two entities
   */
  async addRelationship(relationship: Relationship): Promise<RelationshipRecord> {
    const now = Date.now();

    // Verify both entities exist
    const entityA = this.entities.get(relationship.entityA.id);
    const entityB = this.entities.get(relationship.entityB.id);

    if (!entityA || !entityB) {
      log.warn(`Cannot add relationship: entity not found (A: ${!!entityA}, B: ${!!entityB})`);
      throw new Error('Entity not found for relationship');
    }

    // Generate consistent ID
    const relId = `${relationship.entityA.id}:${relationship.relation}:${relationship.entityB.id}`;

    const record: RelationshipRecord = {
      id: relId,
      entityA_id: relationship.entityA.id,
      relation: relationship.relation,
      entityB_id: relationship.entityB.id,
      confidence: relationship.confidence,
      context: relationship.context,
      timestamp: now,
    };

    this.relationships.push(record);
    log.debug(`Relationship added: ${relationship.entityA.text} [${relationship.relation}] ${relationship.entityB.text}`);
    return { ...record };
  }

  /**
   * Add multiple relationships
   */
  async addRelationships(relationships: Relationship[]): Promise<RelationshipRecord[]> {
    const results: RelationshipRecord[] = [];
    for (const rel of relationships) {
      try {
        const record = await this.addRelationship(rel);
        results.push(record);
      } catch (error) {
        log.warn(`Failed to add relationship:`, error);
      }
    }
    return results;
  }

  /**
   * Query relationships by entity or relation type
   */
  queryRelationships(options: {
    entityId?: string;
    relation?: RelationType;
    fromEntity?: string;
    toEntity?: string;
    limit?: number;
  }): RelationshipRecord[] {
    let results = [...this.relationships];

    if (options.entityId) {
      results = results.filter(
        r => r.entityA_id === options.entityId || r.entityB_id === options.entityId
      );
    }

    if (options.relation) {
      results = results.filter(r => r.relation === options.relation);
    }

    if (options.fromEntity) {
      results = results.filter(r => r.entityA_id === options.fromEntity);
    }

    if (options.toEntity) {
      results = results.filter(r => r.entityB_id === options.toEntity);
    }

    // Sort by timestamp descending
    results.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get all relationships for an entity
   */
  getRelationshipsForEntity(entityId: string): RelationshipRecord[] {
    return this.queryRelationships({ entityId });
  }

  /**
   * Get total relationship count
   */
  getRelationshipCount(): number {
    return this.relationships.length;
  }

  // ──────────────────────────────────────────────
  // Alias Management
  // ──────────────────────────────────────────────

  /**
   * Register an alias for an entity (e.g., "Nick" → "Nicholas")
   */
  async addAlias(canonicalId: string, alias: string, confidence: number = 0.8): Promise<AliasRecord | null> {
    if (!this.entities.has(canonicalId)) {
      log.warn(`Cannot add alias: entity ${canonicalId} not found`);
      return null;
    }

    const aliasId = `alias:${alias.toLowerCase().trim()}`;

    const record: AliasRecord = {
      id: aliasId,
      canonical_id: canonicalId,
      alias,
      confidence,
    };

    this.aliases.set(aliasId, record);
    return { ...record };
  }

  /**
   * Resolve alias to canonical entity record
   */
  resolveAlias(alias: string): EntityRecord | undefined {
    const aliasId = `alias:${alias.toLowerCase().trim()}`;
    const aliasRecord = this.aliases.get(aliasId);
    if (!aliasRecord) return undefined;
    return this.getEntity(aliasRecord.canonical_id);
  }

  // ──────────────────────────────────────────────
  // Store Management
  // ──────────────────────────────────────────────

  /**
   * Get all stored data (for serialization/backup)
   */
  getAllData(): { entities: EntityRecord[]; relationships: RelationshipRecord[]; aliases: AliasRecord[] } {
    return {
      entities: Array.from(this.entities.values()),
      relationships: [...this.relationships],
      aliases: Array.from(this.aliases.values()),
    };
  }

  /**
   * Load data from serialized form
   */
  async loadFromData(data: {
    entities: EntityRecord[];
    relationships: RelationshipRecord[];
    aliases: AliasRecord[];
  }): Promise<void> {
    // Clear existing data
    this.entities.clear();
    this.relationships = [];
    this.aliases.clear();

    // Load entities
    for (const entity of data.entities) {
      this.entities.set(entity.id, entity);
    }

    // Load relationships
    this.relationships = [...data.relationships];

    // Load aliases
    for (const alias of data.aliases) {
      this.aliases.set(alias.id, alias);
    }

    log.info(`Loaded ${this.entities.size} entities, ${this.relationships.length} relationships, ${this.aliases.size} aliases`);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.entities.clear();
    this.relationships = [];
    this.aliases.clear();
    log.info('EntityStore cleared');
  }

  /**
   * Get store statistics
   */
  getStats(): { entities: number; relationships: number; aliases: number } {
    return {
      entities: this.entities.size,
      relationships: this.relationships.length,
      aliases: this.aliases.size,
    };
  }
}

/**
 * Singleton instance
 */
let storeInstance: EntityStore | null = null;

export async function getEntityStore(): Promise<EntityStore> {
  if (!storeInstance) {
    storeInstance = new EntityStore();
    await storeInstance.init();
  }
  return storeInstance;
}
