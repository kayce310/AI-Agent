/**
 * Context Compression Pattern
 * Optimizes context window usage by compressing and summarizing information.
 * 
 * Strategies:
 * - Summarization: Condense long texts into key points
 * - Extraction: Pull out only relevant information
 * - Chunking: Split large inputs into manageable pieces
 * - Pruning: Remove redundant or low-value content
 */

export interface CompressionResult {
  originalLength: number;
  compressedLength: number;
  compressionRatio: number;
  content: string;
  strategy: string;
}

export class ContextCompression {
  private maxTokens: number;

  constructor(maxTokens: number = 4000) {
    this.maxTokens = maxTokens;
  }

  /**
   * Compress content to fit within token limit.
   */
  compress(content: string, strategy: 'summarize' | 'extract' | 'chunk' | 'prune' = 'summarize'): CompressionResult {
    const originalLength = content.length;

    let compressed: string;
    switch (strategy) {
      case 'summarize':
        compressed = this.summarize(content);
        break;
      case 'extract':
        compressed = this.extractKeyPoints(content);
        break;
      case 'prune':
        compressed = this.prune(content);
        break;
      case 'chunk':
        compressed = this.chunk(content)[0] || content;
        break;
      default:
        compressed = content;
    }

    return {
      originalLength,
      compressedLength: compressed.length,
      compressionRatio: originalLength > 0 ? compressed.length / originalLength : 1,
      content: compressed,
      strategy,
    };
  }

  private summarize(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length <= 3) return content;

    // Take first, middle, and last sentences as summary
    const key = [
      sentences[0],
      sentences[Math.floor(sentences.length / 2)],
      sentences[sentences.length - 1],
    ];
    return key.join('. ') + '.';
  }

  private extractKeyPoints(content: string): string {
    const lines = content.split('\n').filter(l => l.trim().length > 0);
    const keyLines = lines.filter(l =>
      l.includes(':') || l.startsWith('-') || l.startsWith('•') || /^\d+/.test(l)
    );
    return keyLines.length > 0 ? keyLines.join('\n') : content.substring(0, this.maxTokens);
  }

  private prune(content: string): string {
    // Remove duplicate lines
    const lines = content.split('\n');
    const unique = [...new Set(lines)];
    return unique.join('\n');
  }

  private chunk(content: string, chunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.substring(i, i + chunkSize));
    }
    return chunks;
  }
}

export default ContextCompression;