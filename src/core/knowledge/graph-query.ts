/**
 * @file GraphQuery — Entity graph pattern queries
 * @layer core
 * @created 2026-06-21
 *
 * Responsibility:
 * - Execute typed queries on entity graph
 * - Path finding between entities (shortest path)
 * - Relationship pattern matching
 * - Paginated result delivery
 */

import { Logger } from '../logger.js';
import { EntityRecord, RelationshipRecord, EntityQuery, EntityStore } from './entity-store.js';
import { EntityType, RelationType } from './entity-extractor.js';

const log = new Logger({ module: 'GraphQuery' });

export interface PathNode {
  entity: EntityRecord;
  relationship: RelationshipRecord;
  depth: number;
}

export interface EntityPath {
  path: PathNode[];
  length: number;
}

/**
 * GraphQuery: Entity graph query engine
 */
export class GraphQuery {
  private store: EntityStore;
  private initialized = false;

  constructor(store: EntityStore) {
    this.store = store;
  }

  /**
   * Initialize query engine
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    await this.store.init();
    this.initialized = true;
    log.info('GraphQuery initialized');
  }

  // ──────────────────────────────────────────────
  // Entity Queries
  // ──────────────────────────────────────────────

  /**
   * Find entities matching query criteria
   */
  findEntities(query: EntityQuery): EntityRecord[] {
    return this.store.queryEntities(query);
  }

  /**
   * Find entities by type with optional text filter
   */
  findEntitiesByType(type: EntityType, textFilter?: string, limit: number = 20): EntityRecord[] {
    return this.store.queryEntities({
      type,
      text: textFilter,
      limit,
    });
  }

  /**
   * Find entities by text (fuzzy, case-insensitive)
   */
  findEntitiesByText(text: string, limit: number = 20): EntityRecord[] {
    return this.store.queryEntities({ text, limit });
  }

  /**
   * Find entities for a specific user
   */
  findEntitiesForUser(userId: string, limit: number = 20): EntityRecord[] {
    return this.store.queryEntities({ userId, limit });
  }

  // ──────────────────────────────────────────────
  // Relationship Queries
  // ──────────────────────────────────────────────

  /**
   * Find relationships matching criteria
   */
  findRelationships(options: {
    entityId?: string;
    relation?: RelationType;
    fromEntity?: string;
    toEntity?: string;
    limit?: number;
  }): RelationshipRecord[] {
    return this.store.queryRelationships(options);
  }

  /**
   * Find all relationships for an entity
   */
  findRelationshipsForEntity(entityId: string): RelationshipRecord[] {
    return this.store.getRelationshipsForEntity(entityId);
  }

  /**
   * Find immediate neighbors (entities directly connected)
   */
  findNeighbors(entityId: string): { entity: EntityRecord; relation: RelationshipRecord }[] {
    const rels = this.store.queryRelationships({ entityId });
    const neighbors: { entity: EntityRecord; relation: RelationshipRecord }[] = [];

    for (const rel of rels) {
      if (rel.entityA_id === entityId) {
        const entity = this.store.getEntity(rel.entityB_id);
        if (entity) {
          neighbors.push({ entity, relation: rel });
        }
      } else {
        const entity = this.store.getEntity(rel.entityA_id);
        if (entity) {
          neighbors.push({ entity, relation: rel });
        }
      }
    }

    return neighbors;
  }

  // ──────────────────────────────────────────────
  // Path Finding
  // ──────────────────────────────────────────────

  /**
   * Find shortest path between two entities (BFS up to maxDepth)
   */
  findShortestPath(
    startEntityId: string,
    endEntityId: string,
    maxDepth: number = 3
  ): EntityPath | null {
    if (startEntityId === endEntityId) {
      return { path: [], length: 0 };
    }

    // BFS queue
    interface BFSNode {
      entityId: string;
      path: PathNode[];
      visited: Set<string>;
    }

    const queue: BFSNode[] = [{
      entityId: startEntityId,
      path: [],
      visited: new Set([startEntityId]),
    }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.path.length >= maxDepth) continue;

      // Find all neighbors
      const rels = this.store.queryRelationships({ entityId: current.entityId });

      for (const rel of rels) {
        const neighborId = rel.entityA_id === current.entityId
          ? rel.entityB_id
          : rel.entityA_id;

        if (current.visited.has(neighborId)) continue;

        const neighborEntity = this.store.getEntity(neighborId);
        if (!neighborEntity) continue;

        const newPath: PathNode[] = [
          ...current.path,
          {
            entity: neighborEntity,
            relationship: rel,
            depth: current.path.length + 1,
          },
        ];

        if (neighborId === endEntityId) {
          return {
            path: newPath,
            length: newPath.length,
          };
        }

        const newVisited = new Set(current.visited);
        newVisited.add(neighborId);

        queue.push({
          entityId: neighborId,
          path: newPath,
          visited: newVisited,
        });
      }
    }

