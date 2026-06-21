/**
 * @file GraphQuery Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityStore } from '../src/core/knowledge/entity-store.js';
import { GraphQuery } from '../src/core/knowledge/graph-query.js';
import { Entity, EntityType, RelationType } from '../src/core/knowledge/entity-extractor.js';

describe('GraphQuery', () => {
  let store: EntityStore;
  let query: GraphQuery;

  beforeEach(async () => {
    store = new EntityStore();
    await store.init();
    query = new GraphQuery(store);
    await query.init();
  });

  describe('Entity finding', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PERSON:tor', type: 'PERSON', text: 'Tor', confidence: 0.9, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
      ];
      await store.addEntities(entities);
    });

    it('should find entities by type', () => {
      const persons = query.findEntitiesByType('PERSON');
      expect(persons).toHaveLength(2);
    });

    it('should find entities by text', () => {
      const results = query.findEntitiesByText('Kayce');
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('Kayce');
    });

    it('should find entities for user', async () => {
      const entity: Entity = {
        id: 'PERSON:user1',
        type: 'PERSON',
        text: 'User1',
        confidence: 0.9,
        context: 'test',
      };
      await store.addEntity(entity, 'user-123');

      const results = query.findEntitiesForUser('user-123');
      expect(results).toHaveLength(1);
    });

    it('should respect limit parameter', () => {
      const limited = query.findEntitiesByType('PERSON', undefined, 1);
      expect(limited).toHaveLength(1);
    });
  });

  describe('Relationship finding', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
        { id: 'CONCEPT:engineer', type: 'CONCEPT', text: 'Engineer', confidence: 0.9, context: 'test' },
      ];
      await store.addEntities(entities);

      const a = store.getEntity('PERSON:kayce')!;
      const b = store.getEntity('PLACE:hanoi')!;
      const c = store.getEntity('CONCEPT:engineer')!;

      await store.addRelationship({
        entityA: { id: a.id, type: a.type as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'LOCATED_IN' as RelationType,
        entityB: { id: b.id, type: b.type as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        confidence: 0.9,
        context: 'Kayce lives in Hà Nội',
      });

      await store.addRelationship({
        entityA: { id: a.id, type: a.type as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'ROLE' as RelationType,
        entityB: { id: c.id, type: c.type as EntityType, text: c.text, confidence: c.confidence, context: c.context },
        confidence: 0.85,
        context: 'Kayce is an Engineer',
      });
    });

    it('should find relationships for entity', () => {
      const rels = query.findRelationshipsForEntity('PERSON:kayce');
      expect(rels.length).toBeGreaterThanOrEqual(2);
    });

    it('should find relationships by type', () => {
      const rels = query.findRelationships({ relation: 'LOCATED_IN' });
      expect(rels).toHaveLength(1);
    });

    it('should find neighbors of entity', () => {
      const neighbors = query.findNeighbors('PERSON:kayce');
      expect(neighbors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Path finding', () => {
    beforeEach(async () => {
      // Create chain: A -> B -> C -> D
      const entities: Entity[] = [
        { id: 'PERSON:a', type: 'PERSON', text: 'A', confidence: 0.9, context: 'test' },
        { id: 'PERSON:b', type: 'PERSON', text: 'B', confidence: 0.9, context: 'test' },
        { id: 'PERSON:c', type: 'PERSON', text: 'C', confidence: 0.9, context: 'test' },
        { id: 'PERSON:d', type: 'PERSON', text: 'D', confidence: 0.9, context: 'test' },
      ];
      await store.addEntities(entities);

      const a = store.getEntity('PERSON:a')!;
      const b = store.getEntity('PERSON:b')!;
      const c = store.getEntity('PERSON:c')!;
      const d = store.getEntity('PERSON:d')!;

      // A -> B
      await store.addRelationship({
        entityA: { id: a.id, type: 'PERSON' as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'KNOWS' as RelationType,
        entityB: { id: b.id, type: 'PERSON' as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        confidence: 0.9,
        context: 'A knows B',
      });

      // B -> C
      await store.addRelationship({
        entityA: { id: b.id, type: 'PERSON' as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        relation: 'KNOWS' as RelationType,
        entityB: { id: c.id, type: 'PERSON' as EntityType, text: c.text, confidence: c.confidence, context: c.context },
        confidence: 0.9,
        context: 'B knows C',
      });

      // C -> D
      await store.addRelationship({
        entityA: { id: c.id, type: 'PERSON' as EntityType, text: c.text, confidence: c.confidence, context: c.context },
        relation: 'KNOWS' as RelationType,
        entityB: { id: d.id, type: 'PERSON' as EntityType, text: d.text, confidence: d.confidence, context: d.context },
        confidence: 0.9,
        context: 'C knows D',
      });
    });

    it('should find shortest path between connected entities', () => {
      const path = query.findShortestPath('PERSON:a', 'PERSON:d');
      expect(path).not.toBeNull();
      expect(path!.path.length).toBeGreaterThanOrEqual(2);
    });

    it('should return null for unconnected entities', () => {
      // Add isolated entity
      const iso: Entity = {
        id: 'PERSON:iso',
        type: 'PERSON',
        text: 'Isolated',
        confidence: 0.9,
        context: 'test',
      };
      store.addEntity(iso);

      const path = query.findShortestPath('PERSON:a', 'PERSON:iso');
      expect(path).toBeNull();
    });

    it('should respect maxDepth limit', () => {
      const path = query.findShortestPath('PERSON:a', 'PERSON:d', 1); // Only 1 hop
      expect(path).toBeNull(); // Too deep
    });

    it('should find all paths', () => {
      const paths = query.findAllPaths('PERSON:a', 'PERSON:c', 5, 10);
      expect(paths.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Context retrieval', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
        { id: 'CONCEPT:engineer', type: 'CONCEPT', text: 'Engineer', confidence: 0.9, context: 'test' },
      ];
      await store.addEntities(entities);

      const a = store.getEntity('PERSON:kayce')!;
      const b = store.getEntity('PLACE:hanoi')!;

      await store.addRelationship({
        entityA: { id: a.id, type: a.type as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'LOCATED_IN' as RelationType,
        entityB: { id: b.id, type: b.type as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        confidence: 0.9,
        context: 'Kayce lives in Hà Nội',
      });
    });

    it('should get entity context', () => {
      const context = query.getEntityContext('PERSON:kayce');
      expect(context.entity).toBeDefined();
      expect(context.entity!.text).toBe('Kayce');
      expect(context.relationships).toBeDefined();
      expect(context.neighbors).toBeDefined();
    });

    it('should get entity summary', () => {
      const summary = query.getEntitySummary('PERSON:kayce');
      expect(summary).toBeDefined();
      expect(summary).toContain('Kayce');
      expect(summary).toContain('PERSON');
    });

    it('should return null for non-existent entity summary', () => {
      const summary = query.getEntitySummary('NONEXISTENT');
      expect(summary).toBeNull();
    });
  });

  describe('Graph statistics', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PERSON:tor', type: 'PERSON', text: 'Tor', confidence: 0.9, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
      ];
      await store.addEntities(entities);

      const a = store.getEntity('PERSON:kayce')!;
      const b = store.getEntity('PLACE:hanoi')!;

      await store.addRelationship({
        entityA: { id: a.id, type: a.type as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'LOCATED_IN' as RelationType,
        entityB: { id: b.id, type: b.type as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        confidence: 0.9,
        context: 'Kayce lives in Hà Nội',
      });
    });

    it('should return graph statistics', () => {
      const stats = query.getGraphStats();
      expect(stats.entities).toBe(3);
      expect(stats.relationships).toBeGreaterThanOrEqual(1);
      expect(stats.avgRelationshipsPerEntity).toBeGreaterThanOrEqual(0);
      expect(stats.entityTypeDistribution).toBeDefined();
    });

    it('should count entity types correctly', () => {
      const stats = query.getGraphStats();
      expect(stats.entityTypeDistribution.PERSON).toBe(2);
      expect(stats.entityTypeDistribution.PLACE).toBe(1);
    });
  });
});
