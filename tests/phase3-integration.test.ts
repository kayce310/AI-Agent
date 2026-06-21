/**
 * @file Phase 3 Integration Tests — End-to-end entity extraction → store → query → context
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityStore } from '../src/core/knowledge/entity-store.js';
import { GraphQuery } from '../src/core/knowledge/graph-query.js';
import { SemanticMemory } from '../src/core/knowledge/semantic-memory.js';
import { EntityExtractor, EntityType, RelationType } from '../src/core/knowledge/entity-extractor.js';

/**
 * Simulated entity extraction (since real LLM call is mocked)
 */
function simulateExtraction(message: string): { entities: any[]; relationships: any[] } {
  const entities: any[] = [];
  const relationships: any[] = [];

  // Simple keyword-based extraction for testing
  if (message.toLowerCase().includes('kayce') || message.toLowerCase().includes('tôi')) {
    entities.push({
      id: 'PERSON:user',
      type: 'PERSON',
      text: 'User',
      confidence: 0.95,
      context: message,
    });
  }

  if (message.includes('Hà Nội') || message.includes('Sài Gòn')) {
    entities.push({
      id: 'PLACE:' + (message.includes('Hà Nội') ? 'hanoi' : 'saigon'),
      type: 'PLACE',
      text: message.includes('Hà Nội') ? 'Hà Nội' : 'Sài Gòn',
      confidence: 0.9,
      context: message,
    });
  }

  if (message.toLowerCase().includes('engineer') || message.toLowerCase().includes('kỹ sư')) {
    entities.push({
      id: 'CONCEPT:engineer',
      type: 'CONCEPT',
      text: 'Engineer',
      confidence: 0.9,
      context: message,
    });
  }

  if (message.toLowerCase().includes('voice') || message.toLowerCase().includes('giọng nói')) {
    entities.push({
      id: 'PREFERENCE:voice',
      type: 'PREFERENCE',
      text: 'Voice Control',
      confidence: 0.85,
      context: message,
    });
  }

  // Infer relationships from co-mentions
  for (const a of entities) {
    for (const b of entities) {
      if (a === b) continue;
      if (a.type === 'PERSON' && b.type === 'PLACE') {
        relationships.push({ entityA: a.text, relation: 'LOCATED_IN', entityB: b.text, confidence: 0.85, context: message });
      }
      if (a.type === 'PERSON' && b.type === 'CONCEPT') {
        relationships.push({ entityA: a.text, relation: 'ROLE', entityB: b.text, confidence: 0.85, context: message });
      }
      if (a.type === 'PERSON' && b.type === 'PREFERENCE') {
        relationships.push({ entityA: a.text, relation: 'PREFERS', entityB: b.text, confidence: 0.8, context: message });
      }
    }
  }

  return { entities, relationships };
}

