/**
 * @file SemanticMemory Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityStore } from '../src/core/knowledge/entity-store.js';
import { GraphQuery } from '../src/core/knowledge/graph-query.js';
import { SemanticMemory } from '../src/core/knowledge/semantic-memory.js';
import { Entity, EntityType, RelationType } from '../src/core/knowledge/entity-extractor.js';

describe('SemanticMemory', () => {
  let store: EntityStore;
  let query: GraphQuery;
  let memory: SemanticMemory;

  beforeEach(async () => {
    store = new EntityStore();
    await store.init();
    query = new GraphQuery(store);
    await query.init();
    memory = new SemanticMemory(store, query);
    await memory.init();
  });

  describe('User context retrieval', () => {
    beforeEach(async () => {
      // Create test data
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
        { id: 'CONCEPT:engineer', type: 'CONCEPT', text: 'Engineer', confidence: 0.9, context: 'test' },
        { id: 'PREFERENCE:voice', type: 'PREFERENCE', text: 'Voice Control', confidence: 0.85, context: 'test' },
      ];

      await store.addEntities(entities, 'user-123');

      // Add relationships
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

    it('should get user context', async () => {
      const result = await memory.getUserContext('user-123', 10);
      expect(result.contexts).toBeDefined();
      expect(result.contexts.length).toBeGreaterThanOrEqual(1);
      expect(result.totalEntities).toBeGreaterThanOrEqual(1);
    });

    it('should return empty context for unknown user', async () => {
      const result = await memory.getUserContext('unknown-user', 10);
      expect(result.contexts).toHaveLength(0);
      expect(result.totalEntities).toBe(0);
    });

    it('should respect topK limit', async () => {
      const result = await memory.getUserContext('user-123', 2);
      expect(result.contexts.length).toBeLessThanOrEqual(2);
    });

    it('should score contexts by relevance', async () => {
      const result = await memory.getUserContext('user-123', 10);
      
      if (result.contexts.length > 1) {
        // Check that scores are bounded 0-1
        for (const ctx of result.contexts) {
          expect(ctx.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(ctx.relevanceScore).toBeLessThanOrEqual(1);
        }

        // Check that scores are sorted descending
        for (let i = 0; i < result.contexts.length - 1; i++) {
          expect(result.contexts[i].relevanceScore).toBeGreaterThanOrEqual(
            result.contexts[i + 1].relevanceScore
          );
        }
      }
    });
  });

  describe('Entity full context', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
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
        context: 'test',
      });
    });

    it('should get entity full context', async () => {
      const ctx = await memory.getEntityFullContext('PERSON:kayce');
      expect(ctx).not.toBeNull();
      expect(ctx!.entity).toBeDefined();
      expect(ctx!.entity.text).toBe('Kayce');
      expect(ctx!.relationships).toBeGreaterThanOrEqual(1);
    });

    it('should return null for non-existent entity', async () => {
      const ctx = await memory.getEntityFullContext('NONEXISTENT');
      expect(ctx).toBeNull();
    });

    it('should include neighbor count', async () => {
      const ctx = await memory.getEntityFullContext('PERSON:kayce');
      expect(ctx).not.toBeNull();
      expect(ctx!.neighbors).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Relevant entities finding', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PREFERENCE:voice', type: 'PREFERENCE', text: 'Voice Control', confidence: 0.95, context: 'test' },
        { id: 'PREFERENCE:app', type: 'PREFERENCE', text: 'App Control', confidence: 0.9, context: 'test' },
        { id: 'PREFERENCE:gesture', type: 'PREFERENCE', text: 'Gesture Control', confidence: 0.85, context: 'test' },
        { id: 'CONCEPT:smart', type: 'CONCEPT', text: 'Smart Home', confidence: 0.9, context: 'test' },
      ];

      await store.addEntities(entities, 'user-456');
    });

    it('should find relevant entities by type', async () => {
      const results = await memory.findRelevantEntities('user-456', 'PREFERENCE', 5);
      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      for (const ctx of results) {
        expect(ctx.entity.type).toBe('PREFERENCE');
      }
    });

    it('should return empty for unknown user', async () => {
      const results = await memory.findRelevantEntities('unknown', 'PREFERENCE', 5);
      expect(results).toHaveLength(0);
    });

    it('should respect topK limit', async () => {
      const results = await memory.findRelevantEntities('user-456', 'PREFERENCE', 2);
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should include relevance scores', async () => {
      const results = await memory.findRelevantEntities('user-456', 'PREFERENCE', 5);
      
      for (const ctx of results) {
        expect(ctx.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(ctx.relevanceScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Context window assembly', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
        { id: 'CONCEPT:engineer', type: 'CONCEPT', text: 'Engineer', confidence: 0.9, context: 'test' },
      ];

      await store.addEntities(entities, 'user-789');
    });

    it('should assemble context window', async () => {
      const window = await memory.assembleContextWindow('user-789', 'session-1', 1000);
      expect(typeof window).toBe('string');
    });

    it('should return empty context for unknown user', async () => {
      const window = await memory.assembleContextWindow('unknown', 'session-1', 1000);
      expect(window).toBe('');
    });

    it('should include known context header', async () => {
      const window = await memory.assembleContextWindow('user-789', 'session-1', 1000);
      if (window.length > 0) {
        expect(window).toContain('Known Context');
      }
    });

    it('should respect maxTokens limit', async () => {
      const window = await memory.assembleContextWindow('user-789', 'session-1', 100);
      // Rough check: 100 tokens ≈ 400 characters
      expect(window.length).toBeLessThanOrEqual(500); // some margin
    });
  });

  describe('Relationship context', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PERSON:tor', type: 'PERSON', text: 'Tor', confidence: 0.9, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
      ];

      await store.addEntities(entities);

      const a = store.getEntity('PERSON:kayce')!;
      const b = store.getEntity('PERSON:tor')!;
      const c = store.getEntity('PLACE:hanoi')!;

      await store.addRelationship({
        entityA: { id: a.id, type: a.type as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'KNOWS' as RelationType,
        entityB: { id: b.id, type: b.type as EntityType, text: b.text, confidence: b.confidence, context: b.context },
        confidence: 0.9,
        context: 'test',
      });

      await store.addRelationship({
        entityA: { id: a.id, type: a.type as EntityType, text: a.text, confidence: a.confidence, context: a.context },
        relation: 'LOCATED_IN' as RelationType,
        entityB: { id: c.id, type: c.type as EntityType, text: c.text, confidence: c.confidence, context: c.context },
        confidence: 0.9,
        context: 'test',
      });
    });

    it('should get relationship context', async () => {
      const ctx = await memory.getRelationshipContext('PERSON:kayce');
      expect(typeof ctx).toBe('string');
      expect(ctx.length).toBeGreaterThan(0);
    });

    it('should return empty context for non-existent entity', async () => {
      const ctx = await memory.getRelationshipContext('NONEXISTENT');
      expect(ctx).toBe('');
    });

    it('should include relationship information', async () => {
      const ctx = await memory.getRelationshipContext('PERSON:kayce');
      if (ctx.length > 0) {
        expect(ctx).toContain('Relationship');
      }
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      const entities: Entity[] = [
        { id: 'PERSON:kayce', type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
        { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
      ];
      await store.addEntities(entities);
    });

    it('should return statistics', () => {
      const stats = memory.getStats();
      expect(stats.entityCount).toBeGreaterThanOrEqual(2);
      expect(stats.relationshipCount).toBeGreaterThanOrEqual(0);
      expect(stats.avgConnectionsPerEntity).toBeGreaterThanOrEqual(0);
      expect(stats.typeDistribution).toBeDefined();
    });

    it('should include type distribution', () => {
      const stats = memory.getStats();
      expect(stats.typeDistribution.PERSON).toBeGreaterThanOrEqual(1);
      expect(stats.typeDistribution.PLACE).toBeGreaterThanOrEqual(1);
    });

    it('should get summary', () => {
      const summary = memory.getSummary();
      expect(summary).toContain('SemanticMemory');
      expect(summary).toContain('Entities');
      expect(summary).toContain('Relationships');
    });
  });

  describe('Error resilience', () => {
    it('should handle errors gracefully', async () => {
      // These should not throw, just return empty/default
      const ctx = await memory.getUserContext('user-unknown', 10);
      expect(ctx).toBeDefined();

      const entityCtx = await memory.getEntityFullContext('NONEXISTENT');
      expect(entityCtx).toBeNull();

      const relevant = await memory.findRelevantEntities('user-unknown', 'PERSON', 10);
      expect(relevant).toEqual([]);

      const window = await memory.assembleContextWindow('user-unknown', 'session-1', 1000);
      expect(window).toBe('');

      const relCtx = await memory.getRelationshipContext('NONEXISTENT');
      expect(relCtx).toBe('');
    });
  });
});
