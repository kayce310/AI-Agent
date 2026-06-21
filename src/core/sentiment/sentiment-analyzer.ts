/**
 * Sentiment Analyzer: VADER + underthesea combo for bilingual sentiment analysis
 * 
 * - Auto-detects Vietnamese vs English
 * - VADER for English (social media optimized)
 * - underthesea for Vietnamese (with toxic word detection)
 * - Tracks sentiment metrics for dashboard
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { Logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = new Logger({ module: 'SentimentAnalyzer' });

export interface SentimentResult {
  score: number;        // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  toxic: boolean;
  toxic_words: string[];
  toxicity_level: number; // 0 to 1
  language: 'vi' | 'en';
  engine: string;
  latency_ms: number;
  text: string;
  pos_hits?: number;
  neg_hits?: number;
}

export interface SentimentMetrics {
  totalMessages: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  toxicCount: number;
  avgScore: number;
  avgToxicity: number;
  byUser: Record<string, {
    count: number;
    avgScore: number;
    toxicCount: number;
  }>;
  byLanguage: Record<string, number>;
}

/**
 * SentimentAnalyzer: Calls Python analyze.py for bilingual sentiment analysis
 * 
 * Usage:
 *   const analyzer = new SentimentAnalyzer();
 *   const result = await analyzer.analyze('Tôi rất thích sản phẩm này!');
 *   console.log(result.label); // 'positive'
 *   console.log(result.toxic); // false
 */
export class SentimentAnalyzer {
  private pythonPath: string;
  private scriptPath: string;
  private metrics: SentimentMetrics;
  private maxConcurrent: number = 3;
  private running: number = 0;

  constructor() {
    // Find Python executable
    this.pythonPath = this.findPython();
    this.scriptPath = path.join(__dirname, 'analyze.py');
    
    // Initialize metrics
    this.metrics = {
      totalMessages: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      toxicCount: 0,
      avgScore: 0,
      avgToxicity: 0,
      byUser: {},
      byLanguage: { vi: 0, en: 0 },
    };
  }

  /**
   * Analyze sentiment of a text message
   */
  async analyze(text: string, options?: {
    lang?: 'vi' | 'en';
    userId?: string;
  }): Promise<SentimentResult> {
    if (!text || text.trim().length === 0) {
      return this.emptyResult();
    }

    // Rate limiting
    if (this.running >= this.maxConcurrent) {
      logger.warn('Sentiment analysis queue full, using fallback');
      return this.fallbackAnalyze(text);
    }

    this.running++;

    try {
      const input = JSON.stringify({
        text: text.substring(0, 500), // Limit input length
        lang: options?.lang,
      });

      const result = await this.executePython(input);
      
      // Update metrics
      this.updateMetrics(result, options?.userId);
      
      return result;
    } catch (error: any) {
      logger.error('Sentiment analysis failed', { error: error.message });
      return this.fallbackAnalyze(text);
    } finally {
      this.running--;
    }
  }