describe('Phase 3 Integration: Knowledge Graph End-to-End', () => {
  let store: EntityStore;
  let query: GraphQuery;
  let memory: SemanticMemory;
  let extractor: EntityExtractor;

  const userId = 'test-user-001';

  beforeEach(async () => {
    store = new EntityStore();
    await store.init();
    query = new GraphQuery(store);
    await query.init();
    memory = new SemanticMemory(store, query);
    await memory.init();
    extractor = new EntityExtractor();
  });

  it('1. should extract and store entities from message', async () => {
    const message = 'Tôi là Kayce, kỹ sư ở Hà Nội. Tôi muốn điều khiển bằng giọng nói.';

    // Simulate extraction
    const { entities, relationships } = simulateExtraction(message);

    // Convert to Entity objects
    const entityObjs = entities.map((e: any) => ({
      id: e.id,
      type: e.type as EntityType,
      text: e.text,
      confidence: e.confidence,
      context: e.context,
    }));

    // Store
    const records = await store.addEntities(entityObjs, userId);
    expect(records.length).toBeGreaterThanOrEqual(3); // PERSON, PLACE, CONCEPT, PREFERENCE
    expect(store.getEntityCount()).toBeGreaterThanOrEqual(3);

    // Verify
    const person = store.queryEntities({ userId, type: 'PERSON' });
    expect(person.length).toBeGreaterThanOrEqual(1);
    expect(person[0].text).toBe('User');
  });

  it('2. should extract and store relationships from co-mentions', async () => {
    const message = 'Tôi là Kayce, kỹ sư ở Hà Nội.';

    // Extract
    const { entities, relationships } = simulateExtraction(message);

    // Store entities first
    const entityObjs = entities.map((e: any) => ({
      id: e.id,
      type: e.type as EntityType,
      text: e.text,
      confidence: e.confidence,
      context: e.context,
    }));
    await store.addEntities(entityObjs, userId);

    // Store relationships
    let relCount = 0;
    for (const rel of relationships) {
      const entityA = store.queryEntities({ text: rel.entityA })[0];
      const entityB = store.queryEntities({ text: rel.entityB })[0];

      if (entityA && entityB) {
        await store.addRelationship({
          entityA: { id: entityA.id, type: entityA.type as EntityType, text: entityA.text, confidence: entityA.confidence, context: entityA.context },
          relation: rel.relation as RelationType,
          entityB: { id: entityB.id, type: entityB.type as EntityType, text: entityB.text, confidence: entityB.confidence, context: entityB.context },
          confidence: rel.confidence,
          context: rel.context,
        } as any);
        relCount++;
      }
    }

    expect(relCount).toBeGreaterThanOrEqual(1);
    expect(store.getRelationshipCount()).toBeGreaterThanOrEqual(1);
  });

  it('3. should query entity graph by type', async () => {
    // Setup: simulate multiple messages
    const messages = [
      'Tôi là kỹ sư ở Hà Nội',
      'Tôi thích điều khiển bằng giọng nói',
    ];

    for (const msg of messages) {
      const { entities } = simulateExtraction(msg);
      const entityObjs = entities.map((e: any) => ({
        id: e.id,
        type: e.type as EntityType,
        text: e.text,
        confidence: e.confidence,
        context: e.context,
      }));
      await store.addEntities(entityObjs, userId);
    }

    // Query
    const persons = query.findEntitiesByType('PERSON');
    expect(persons.length).toBeGreaterThanOrEqual(1);

    const places = query.findEntitiesByType('PLACE');
    expect(places.length).toBeGreaterThanOrEqual(1);

    const preferences = query.findEntitiesByType('PREFERENCE');
    expect(preferences.length).toBeGreaterThanOrEqual(1);
  });

  it('4. should find relationships between entities', async () => {
    // Setup
    await store.addEntities([
      { id: 'PERSON:user', type: 'PERSON', text: 'User', confidence: 0.95, context: 'test' },
      { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
    ], userId);

    const a = store.getEntity('PERSON:user')!;
    const b = store.getEntity('PLACE:hanoi')!;

    await store.addRelationship({
      entityA: { id: a.id, type: a.type as EntityType, text: a.text, confidence: a.confidence, context: a.context },
      relation: 'LOCATED_IN' as RelationType,
      entityB: { id: b.id, type: b.type as EntityType, text: b.text, confidence: b.confidence, context: b.context },
      confidence: 0.9,
      context: 'User ở Hà Nội',
    });

    // Query
    const rels = store.queryRelationships({ entityId: 'PERSON:user' });
    expect(rels).toHaveLength(1);
    expect(rels[0].relation).toBe('LOCATED_IN');
    expect(rels[0].entityB_id).toBe('PLACE:hanoi');
  });

  it('5. should retrieve semantic context for user', async () => {
    // Setup: build knowledge graph
    const msg1 = 'Tôi là kỹ sư ở Hà Nội';
    const msg2 = 'Tôi thích điều khiển bằng giọng nói';

    for (const msg of [msg1, msg2]) {
      const { entities, relationships } = simulateExtraction(msg);
      const entityObjs = entities.map((e: any) => ({
        id: e.id,
        type: e.type as EntityType,
        text: e.text,
        confidence: e.confidence,
        context: e.context,
      }));
      await store.addEntities(entityObjs, userId);

      for (const rel of relationships) {
        const entityA = store.queryEntities({ text: rel.entityA })[0];
        const entityB = store.queryEntities({ text: rel.entityB })[0];
        if (entityA && entityB) {
          try {
            await store.addRelationship({
              entityA: { id: entityA.id, type: entityA.type as EntityType, text: entityA.text, confidence: entityA.confidence, context: entityA.context },
              relation: rel.relation as RelationType,
              entityB: { id: entityB.id, type: entityB.type as EntityType, text: entityB.text, confidence: entityB.confidence, context: entityB.context },
              confidence: rel.confidence,
              context: rel.context,
            } as any);
          } catch {}
        }
      }
    }

    // Retrieve semantic context
    const context = await memory.getUserContext(userId, 10);
    expect(context.contexts.length).toBeGreaterThan(0);
    expect(context.totalEntities).toBeGreaterThan(0);

    // Check that context includes relevance scores
    for (const ctx of context.contexts) {
      expect(ctx.relevanceScore).toBeGreaterThan(0);
      expect(ctx.relevanceScore).toBeLessThanOrEqual(1);
    }
  });

  it('6. should assemble context window for agent', async () => {
    const msg1 = 'Tôi là kỹ sư ở Hà Nội';
    const { entities, relationships } = simulateExtraction(msg1);
    const entityObjs = entities.map((e: any) => ({
      id: e.id,
      type: e.type as EntityType,
      text: e.text,
      confidence: e.confidence,
      context: e.context,
    }));
    await store.addEntities(entityObjs, userId);

    const window = await memory.assembleContextWindow(userId, 'session-1', 1000);
    expect(typeof window).toBe('string');
    expect(window).toContain('Known Context');
  });

  it('7. should find shortest path between entities', async () => {
    // Build chain: User -> Hà Nội -> Engineer
    const entities = [
      { id: 'PERSON:user', type: 'PERSON' as EntityType, text: 'User', confidence: 0.95, context: 'test' },
      { id: 'PLACE:hanoi', type: 'PLACE' as EntityType, text: 'Hà Nội', confidence: 0.9, context: 'test' },
      { id: 'CONCEPT:engineer', type: 'CONCEPT' as EntityType, text: 'Engineer', confidence: 0.9, context: 'test' },
    ];

    await store.addEntities(entities, userId);

    const a = store.getEntity('PERSON:user')!;
    const b = store.getEntity('PLACE:hanoi')!;
    const c = store.getEntity('CONCEPT:engineer')!;

    // User -> Hà Nội
    await store.addRelationship({
      entityA: { id: a.id, type: a.type, text: a.text, confidence: a.confidence, context: a.context },
      relation: 'LOCATED_IN' as RelationType,
      entityB: { id: b.id, type: b.type, text: b.text, confidence: b.confidence, context: b.context },
      confidence: 0.9,
      context: 'test',
    });

    // Hà Nội -> Engineer
    await store.addRelationship({
      entityA: { id: b.id, type: b.type, text: b.text, confidence: b.confidence, context: b.context },
      relation: 'LOCATED_IN' as RelationType,
      entityB: { id: c.id, type: c.type, text: c.text, confidence: c.confidence, context: c.context },
      confidence: 0.5,
      context: 'test',
    });

    const path = query.findShortestPath('PERSON:user', 'CONCEPT:engineer');
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });

  it('8. should handle cross-session entity accumulation', async () => {
    // Session 1 message
    const msg1 = 'Tôi là kỹ sư ở Hà Nội';
    const { entities: e1 } = simulateExtraction(msg1);
    await store.addEntities(
      e1.map((e: any) => ({ id: e.id, type: e.type as EntityType, text: e.text, confidence: e.confidence, context: e.context })),
      userId
    );

    // Session 2 message (later)
    await new Promise(resolve => setTimeout(resolve, 10));

    const msg2 = 'Tôi thích điều khiển bằng giọng nói cho đèn phòng khách';
    const { entities: e2 } = simulateExtraction(msg2);
    await store.addEntities(
      e2.map((e: any) => ({ id: e.id, type: e.type as EntityType, text: e.text, confidence: e.confidence, context: e.context })),
      userId
    );

    // Verify cross-session accumulation
    const allEntities = store.queryEntities({ userId });
    expect(allEntities.length).toBeGreaterThanOrEqual(4); // Multiple sessions' entities

    // Entities should have mention counts reflecting cross-session usage
    const userEntity = store.queryEntities({ userId, type: 'PERSON' })[0];
    expect(userEntity).toBeDefined();
    expect(userEntity!.mentionCount).toBe(2); // Mentioned in both messages
  });

  it('9. should handle empty user gracefully', async () => {
    const context = await memory.getUserContext('nonexistent-user');
    expect(context.contexts).toEqual([]);
    expect(context.totalEntities).toBe(0);

    const window = await memory.assembleContextWindow('nonexistent-user', 'session-1');
    expect(window).toBe('');
  });

  it('10. should maintain data integrity across operations', async () => {
    // Add entities
    await store.addEntities([
      { id: 'PERSON:a', type: 'PERSON', text: 'A', confidence: 0.9, context: 'test' },
      { id: 'PERSON:b', type: 'PERSON', text: 'B', confidence: 0.9, context: 'test' },
    ]);

    // Delete one
    store.deleteEntity('PERSON:a');

    // Verify remaining
    expect(store.getEntityCount()).toBe(1);
    expect(store.getEntity('PERSON:b')).toBeDefined();
  });

  it('11. should serialize and restore knowledge graph', async () => {
    // Build data
    const entities: any[] = [
      { id: 'PERSON:user', type: 'PERSON', text: 'User', confidence: 0.95, context: 'test' },
      { id: 'PLACE:hanoi', type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
    ];

    await store.addEntities(entities, userId);

    const a = store.getEntity('PERSON:user')!;
    const b = store.getEntity('PLACE:hanoi')!;

    await store.addRelationship({
      entityA: { id: a.id, type: a.type as EntityType, text: a.text, confidence: a.confidence, context: a.context },
      relation: 'LOCATED_IN' as RelationType,
      entityB: { id: b.id, type: b.type as EntityType, text: b.text, confidence: b.confidence, context: b.context },
      confidence: 0.9,
      context: 'test',
    });

    // Serialize
    const data = store.getAllData();

    // Restore into new store
    const newStore = new EntityStore();
    await newStore.init();
    await newStore.loadFromData(data);

    // Verify
    expect(newStore.getEntityCount()).toBe(2);
    expect(newStore.getRelationshipCount()).toBe(1);
    expect(newStore.getEntity('PERSON:user')?.text).toBe('User');
  });

  it('12. should support alias resolution', async () => {
    await store.addEntity({ id: 'PERSON:nicholas', type: 'PERSON', text: 'Nicholas', confidence: 0.95, context: 'test' });
    await store.addAlias('PERSON:nicholas', 'Nick');

    const resolved = store.resolveAlias('Nick');
    expect(resolved).toBeDefined();
    expect(resolved!.text).toBe('Nicholas');
  });
});
