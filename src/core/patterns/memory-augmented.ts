/**
 * @file memory-augmented — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Memory-Augmented Pattern (RAG-enhanced generation)
 * Enhances generation with retrieval from memory/knowledge base.
 * 
 * Flow:
 * 1. Encode query into search vector
 * 2. Retrieve relevant memories/documents
 * 3. Augment prompt with retrieved context
 * 4. Generate response with augmented context
 */

export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  timestamp: number;
}

export interface RetrievalResult {
  entry: MemoryEntry;
  score: number;
}

export class MemoryAugmented {
  private memories: MemoryEntry[] = [];
  private topK: number;

  constructor(topK: number = 5) {
    this.topK = topK;
  }

  /**
   * Add a memory entry.
   */
  addMemory(entry: MemoryEntry): void {
    this.memories.push(entry);
  }

  /**
   * Simple keyword-based retrieval (real impl would use vector similarity).
   */
  retrieve(query: string): RetrievalResult[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const results: RetrievalResult[] = [];

    for (const memory of this.memories) {
      const contentWords = memory.content.toLowerCase().split(/\s+/);
      const matches = queryWords.filter(w => contentWords.includes(w));
      const score = matches.length / Math.max(queryWords.length, 1);

      if (score > 0) {
        results.push({ entry: memory, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, this.topK);
  }

  /**
   * Build augmented prompt with retrieved context.
   */
  buildAugmentedPrompt(query: string, retrieved: RetrievalResult[]): string {
    if (retrieved.length === 0) {
      return query;
    }

    const context = retrieved
      .map((r, i) => `[Context ${i + 1}] (relevance: ${(r.score * 100).toFixed(0)}%)\n${r.entry.content}`)
      .join('\n\n');

    return `Based on the following relevant context:\n\n${context}\n\n---\n\nAnswer the query: ${query}`;
  }
}

export default MemoryAugmented;