  /**
   * Batch analyze multiple messages
   */
  async analyzeBatch(texts: string[], userId?: string): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];
    
    // Process sequentially to avoid overwhelming Python
    for (const text of texts) {
      results.push(await this.analyze(text, { userId }));
    }
    
    return results;
  }

  /**
   * Get current sentiment metrics
   */
  getMetrics(): SentimentMetrics {
    return { ...this.metrics };
  }

  /**
   * Get user-specific sentiment summary
   */
  getUserSummary(userId: string): {
    count: number;
    avgScore: number;
    toxicCount: number;
    mood: 'positive' | 'negative' | 'neutral';
  } | null {
    const userMetrics = this.metrics.byUser[userId];
    if (!userMetrics) return null;

    const mood = userMetrics.avgScore > 0.1 ? 'positive' 
               : userMetrics.avgScore < -0.1 ? 'negative' 
               : 'neutral';

    return {
      count: userMetrics.count,
      avgScore: userMetrics.avgScore,
      toxicCount: userMetrics.toxicCount,
      mood,
    };
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  resetMetrics(): void {
    this.metrics = {
      totalMessages: 0,
      positiveCount: 0,
      negativeCount: 0,
      neutralCount: 0,
      toxicCount: 0,
      avgScore: 0,
      avgToxicity: 0,
      byUser: {},
      byLanguage: { vi: 0, en: 0 },
    };
  }

  // ── Internal Methods ──

  private findPython(): string {
    // Check common Python locations on Windows
    const candidates = [
      'python',
      'python3',
      'C:\\Users\\Kayce\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe',
    ];
    
    // Return first one (will fail later if not found)
    return candidates[0];
  }

  private executePython(input: string): Promise<SentimentResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonPath, [this.scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000, // 5s timeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e) {
          reject(new Error(`Invalid JSON output: ${stdout}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Send input
      child.stdin.write(input);
      child.stdin.end();
    });
  }

  private fallbackAnalyze(text: string): SentimentResult {
    // Simple fallback when Python is unavailable
    const textLower = text.toLowerCase();
    
    // Basic Vietnamese detection
    const hasVietChars = /[ăâđêôơư]/.test(text) || 
      text.split('').filter(c => '\u0100' <= c && c <= '\u024F').length > 0;
    
    // Simple keyword matching
    const positiveWords = ['good', 'great', 'love', 'like', 'tốt', 'hay', 'đẹp', 'thích'];
    const negativeWords = ['bad', 'terrible', 'hate', 'tệ', 'xấu', 'dở'];
    const toxicWords = ['fuck', 'shit', 'dm', 'clm', 'vcl'];
    
    const posCount = positiveWords.filter(w => textLower.includes(w)).length;
    const negCount = negativeWords.filter(w => textLower.includes(w)).length;
    const toxicCount = toxicWords.filter(w => textLower.includes(w)).length;
    
    const score = posCount > negCount ? 0.5 : negCount > posCount ? -0.5 : 0;
    
    return {
      score,
      label: score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral',
      toxic: toxicCount > 0,
      toxic_words: [],
      toxicity_level: toxicCount > 0 ? 0.5 : 0,
      language: hasVietChars ? 'vi' : 'en',
      engine: 'fallback-keyword',
      latency_ms: 1,
      text: text.substring(0, 200),
    };
  }

  private updateMetrics(result: SentimentResult, userId?: string): void {
    this.metrics.totalMessages++;
    
    // Update label counts
    if (result.label === 'positive') this.metrics.positiveCount++;
    else if (result.label === 'negative') this.metrics.negativeCount++;
    else this.metrics.neutralCount++;
    
    // Update toxic count
    if (result.toxic) this.metrics.toxicCount++;
    
    // Update running averages
    const n = this.metrics.totalMessages;
    this.metrics.avgScore = (this.metrics.avgScore * (n - 1) + result.score) / n;
    this.metrics.avgToxicity = (this.metrics.avgToxicity * (n - 1) + result.toxicity_level) / n;
    
    // Update language counts
    this.metrics.byLanguage[result.language] = 
      (this.metrics.byLanguage[result.language] || 0) + 1;
    
    // Update user metrics
    if (userId) {
      if (!this.metrics.byUser[userId]) {
        this.metrics.byUser[userId] = { count: 0, avgScore: 0, toxicCount: 0 };
      }
      
      const user = this.metrics.byUser[userId];
      const userN = user.count + 1;
      user.avgScore = (user.avgScore * user.count + result.score) / userN;
      if (result.toxic) user.toxicCount++;
      user.count = userN;
    }
  }

  private emptyResult(): SentimentResult {
    return {
      score: 0,
      label: 'neutral',
      toxic: false,
      toxic_words: [],
      toxicity_level: 0,
      language: 'en',
      engine: 'empty',
      latency_ms: 0,
      text: '',
    };
  }
}

// Export singleton
export const sentimentAnalyzer = new SentimentAnalyzer();
