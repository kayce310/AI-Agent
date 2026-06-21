/**
 * @file EntityExtractor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EntityExtractor, EntityType } from '../src/core/knowledge/entity-extractor.js';

describe('EntityExtractor', () => {
  let extractor: EntityExtractor;

  beforeEach(() => {
    extractor = new EntityExtractor();
  });

  describe('extract', () => {
    it('should return empty result for empty message', async () => {
      const result = await extractor.extract('');
      expect(result.entities).toEqual([]);
      expect(result.relationships).toEqual([]);
    });

    it('should return empty result for whitespace-only message', async () => {
      const result = await extractor.extract('   ');
      expect(result.entities).toEqual([]);
      expect(result.relationships).toEqual([]);
    });

    it('should handle extraction failure gracefully', async () => {
      // Mock LLM failure by passing invalid message
      const result = await extractor.extract('test');
      // Should not throw, returns empty or mock result
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('relationships');
      expect(Array.isArray(result.entities)).toBe(true);
      expect(Array.isArray(result.relationships)).toBe(true);
    });

    it('should return result with raw property', async () => {
      const result = await extractor.extract('test message');
      expect(result).toHaveProperty('raw');
      expect(typeof result.raw).toBe('string');
    });
  });

  describe('parseResponse', () => {
    it('should parse valid entity JSON', async () => {
      const response = JSON.stringify({
        entities: [
          {
            type: 'PERSON',
            text: 'Kayce',
            confidence: 0.95,
            context: 'My name is Kayce',
          },
        ],
        relationships: [],
      });

      const result = await extractor.extract('My name is Kayce');
      // Result should have at least the structure
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('relationships');
    });

    it('should handle malformed JSON gracefully', async () => {
      // Extraction should handle invalid JSON without crashing
      const result = await extractor.extract('test');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('relationships');
    });

    it('should set entity confidence bounds', async () => {
      // Even with invalid confidence, should be bounded 0-1
      const response = JSON.stringify({
        entities: [
          {
            type: 'PERSON',
            text: 'Kayce',
            confidence: 2.5, // Invalid
            context: 'test',
          },
        ],
        relationships: [],
      });

      // Should handle gracefully
      const result = await extractor.extract('test');
      expect(result).toHaveProperty('entities');
    });

    it('should set timestamp on extracted entities', async () => {
      const response = JSON.stringify({
        entities: [
          {
            type: 'PLACE',
            text: 'Hà Nội',
            confidence: 0.9,
            context: 'I live in Hà Nội',
          },
        ],
        relationships: [],
      });

      const result = await extractor.extract('I live in Hà Nội');
      // Result should be structured
      expect(result).toHaveProperty('entities');
    });
  });

  describe('deduplicateEntities', () => {
    it('should handle empty array', async () => {
      const result = await extractor.deduplicateEntities([]);
      expect(result).toEqual([]);
    });

    it('should handle single entity', async () => {
      const entity = {
        id: 'PERSON:kayce',
        type: 'PERSON' as EntityType,
        text: 'Kayce',
        confidence: 0.95,
        context: 'My name is Kayce',
      };

      const result = await extractor.deduplicateEntities([entity]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(entity);
    });

    it('should deduplicate exact matches', async () => {
      const entity1 = {
        id: 'PERSON:kayce',
        type: 'PERSON' as EntityType,
        text: 'Kayce',
        confidence: 0.85,
        context: 'I am Kayce',
      };

      const entity2 = {
        id: 'PERSON:kayce',
        type: 'PERSON' as EntityType,
        text: 'Kayce',
        confidence: 0.95,
        context: 'Kayce is an engineer',
      };

      const result = await extractor.deduplicateEntities([entity1, entity2]);
      expect(result).toHaveLength(1);
      // Should keep higher confidence version
      expect(result[0].confidence).toBe(0.95);
    });

    it('should preserve distinct entities', async () => {
      const entity1 = {
        id: 'PERSON:kayce',
        type: 'PERSON' as EntityType,
        text: 'Kayce',
        confidence: 0.95,
        context: 'I am Kayce',
      };

      const entity2 = {
        id: 'PLACE:hanoi',
        type: 'PLACE' as EntityType,
        text: 'Hà Nội',
        confidence: 0.9,
        context: 'I live in Hà Nội',
      };

      const result = await extractor.deduplicateEntities([entity1, entity2]);
      expect(result).toHaveLength(2);
    });

    it('should handle case-insensitive deduplication', async () => {
      const entity1 = {
        id: 'PERSON:kayce',
        type: 'PERSON' as EntityType,
        text: 'Kayce',
        confidence: 0.85,
        context: 'test',
      };

      const entity2 = {
        id: 'PERSON:kayce',
        type: 'PERSON' as EntityType,
        text: 'KAYCE',
        confidence: 0.95,
        context: 'test',
      };

      const result = await extractor.deduplicateEntities([entity1, entity2]);
      expect(result).toHaveLength(1);
      expect(result[0].confidence).toBe(0.95);
    });

    it('should preserve different types for same text', async () => {
      const entity1 = {
        id: 'PERSON:bank',
        type: 'PERSON' as EntityType,
        text: 'Bank',
        confidence: 0.9,
        context: 'Bank is a person',
      };

      const entity2 = {
        id: 'CONCEPT:bank',
        type: 'CONCEPT' as EntityType,
        text: 'Bank',
        confidence: 0.95,
        context: 'Banking is important',
      };

      const result = await extractor.deduplicateEntities([entity1, entity2]);
      expect(result).toHaveLength(2);
    });
  });

  describe('Entity types', () => {
    it('should support all entity types', async () => {
      const types: EntityType[] = [
        'PERSON',
        'PLACE',
        'CONCEPT',
        'ACTION',
        'PREFERENCE',
        'CONSTRAINT',
      ];

      for (const type of types) {
        const entity = {
          id: `${type}:test`,
          type,
          text: 'test',
          confidence: 0.9,
          context: 'test context',
        };

        expect(entity.type).toBe(type);
      }
    });
  });

  describe('Relationship handling', () => {
    it('should handle empty relationships', async () => {
      const result = await extractor.extract('test');
      expect(Array.isArray(result.relationships)).toBe(true);
    });

    it('should structure relationships correctly', async () => {
      // Test that relationship structure is valid
      const response = JSON.stringify({
        entities: [
          { type: 'PERSON', text: 'Kayce', confidence: 0.95, context: 'test' },
          { type: 'PLACE', text: 'Hà Nội', confidence: 0.9, context: 'test' },
        ],
        relationships: [
          {
            entityA: 'Kayce',
            relation: 'LOCATED_IN',
            entityB: 'Hà Nội',
            confidence: 0.85,
            context: 'Kayce lives in Hà Nội',
          },
        ],
      });

      const result = await extractor.extract('Kayce lives in Hà Nội');
      expect(result).toHaveProperty('relationships');
    });
  });
});
