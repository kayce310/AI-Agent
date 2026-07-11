/**
 * Sentiment Analyzer Tests — Vitest format
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SentimentAnalyzer } from '../src/core/sentiment/sentiment-analyzer';

const TEST_TIMEOUT = 15000; // 15s for Python subprocess

describe('SentimentAnalyzer', () => {
  let analyzer: SentimentAnalyzer;

  beforeAll(() => {
    analyzer = new SentimentAnalyzer();
  });

  afterAll(() => {
    analyzer.resetMetrics();
  });

  describe('English Sentiment', () => {
    it('should detect positive sentiment', async () => {
      const result = await analyzer.analyze('I love this product, it\'s amazing!');
      expect(result.label).toBe('positive');
      expect(result.language).toBe('en');
    }, TEST_TIMEOUT);

    it('should detect negative sentiment', async () => {
      const result = await analyzer.analyze('This is bad and awful');
      expect(result.label).toBe('negative');
      expect(result.language).toBe('en');
    }, TEST_TIMEOUT);

    it('should detect toxic English text', async () => {
      const result = await analyzer.analyze('Fuck this shit');
      expect(result.toxic).toBe(true);
      expect(result.language).toBe('en');
    }, TEST_TIMEOUT);
  });

  describe('Vietnamese Sentiment', () => {
    it('should detect positive Vietnamese text', async () => {
      const result = await analyzer.analyze('Tôi rất thích sản phẩm này, tuyệt vời!');
      expect(result.label).toBe('positive');
      expect(result.language).toBe('vi');
    }, TEST_TIMEOUT);

    it('should detect negative Vietnamese text', async () => {
      const result = await analyzer.analyze('Dịch vụ này tồi tệ lắm, rất thất vọng');
      expect(result.label).toBe('negative');
      expect(result.language).toBe('vi');
    }, TEST_TIMEOUT);

    it('should detect neutral Vietnamese text', async () => {
      const result = await analyzer.analyze('Hôm nay thời tiết bình thường');
      expect(result.label).toBe('neutral');
      expect(result.language).toBe('vi');
    }, TEST_TIMEOUT);

    it('should detect toxic Vietnamese text', async () => {
      const result = await analyzer.analyze('đồ khốn nạn');
      expect(result.toxic).toBe(true);
      expect(result.language).toBe('vi');
    }, TEST_TIMEOUT);
  });

  describe('Edge Cases', () => {
    it('should handle empty string', async () => {
      const result = await analyzer.analyze('');
      expect(result).toBeDefined();
    }, TEST_TIMEOUT);

    it('should handle whitespace only', async () => {
      const result = await analyzer.analyze('   ');
      expect(result).toBeDefined();
    }, TEST_TIMEOUT);

    it('should handle emoji only', async () => {
      const result = await analyzer.analyze('😂😂😂');
      expect(result).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Metrics Tracking', () => {
    it('should track per-user sentiment', async () => {
      await analyzer.analyze('Great work!', { userId: 'user1' });
      await analyzer.analyze('Tuyệt vời!', { userId: 'user1' });
      await analyzer.analyze('This is bad', { userId: 'user2' });

      const metrics = analyzer.getMetrics();
      expect(metrics.totalMessages).toBeGreaterThanOrEqual(3);
      expect(Object.keys(metrics.byUser).length).toBeGreaterThanOrEqual(2);
    }, TEST_TIMEOUT);

    it('should return user summary', async () => {
      const summary = analyzer.getUserSummary('user1');
      expect(summary).toBeDefined();
      expect(summary?.mood).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Batch Analysis', () => {
    it('should batch analyze multiple texts', async () => {
      const results = await analyzer.analyzeBatch([
        'I love this!',
        'I hate this!',
        'Okay.',
      ]);
      expect(results.length).toBe(3);
      expect(results[0].label).toBe('positive');
      expect(results[1].label).toBe('negative');
    }, TEST_TIMEOUT);
  });
});
