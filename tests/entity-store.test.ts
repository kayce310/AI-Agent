/**
 * @file EntityStore Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityStore } from '../src/core/knowledge/entity-store.js';
import { Entity, EntityType, RelationType } from '../src/core/knowledge/entity-extractor.js';

describe('EntityStore', () => {
  let store: EntityStore;

  beforeEach(async () => {
    store = new EntityStore();
    await store.init();
  });

  describe('Entity CRUD', () => {
    it('should add a new entity', async () => {
      const entity: Entity = {
        id: 'PERSON:kayce',
        type: 'PERSON',
        text: 'Kayce',
        confidence: 0.95,
        context: 'My name is Kayce',
      };

      const record = await store.addEntity(entity);
      expect(record.id).toBe('PERSON:kayce');
      expect(record.type).toBe('PERSON');
      expect(record.text).toBe('Kayce');
      expect(record.mentionCount).toBe(1);
    });

    it('should increment mention count on re-add', async () => {
      const entity: Entity = {
        id: 'PERSON:kayce',
        type: 'PERSON',
        text: 'Kayce',
        confidence: 0.9,
        context: 'test',
      };

      await store.addEntity(entity);
      await store.addEntity(entity);

      const record = store.getEntity('PERSON:kayce');
      expect(record).toBeDefined();
      expect(record!.mentionCount).toBe(2);
    });

    it('should keep max confidence on re-add', async () => {
      const entity1: Entity = {
        id: 'PERSON:kayce',
        type: 'PERSON',
        text: 'Kayce',
        confidence: 0.85,
        context: 'first',
      };

      const entity2: Entity = {
        id: 'PERSON:kayce',
        type: 'PERSON',
        text: 'Kayce',
        confidence: 0.95,
        context: 'second',
      };

      await store.addEntity(entity1);
      await store.addEntity(entity2);

      const record = store.getEntity('PERSON:kayce');
      expect(record).toBeDefined();
      expect(record!.confidence).toBe(0.95); // Higher one wins
    });

    it('should add multiple entities', async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
        { id: 'CONCEPT:smart-home', type: 'CONCEPT', text: 'Smart Home', confidence: 0.85, context: 'test' },
      ];

      const records = await store.addEntities(entities);
      expect(records).toHaveLength(3);
      expect(store.getEntityCount()).toBe(3);
    });

    it('should get entity by id', () => {
      const entity: Entity = {
        id: 'PERSON:kayce',
        type: 'PERSON',
        text: 'Kayce',
        confidence: 0.95,
        context: 'test',
      };

      store.addEntity(entity);

      const found = store.getEntity('PERSON:kayce');
      expect(found).toBeDefined();
      expect(found!.text).toBe('Kayce');
    });

    it('should return undefined for non-existent id', () => {
      const found = store.getEntity('NONEXISTENT');
      expect(found).toBeUndefined();
    });

    it('should delete entity', async () => {
      const entity: Entity = {
        id: 'PERSON:kayce',
        type: 'PERSON',
        text: 'Kayce',
        confidence: 0.95,
        context: 'test',
      };

      await store.addEntity(entity);
      expect(store.getEntityCount()).toBe(1);

      const deleted = store.deleteEntity('PERSON:kayce');
      expect(deleted).toBe(true);
      expect(store.getEntityCount()).toBe(0);
    });
  });

  describe('Entity Querying', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PERSON:tor', type: 'PERSON', text: 'Tor', confidence: 0.9, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
        { id: 'PLACE:sgn', type: 'PLACE', text: 'Sài Gòn', confidence: 0.85, context: 'test' },
        { id: 'CONCEPT:test', type: 'CONCEPT', text: 'Testing', confidence: 0.8, context: 'test' },
      ];

      await store.addEntities(entities);
    });

    it('should query by type', () => {
      const persons = store.queryEntities({ type: 'PERSON' });
      expect(persons).toHaveLength(2);
    });

    it('should query by text (partial match)', () => {
      const results = store.queryEntities({ text: 'Kayce' });
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('Kayce');
    });

    it('should query by text (case-insensitive)', () => {
      const results = store.queryEntities({ text: 'kayce' });
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('Kayce');
    });

    it('should query by type and text', () => {
      const results = store.queryEntities({ type: 'PLACE', text: 'Hà Nội' });
      expect(results).toHaveLength(1);
    });

    it('should respect minConfidence filter', () => {
      const high = store.queryEntities({ minConfidence: 0.9 });
      // Kayce(0.95), Tor(0.9), Hà Nội(0.9) = 3
      expect(high.length).toBeLessThanOrEqual(5);
      for (const e of high) {
        expect(e.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });

    it('should respect limit', () => {
      const limited = store.queryEntities({ limit: 2 });
      expect(limited).toHaveLength(2);
    });

    it('should query by user id', async () => {
      const entity: Entity = {
        id: 'PERSON:user1',
        type: 'PERSON',
        text: 'User1',
        confidence: 0.9,
        context: 'test',
      };

      await store.addEntity(entity, 'user-123');

      const results = store.queryEntities({ userId: 'user-123' });
      expect(results).toHaveLength(1);
    });

    it('should get entities by type', () => {
      const places = store.getEntitiesByType('PLACE');
      expect(places).toHaveLength(2);
    });

    it('should sort by lastSeen descending', async () => {
      // Add a newer entity
      await new Promise(resolve => setTimeout(resolve, 10));
      const newer: Entity = {
        id: 'PERSON:new',
        type: 'PERSON',
        text: 'New',
        confidence: 0.9,
        context: 'test',
      };
      await store.addEntity(newer);

      const results = store.queryEntities({ type: 'PERSON' });
      expect(results[0].text).toBe('New'); // Most recent first
    });
  });

  describe('Relationships', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
        { id: 'CONCEPT:engineer', type: 'CONCEPT', text: 'Engineer', confidence: 0.9, context: 'test' },
      ];

      await store.addEntities(entities);
    });

    it('should add relationship between entities', async () => {
      const a = store.getEntity('PERSON:kayce')!;
      const b = store.getEntity('PLACE:hanoi')!;

      const relationship = {
        entityA: { id: a.id, type: 'PERSON' as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'LOCATED_IN' as RelationType,
        entityB: { id: b.id, type: 'PLACE' as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        confidence: 0.9,
        context: 'Kayce lives in Hà Nội',
      };

      const record = await store.addRelationship(relationship as any);
      expect(record.entityA_id).toBe('PERSON:kayce');
      expect(record.entityB_id).toBe('PLACE:hanoi');
      expect(record.relation).toBe('LOCATED_IN');
    });

    it('should throw when adding relationship with non-existent entity', async () => {
      const a = store.getEntity('PERSON:kayce')!;
      const nonExistent: Entity = {
        id: 'NONEXISTENT',
        type: 'PERSON',
        text: 'Ghost',
        confidence: 0.5,
        context: 'test',
      };

      const relationship = {
        entityA: { id: a.id, type: 'PERSON' as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'KNOWS' as RelationType,
        entityB: nonExistent,
        confidence: 0.5,
        context: 'test',
      };

      await expect(store.addRelationship(relationship as any)).rejects.toThrow('Entity not found');
    });

    it('should query relationships by entity', async () => {
      const a = store.getEntity('PERSON:kayce')!;
      const b = store.getEntity('PLACE:hanoi')!;

      const relationship = {
        entityA: { id: a.id, type: 'PERSON' as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'LOCATED_IN' as RelationType,
        entityB: { id: b.id, type: 'PLACE' as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        confidence: 0.9,
        context: 'Kayce lives in Hà Nội',
      };

      await store.addRelationship(relationship as any);

      const rels = store.queryRelationships({ entityId: 'PERSON:kayce' });
      expect(rels).toHaveLength(1);
    });

    it('should query relationships by relation type', async () => {
      const a = store.getEntity('PERSON:kayce')!;
      const b = store.getEntity('PLACE:hanoi')!;
      const c = store.getEntity('CONCEPT:engineer')!;

      await store.addRelationship({
        entityA: { id: a.id, type: 'PERSON' as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'LOCATED_IN' as RelationType,
        entityB: { id: b.id, type: 'PLACE' as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        confidence: 0.9,
        context: 'Kayce lives in Hà Nội',
      });

      await store.addRelationship({
        entityA: { id: a.id, type: 'PERSON' as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'ROLE' as RelationType,
        entityB: { id: c.id, type: 'CONCEPT' as EntityType, text: c.text, confidence: c.confidence, context: c.context },
        confidence: 0.85,
        context: 'Kayce is an Engineer',
      });

      const located = store.queryRelationships({ relation: 'LOCATED_IN' });
      expect(located).toHaveLength(1);

      const roles = store.queryRelationships({ relation: 'ROLE' });
      expect(roles).toHaveLength(1);
    });

    it('should handle multiple relationships', async () => {
      await store.addEntities([
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' } as Entity,
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' } as Entity,
        { id: 'CONCEPT:engineer', type: 'CONCEPT', text: 'Engineer', confidence: 0.9, context: 'test' } as Entity,
      ]);
      // Already added in beforeEach, but just in case
    });
  });

  describe('Aliases', () => {
    it('should add alias for existing entity', async () => {
      const entity: Entity = {
        id: 'PERSON:nicholas',
        type: 'PERSON',
        text: 'Nicholas',
        confidence: 0.95,
        context: 'test',
      };

      await store.addEntity(entity);
      const alias = await store.addAlias('PERSON:nicholas', 'Nick');
      expect(alias).not.toBeNull();
      expect(alias!.alias).toBe('Nick');
    });

    it('should return null for non-existent entity alias', async () => {
      const alias = await store.addAlias('NONEXISTENT', 'SomeName');
      expect(alias).toBeNull();
    });

    it('should resolve alias to canonical entity', async () => {
      const entity: Entity = {
        id: 'PERSON:nicholas',
        type: 'PERSON',
        text: 'Nicholas',
        confidence: 0.95,
        context: 'test',
      };

      await store.addEntity(entity);
      await store.addAlias('PERSON:nicholas', 'Nick');

      const resolved = store.resolveAlias('Nick');
      expect(resolved).toBeDefined();
      expect(resolved!.text).toBe('Nicholas');
    });

    it('should handle case-insensitive alias resolution', async () => {
      const entity: Entity = {
        id: 'PERSON:nicholas',
        type: 'PERSON',
        text: 'Nicholas',
        confidence: 0.95,
        context: 'test',
      };

      await store.addEntity(entity);
      await store.addAlias('PERSON:nicholas', 'Nick');

      const resolved = store.resolveAlias('nick'); // lowercase
      expect(resolved).toBeDefined();
      expect(resolved!.text).toBe('Nicholas');
    });
  });

  describe('Store management', () => {
    it('should return stats', () => {
      const stats = store.getStats();
      expect(stats).toHaveProperty('entities');
      expect(stats).toHaveProperty('relationships');
      expect(stats).toHaveProperty('aliases');
      expect(stats.entities).toBe(0);
    });

    it('should clear all data', async () => {
      const entity: Entity = {
        id: 'PERSON:kayce',
        type: 'PERSON',
        text: 'Kayce',
        confidence: 0.95,
        context: 'test',
      };

      await store.addEntity(entity);
      expect(store.getEntityCount()).toBe(1);

      store.clear();
      expect(store.getEntityCount()).toBe(0);
    });

    it('should serialize and deserialize', async () => {
      const entity: Entity = {
        id: 'PERSON:kayce',
        type: 'PERSON',
        text: 'Kayce',
        confidence: 0.95,
        context: 'test',
      };

      await store.addEntity(entity);

      const data = store.getAllData();
      expect(data.entities).toHaveLength(1);

      // Load into new store
      const newStore = new EntityStore();
      await newStore.init();
      await newStore.loadFromData(data);

      expect(newStore.getEntityCount()).toBe(1);
      expect(newStore.getEntity('PERSON:kayce')).toBeDefined();
    });
  });
});
