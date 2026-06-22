/**
 * @file EntityExtractor — Extract entities and relationships from messages
 * @layer core
 * @created 2026-06-21
 *
 * Responsibility:
 * - Parse user messages with LLM
 * - Extract typed entities (PERSON, PLACE, CONCEPT, ACTION, PREFERENCE, CONSTRAINT)
 * - Infer relationships from co-mentions
 * - Return confidence scores for each extraction
 *
 * Design: Non-blocking (graceful fallback if extraction fails)
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'EntityExtractor' });

export type EntityType = 'PERSON' | 'PLACE' | 'CONCEPT' | 'ACTION' | 'PREFERENCE' | 'CONSTRAINT';
export type RelationType = 'KNOWS' | 'LOCATED_IN' | 'ROLE' | 'PREFERS' | 'CAUSES' | 'CONSTRAINS';

export interface Entity {
  id: string; // UUID or hash of (type, text)
  type: EntityType;
  text: string;
  confidence: number; // 0-1
  context: string; // Original sentence containing entity
  timestamp?: number;
}

export interface Relationship {
  entityA: Entity;
  relation: RelationType;
  entityB: Entity;
  confidence: number; // 0-1
  context: string; // Sentence supporting relationship
}

export interface ExtractionResult {
  entities: Entity[];
  relationships: Relationship[];
  raw: string; // Raw LLM response for debugging
}

/**
 * EntityExtractor: Parse messages → structured entities + relationships
 */
export class EntityExtractor {
  private modelName: string = 'gpt-4-turbo'; // Fast + reliable for structured extraction

  constructor() {}

  /**
   * Extract entities and relationships from a user message
   * Returns empty result if extraction fails (non-blocking)
   */
  async extract(message: string): Promise<ExtractionResult> {
    if (!message || message.trim().length === 0) {
      return { entities: [], relationships: [], raw: '' };
    }

    try {
      const result = await this.callLLM(message);
      const { entities, relationships } = this.parseResponse(result);

      return {
        entities,
        relationships,
        raw: result,
      };
    } catch (error: any) {
      log.warn('Entity extraction failed (non-blocking):', error);
      // Graceful fallback: return empty result, don't crash
      return { entities: [], relationships: [], raw: '' };
    }
  }

  /**
   * Call LLM with structured extraction prompt
   */
  private async callLLM(message: string): Promise<string> {
    const prompt = `Extract entities and relationships from this user message.

Message: "${message}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "entities": [
    {"type": "PERSON|PLACE|CONCEPT|ACTION|PREFERENCE|CONSTRAINT", "text": "...", "confidence": 0.0-1.0, "context": "...sentence..."},
    ...
  ],
  "relationships": [
    {"entityA": "text1", "relation": "KNOWS|LOCATED_IN|ROLE|PREFERS|CAUSES|CONSTRAINS", "entityB": "text2", "confidence": 0.0-1.0, "context": "..."},
    ...
  ]
}

Rules:
- Extract all entity mentions with confidence 0.7+ only
- Infer relationships from co-mentions (e.g., "I am an engineer in Hà Nội" → PERSON "I", ROLE "engineer", PLACE "Hà Nội", relationships: I [ROLE] engineer, I [LOCATED_IN] Hà Nội)
- Keep context as original sentence snippet
- Be conservative: only extract high-confidence entities (0.7+)
- Return empty arrays if no entities found`;

    // TODO: Implement actual LLM call via provider registry
    // For now, return mock for testing
    return JSON.stringify({
      entities: [],
      relationships: [],
    });
  }

  /**
   * Parse LLM response into typed entities and relationships
   */
  private parseResponse(response: string): { entities: Entity[]; relationships: Relationship[] } {
    try {
      const parsed = JSON.parse(response);

      // Parse entities
      const entities: Entity[] = (parsed.entities || []).map((e: any) => ({
        id: this.generateEntityId(e.type, e.text),
        type: e.type as EntityType,
        text: e.text,
        confidence: Math.max(0, Math.min(1, e.confidence || 0.5)),
        context: e.context || '',
        timestamp: Date.now(),
      }));

      // Parse relationships
      const relationships: Relationship[] = (parsed.relationships || [])
        .map((r: any) => {
          const entityA = entities.find(e => e.text === r.entityA);
          const entityB = entities.find(e => e.text === r.entityB);

          if (!entityA || !entityB) return null;

          return {
            entityA,
            relation: r.relation as RelationType,
            entityB,
            confidence: Math.max(0, Math.min(1, r.confidence || 0.5)),
            context: r.context || '',
          };
        })
        .filter((r: any): r is Relationship => r !== null);

      return { entities, relationships };
    } catch (error) {
      log.warn('Failed to parse extraction response:', error);
      return { entities: [], relationships: [] } as any;
    }
  }

  /**
   * Generate stable ID for entity (type:text hash)
   * Used for deduplication
   */
  private generateEntityId(type: EntityType, text: string): string {
    // Simple hash: type:normalized_text
    const normalized = text.toLowerCase().trim();
    return `${type}:${normalized}`;
  }

  /**
   * Deduplicate entities by text similarity
   * Merges entities with similar names (e.g., "Kayce" + "Kayce Nguyễn")
   */
  async deduplicateEntities(entities: Entity[]): Promise<Entity[]> {
    if (entities.length <= 1) return entities;

    // For now, simple exact-match dedup
    // TODO: Implement fuzzy matching for similar names
    const seen = new Map<string, Entity>();

    for (const entity of entities) {
      const key = `${entity.type}:${entity.text.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, entity);
      } else {
        // Keep higher confidence version
        const existing = seen.get(key)!;
        if (entity.confidence > existing.confidence) {
          seen.set(key, entity);
        }
      }
    }

    return Array.from(seen.values());
  }
}

/**
 * Singleton instance
 */
let extractorInstance: EntityExtractor | null = null;

export function getEntityExtractor(): EntityExtractor {
  if (!extractorInstance) {
    extractorInstance = new EntityExtractor();
  }
  return extractorInstance;
}