    return null; // No path found
  }

  /**
   * Find all paths between two entities (up to maxDepth, limit results)
   */
  findAllPaths(
    startEntityId: string,
    endEntityId: string,
    maxDepth: number = 3,
    maxResults: number = 10
  ): EntityPath[] {
    if (startEntityId === endEntityId) {
      return [];
    }

    const paths: EntityPath[] = [];

    // DFS with depth limit
    const dfs = (
      currentId: string,
      visited: Set<string>,
      pathSoFar: PathNode[],
      depth: number
    ) => {
      if (paths.length >= maxResults) return;
      if (depth > maxDepth) return;

      const rels = this.store.queryRelationships({ entityId: currentId });

      for (const rel of rels) {
        const neighborId = rel.entityA_id === currentId
          ? rel.entityB_id
          : rel.entityA_id;

        if (visited.has(neighborId)) continue;

        const neighbor = this.store.getEntity(neighborId);
        if (!neighbor) continue;

        const node: PathNode = {
          entity: neighbor,
          relationship: rel,
          depth,
        };

        const newPath = [...pathSoFar, node];
        const newVisited = new Set(visited);
        newVisited.add(neighborId);

        if (neighborId === endEntityId) {
          paths.push({ path: newPath, length: newPath.length });
          if (paths.length >= maxResults) return;
        } else {
          dfs(neighborId, newVisited, newPath, depth + 1);
        }
      }
    };

    dfs(startEntityId, new Set([startEntityId]), [], 1);
    return paths;
  }

  // ──────────────────────────────────────────────
  // Context Queries
  // ──────────────────────────────────────────────

  /**
   * Get full context for an entity (itself + all relationships + neighbors)
   */
  getEntityContext(entityId: string): {
    entity: EntityRecord | undefined;
    relationships: RelationshipRecord[];
    neighbors: EntityRecord[];
  } {
    const entity = this.store.getEntity(entityId);
    const relationships = this.store.queryRelationships({ entityId });
    const neighbors = this.findNeighbors(entityId).map(n => n.entity);

    return {
      entity,
      relationships,
      neighbors,
    };
  }

  /**
   * Get entity mention history summary
   */
  getEntitySummary(entityId: string): string | null {
    const entity = this.store.getEntity(entityId);
    if (!entity) return null;

    const relationships = this.store.queryRelationships({ entityId });
    const neighbors = this.findNeighbors(entityId);

    const lines: string[] = [
      `Entity: ${entity.text} (${entity.type})`,
      `Confidence: ${Math.round(entity.confidence * 100)}%`,
      `Mentions: ${entity.mentionCount}`,
      `First seen: ${new Date(entity.firstSeen).toISOString()}`,
      `Last seen: ${new Date(entity.lastSeen).toISOString()}`,
    ];

    if (relationships.length > 0) {
      lines.push(`\nRelationships (${relationships.length}):`);
      for (const rel of relationships) {
        const a = this.store.getEntity(rel.entityA_id);
        const b = this.store.getEntity(rel.entityB_id);
        const aName = a ? a.text : rel.entityA_id;
        const bName = b ? b.text : rel.entityB_id;
        lines.push(`  ${aName} [${rel.relation}] ${bName}`);
      }
    }

    if (neighbors.length > 0) {
      lines.push(`\nConnected entities (${neighbors.length}):`);
      for (const neighbor of neighbors) {
        const neighborEntity = neighbor.entity;
        lines.push(`  ${neighborEntity.text} (${neighborEntity.type})`);
      }
    }

    return lines.join('\n');
  }

  // ──────────────────────────────────────────────
  // Stats
  // ──────────────────────────────────────────────

  /**
   * Get graph statistics
   */
  getGraphStats(): {
    entities: number;
    relationships: number;
    avgRelationshipsPerEntity: number;
    entityTypeDistribution: Record<string, number>;
  } {
    const allEntities = this.store.queryEntities({});
    const allRelationships = this.store.queryRelationships({});

    // Type distribution
    const typeDist: Record<string, number> = {};
    for (const entity of allEntities) {
      typeDist[entity.type] = (typeDist[entity.type] || 0) + 1;
    }

    return {
      entities: allEntities.length,
      relationships: allRelationships.length,
      avgRelationshipsPerEntity: allEntities.length > 0
        ? Math.round((allRelationships.length / allEntities.length) * 10) / 10
        : 0,
      entityTypeDistribution: typeDist,
    };
  }
}
