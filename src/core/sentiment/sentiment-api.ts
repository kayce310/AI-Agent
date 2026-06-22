/**
 * Sentiment API: Dashboard metrics for sentiment tracking
 */

import { sentimentAnalyzer, SentimentMetrics } from '../../core/sentiment/sentiment-analyzer.js';

export class SentimentAPI {
  /**
   * Get current sentiment metrics
   */
  async getMetrics(): Promise<SentimentMetrics> {
    return sentimentAnalyzer.getMetrics();
  }

  /**
   * Get user-specific sentiment summary
   */
  async getUserSummary(userId: string): Promise<{
    count: number;
    avgScore: number;
    toxicCount: number;
    mood: 'positive' | 'negative' | 'neutral';
  } | null> {
    return sentimentAnalyzer.getUserSummary(userId);
  }

  /**
   * Get sentiment summary for all users
   */
  async getAllUserSummaries(): Promise<Record<string, {
    count: number;
    avgScore: number;
    toxicCount: number;
    mood: 'positive' | 'negative' | 'neutral';
  }>> {
    const metrics = sentimentAnalyzer.getMetrics();
    const summaries: Record<string, any> = {};
    
    for (const [userId, userMetrics] of Object.entries(metrics.byUser)) {
      const mood = userMetrics.avgScore > 0.1 ? 'positive' 
                 : userMetrics.avgScore < -0.1 ? 'negative' 
                 : 'neutral';
      
      summaries[userId] = {
        count: userMetrics.count,
        avgScore: userMetrics.avgScore,
        toxicCount: userMetrics.toxicCount,
        mood,
      };
    }
    
    return summaries;
  }

  /**
   * Get sentiment distribution
   */
  async getDistribution(): Promise<{
    positive: number;
    negative: number;
    neutral: number;
    total: number;
    positivePercent: number;
    negativePercent: number;
    neutralPercent: number;
  }> {
    const metrics = sentimentAnalyzer.getMetrics();
    const total = metrics.totalMessages || 1;
    
    return {
      positive: metrics.positiveCount,
      negative: metrics.negativeCount,
      neutral: metrics.neutralCount,
      total: metrics.totalMessages,
      positivePercent: Math.round((metrics.positiveCount / total) * 100),
      negativePercent: Math.round((metrics.negativeCount / total) * 100),
      neutralPercent: Math.round((metrics.neutralCount / total) * 100),
    };
  }

  /**
   * Get toxicity report
   */
  async getToxicityReport(): Promise<{
    totalMessages: number;
    toxicMessages: number;
    toxicityRate: number;
    avgToxicityLevel: number;
    topToxicUsers: Array<{
      userId: string;
      toxicCount: number;
      avgToxicity: number;
    }>;
  }> {
    const metrics = sentimentAnalyzer.getMetrics();
    
    // Find top toxic users
    const toxicUsers = Object.entries(metrics.byUser)
      .filter(([_, data]) => data.toxicCount > 0)
      .map(([userId, data]) => ({
        userId,
        toxicCount: data.toxicCount,
        avgToxicity: data.avgScore < -0.3 ? 0.6 : 0.3, // Approximate
      }))
      .sort((a, b) => b.toxicCount - a.toxicCount)
      .slice(0, 10);
    
    return {
      totalMessages: metrics.totalMessages,
      toxicMessages: metrics.toxicCount,
      toxicityRate: metrics.totalMessages > 0 
        ? Math.round((metrics.toxicCount / metrics.totalMessages) * 100) 
        : 0,
      avgToxicityLevel: metrics.avgToxicity,
      topToxicUsers: toxicUsers,
    };
  }

  /**
   * Get language distribution
   */
  async getLanguageDistribution(): Promise<{
    vietnamese: number;
    english: number;
    total: number;
    vietnamesePercent: number;
    englishPercent: number;
  }> {
    const metrics = sentimentAnalyzer.getMetrics();
    const total = metrics.totalMessages || 1;
    
    return {
      vietnamese: metrics.byLanguage.vi || 0,
      english: metrics.byLanguage.en || 0,
      total: metrics.totalMessages,
      vietnamesePercent: Math.round(((metrics.byLanguage.vi || 0) / total) * 100),
      englishPercent: Math.round(((metrics.byLanguage.en || 0) / total) * 100),
    };
  }

  /**
   * Reset metrics (for testing or periodic reset)
   */
  async reset(): Promise<void> {
    sentimentAnalyzer.resetMetrics();
  }
}

export const sentimentAPI = new SentimentAPI();
