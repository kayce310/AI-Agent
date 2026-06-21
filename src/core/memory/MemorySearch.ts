/**
 * @file MemorySearch — Hybrid keyword + BM25-like full-text search for MemoryItems
 * @layer core/memory
 * @created 2026-06-21
 * 
 * Phase 1: Simple keyword search with TF/IDF-like scoring.
 * Phase 2: Upgrade to minisearch or sqlite-vec for embeddings.
 */

import { MemoryItem, MemoryQuery, calculateMemoryScore } from './MemoryItem.js';

interface ScoredItem {
  item: MemoryItem;
  score: number;
}

export class MemorySearch {
  
  /**
   * Execute query against memory items
   * Combines: keyword match + metadata filters + score sort
   */
  search(items: MemoryItem[], query: MemoryQuery): { items: MemoryItem[]; total: number } {
    let results = items;

    // Filter by archived
    if (!query.archived) {
      results = results.filter(m => !m.archived);
    }

    // Type filter
    if (query.types && query.types.length > 0) {
      results = results.filter(m => query.types!.includes(m.type));
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      results = results.filter(m =>
        query.tags!.some(tag => m.tags.includes(tag))
      );
    }

    // Confidence range
    if (query.minConfidence !== undefined) {
      results = results.filter(m => m.confidence >= query.minConfidence!);
    }
    if (query.maxConfidence !== undefined) {
      results = results.filter(m => m.confidence <= query.maxConfidence!);
    }

    // Importance range
    if (query.minImportance !== undefined) {
      results = results.filter(m => m.importance >= query.minImportance!);
    }
    if (query.maxImportance !== undefined) {
      results = results.filter(m => m.importance <= query.maxImportance!);
    }

    // Status filter
    if (query.status && query.status.length > 0) {
      results = results.filter(m => query.status!.includes(m.status));
    }

    // Source filters
    if (query.sourceTaskId) {
      results = results.filter(m => m.source.taskId === query.sourceTaskId);
    }
    if (query.sourceTool) {
      results = results.filter(m => m.source.tool === query.sourceTool);
    }

    // Text search
    const hasText = query.text && query.text.trim();
    if (hasText) {
      const terms = query.text!.toLowerCase().split(/\s+/).filter(Boolean);
      
      const scored: ScoredItem[] = results.map(m => ({
        item: m,
        score: this.scoreRelevance(m, terms),
      }));
      
      // Filter out items with zero relevance
      results = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).map(s => s.item);
    }

    // Sort by selected field
    if (!hasText) {
      const sortBy = query.sortBy || 'score';
      const sortDir = query.sortDir || 'desc';
      results = [...results].sort((a, b) => {
        let cmp = 0;
        switch (sortBy) {
          case 'score': cmp = calculateMemoryScore(b) - calculateMemoryScore(a); break;
          case 'confidence': cmp = b.confidence - a.confidence; break;
          case 'importance': cmp = b.importance - a.importance; break;
          case 'createdAt': cmp = b.createdAt - a.createdAt; break;
          case 'lastAccessedAt': cmp = b.lastAccessedAt - a.lastAccessedAt; break;
        }
        return sortDir === 'desc' ? cmp : -cmp;
      });
    }

    const total = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    results = results.slice(offset, offset + limit);

    return { items: results, total };
  }

  /**
   * TF/IDF-like relevance scoring for keyword matches
   */
  private scoreRelevance(item: MemoryItem, terms: string[]): number {
    const contentLower = item.content.toLowerCase();
    const tagText = item.tags.join(' ').toLowerCase();
    
    let termScore = 0;
    let matchedTerms = 0;
    
    for (const term of terms) {
      // Score based on term frequency in content (up to 3 occurrences counted)
      const contentMatches = (contentLower.match(new RegExp(escapeRegex(term), 'g')) || []).length;
      const tagMatches = (tagText.match(new RegExp(escapeRegex(term), 'g')) || []).length;
      
      if (contentMatches > 0 || tagMatches > 0) {
        matchedTerms++;
        // TF normalization: log(1 + count)
        const tf = Math.log(1 + Math.min(contentMatches, 3)) + Math.log(1 + tagMatches) * 2; // Tags weighted higher
        termScore += tf;
      }
    }
    
    // Must match ALL terms
    if (matchedTerms < terms.length) return 0;
    
    // Blend with memory score
    const memoryScore = calculateMemoryScore(item);
    return (termScore * 0.6) + (memoryScore * 0.4);
  }

  /**
   * Search similar content by exact phrase
   */
  findByPhrase(items: MemoryItem[], phrase: string): MemoryItem[] {
    const lower = phrase.toLowerCase();
    return items.filter(m => 
      m.content.toLowerCase().includes(lower) ||
      m.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  /**
   * Get related memories via link graph
   */
  getLinked(items: MemoryItem[], id: string, depth: number = 1): Map<string, MemoryItem> {
    const visited = new Map<string, MemoryItem>();
    const queue: { id: string; d: number }[] = [{ id, d: 0 }];
    
    while (queue.length > 0) {
      const { id: currentId, d } = queue.shift()!;
      if (visited.has(currentId) || d > depth) continue;
      
      const item = items.find(m => m.id === currentId);
      if (!item) continue;
      
      visited.set(currentId, item);
      
      for (const linkedId of item.linkedMemoryIds) {
        if (!visited.has(linkedId)) {
          queue.push({ id: linkedId, d: d + 1 });
        }
      }
    }
    
    return visited;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
