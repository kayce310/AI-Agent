/**
 * @file MemoryAPI — REST endpoints for memory system
 * @layer core/memory
 * @created 2026-06-21
 */

import { MemoryStore } from './MemoryStore.js';
import { MemorySearch } from './MemorySearch.js';
import { MemoryQuery, MemoryType } from './MemoryItem.js';

export interface MemoryApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class MemoryAPI {
  private store: MemoryStore;
  private search: MemorySearch;

  constructor(store: MemoryStore) {
    this.store = store;
    this.search = new MemorySearch();
  }

  // GET /api/memory/list
  list(url: string): MemoryApiResponse {
    try {
      const query = this.parseQuery(url);
      const allItems = this.store.getAll();
      const result = this.search.search(allItems, query);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // GET /api/memory/:id
  get(id: string): MemoryApiResponse {
    try {
      if (!id) return { success: false, error: 'Missing memory ID' };
      const item = this.store.getMemory(id);
      if (!item) return { success: false, error: 'Memory not found' };
      // Get linked memories
      const allItems = this.store.getAll();
      const linked = this.search.getLinked(allItems, id, 1);
      return {
        success: true,
        data: {
          memory: item,
          linked: Array.from(linked.values()).filter(m => m.id !== id),
        },
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // POST /api/memory (body: JSON)
  create(body: string): MemoryApiResponse {
    try {
      const data = JSON.parse(body);
      if (!data.content || !data.type) {
        return { success: false, error: 'Missing required fields: content, type' };
      }
      if (!['fact', 'belief', 'preference', 'skill', 'summary'].includes(data.type)) {
        return { success: false, error: 'Invalid type' };
      }
      const item = this.store.addMemory({
        content: data.content,
        type: data.type,
        source: data.source || { taskId: 'manual' },
        confidence: data.confidence,
        importance: data.importance,
        tags: data.tags,
      });
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // PATCH /api/memory/:id (body: JSON)
  update(id: string, body: string): MemoryApiResponse {
    try {
      const data = JSON.parse(body);
      const item = this.store.updateMemory(id, data);
      if (!item) return { success: false, error: 'Memory not found' };
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // DELETE /api/memory/:id
  delete(id: string): MemoryApiResponse {
    try {
      const result = this.store.deleteMemory(id);
      return { success: result, data: { deleted: result } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // POST /api/memory/:id/pin
  pin(id: string): MemoryApiResponse {
    try {
      const item = this.store.pinMemory(id);
      if (!item) return { success: false, error: 'Memory not found' };
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // POST /api/memory/:id/unpin
  unpin(id: string): MemoryApiResponse {
    try {
      const item = this.store.unpinMemory(id);
      if (!item) return { success: false, error: 'Memory not found' };
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // POST /api/memory/:id/forget
  forget(id: string): MemoryApiResponse {
    try {
      const result = this.store.forgetMemory(id);
      return { success: result, data: { deleted: result } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // POST /api/memory/:id/promote (body: { type: 'skill' })
  promote(id: string, body: string): MemoryApiResponse {
    try {
      const data = JSON.parse(body);
      if (!data.type || !['skill', 'belief', 'fact'].includes(data.type)) {
        return { success: false, error: 'Invalid promotion type' };
      }
      const item = this.store.promoteMemory(id, data.type as MemoryType);
      if (!item) return { success: false, error: 'Memory not found or invalid promotion' };
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // POST /api/memory/:id/link (body: { targetId: string })
  link(id: string, body: string): MemoryApiResponse {
    try {
      const data = JSON.parse(body);
      if (!data.targetId) return { success: false, error: 'Missing targetId' };
      const result = this.store.linkMemories(id, data.targetId);
      return { success: result, data: { linked: result } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // GET /api/memory/stats
  stats(): MemoryApiResponse {
    try {
      const count = this.store.getCount();
      return { success: true, data: count };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // GET /api/memory/graph — full memory graph (for GRAPH tab integration)
  graph(): MemoryApiResponse {
    try {
      const items = this.store.getAll().filter(m => !m.archived);
      
      const nodes = items.map(m => ({
        id: m.id,
        label: m.content.substring(0, 40),
        type: m.type,
        typeCategory: 'memory',
        confidence: m.confidence,
        importance: m.importance,
        status: m.status,
      }));
      
      const edges: { from: string; to: string; relation: string }[] = [];
      for (const item of items) {
        for (const linkedId of item.linkedMemoryIds) {
          edges.push({
            from: item.id,
            to: linkedId,
            relation: 'memory_link',
          });
        }
      }
      
      return { success: true, data: { nodes, edges } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Parse query parameters from URL
   */
  private parseQuery(url: string): MemoryQuery {
    const urlObj = new URL(url, 'http://localhost');
    const params = urlObj.searchParams;
    
    const query: MemoryQuery = {};
    
    if (params.get('text')) query.text = params.get('text')!;
    if (params.get('types')) query.types = params.get('types')!.split(',') as MemoryType[];
    if (params.get('tags')) query.tags = params.get('tags')!.split(',');
    if (params.get('minConfidence')) query.minConfidence = parseFloat(params.get('minConfidence')!);
    if (params.get('maxConfidence')) query.maxConfidence = parseFloat(params.get('maxConfidence')!);
    if (params.get('minImportance')) query.minImportance = parseFloat(params.get('minImportance')!);
    if (params.get('maxImportance')) query.maxImportance = parseFloat(params.get('maxImportance')!);
    if (params.get('status')) query.status = params.get('status')!.split(',') as any;
    if (params.get('sourceTaskId')) query.sourceTaskId = params.get('sourceTaskId')!;
    if (params.get('sourceTool')) query.sourceTool = params.get('sourceTool')!;
    if (params.get('sortBy')) query.sortBy = params.get('sortBy')! as any;
    if (params.get('sortDir')) query.sortDir = params.get('sortDir')! as any;
    if (params.get('limit')) query.limit = parseInt(params.get('limit')!, 10);
    if (params.get('offset')) query.offset = parseInt(params.get('offset')!, 10);
    if (params.get('archived') === 'true') query.archived = true;
    
    return query;
  }
}
