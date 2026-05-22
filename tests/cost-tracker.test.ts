/**
 * CostTracker — Phase 6.4a Test Suite
 *
 * Covers:
 * - Construction with defaults and custom config
 * - record() and getTotalCost()
 * - getCostByModel() grouping
 * - getSessionCost() filtering
 * - getRecent() and getTotalTokens()
 * - setModelRate() custom pricing
 * - reset() and setConfig()
 */

import { describe, it, expect } from 'vitest';

describe('CostTracker', () => {
  it('constructs with default config', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker();
    const config = tracker.getConfig();
    expect(config.inputRate).toBeGreaterThan(0);
    expect(config.outputRate).toBeGreaterThan(0);
    expect(config.maxRecords).toBe(1000);
  });

  it('constructs with custom config', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 0.001, outputRate: 0.002, maxRecords: 50 });
    const config = tracker.getConfig();
    expect(config.inputRate).toBe(0.001);
    expect(config.outputRate).toBe(0.002);
    expect(config.maxRecords).toBe(50);
  });

  it('records a cost entry', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 2 }); // $1/1K in, $2/1K out

    const record = tracker.record({
      modelId: 'gpt-4',
      provider: 'openai',
      inputTokens: 1000,
      outputTokens: 500,
    });

    expect(record.inputCost).toBe(1);  // 1000/1000 * 1
    expect(record.outputCost).toBe(1); // 500/1000 * 2
    expect(record.totalCost).toBe(2);
    expect(record.modelId).toBe('gpt-4');
    expect(record.timestamp).toBeGreaterThan(0);
  });

  it('getTotalCost returns sum of all records', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 1 });

    tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 500, outputTokens: 500 });
    tracker.record({ modelId: 'm2', provider: 'p2', inputTokens: 1000, outputTokens: 1000 });

    // First: 500/1000*1 + 500/1000*1 = 1
    // Second: 1000/1000*1 + 1000/1000*1 = 2
    expect(tracker.getTotalCost()).toBeCloseTo(3, 5);
  });

  it('getCostByModel groups costs by model', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 2 });

    tracker.record({ modelId: 'gpt4', provider: 'openai', inputTokens: 1000, outputTokens: 500 });
    tracker.record({ modelId: 'gpt4', provider: 'openai', inputTokens: 500, outputTokens: 500 });
    tracker.record({ modelId: 'claude', provider: 'anthropic', inputTokens: 2000, outputTokens: 1000 });

    const byModel = tracker.getCostByModel();
    expect(Object.keys(byModel)).toHaveLength(2);
    expect(byModel.gpt4.calls).toBe(2);
    expect(byModel.claude.calls).toBe(1);
    expect(byModel.gpt4.totalTokens).toBe(2500);
  });

  it('getSessionCost filters by session', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 1 });

    tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 100, outputTokens: 100, sessionId: 's1' });
    tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 100, outputTokens: 100, sessionId: 's2' });
    tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 100, outputTokens: 100, sessionId: 's1' });

    const s1Records = tracker.getSessionCost('s1');
    expect(s1Records).toHaveLength(2);

    const s2Records = tracker.getSessionCost('s2');
    expect(s2Records).toHaveLength(1);
  });

  it('getRecent returns latest N records', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 1 });

    for (let i = 0; i < 10; i++) {
      tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 100, outputTokens: 100 });
    }

    expect(tracker.getRecent(3)).toHaveLength(3);
    expect(tracker.getRecent(20)).toHaveLength(10);
  });

  it('getTotalTokens sums input and output', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 1 });

    tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 1000, outputTokens: 2000 });
    tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 500, outputTokens: 1500 });

    const totals = tracker.getTotalTokens();
    expect(totals.input).toBe(1500);
    expect(totals.output).toBe(3500);
  });

  it('setModelRate applies custom rates per model', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 1 });

    tracker.setModelRate('expensive-model', 10, 20);
    const record = tracker.record({
      modelId: 'expensive-model',
      provider: 'custom',
      inputTokens: 1000,
      outputTokens: 500,
    });

    expect(record.inputCost).toBe(10);  // 1000/1000 * 10
    expect(record.outputCost).toBe(10); // 500/1000 * 20
    expect(record.totalCost).toBe(20);
  });

  it('reset clears all records', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 1 });

    tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 100, outputTokens: 100 });
    expect(tracker.getTotalCost()).toBeGreaterThan(0);

    tracker.reset();
    expect(tracker.getTotalCost()).toBe(0);
    expect(tracker.getTotalTokens().input).toBe(0);
  });

  it('setConfig updates rates at runtime', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 1 });

    tracker.setConfig({ inputRate: 5, outputRate: 10 });
    const config = tracker.getConfig();
    expect(config.inputRate).toBe(5);
    expect(config.outputRate).toBe(10);
  });

  it('trims records beyond maxRecords', async () => {
    const { CostTracker } = await import('../src/core/observability/cost-tracker.js');
    const tracker = new CostTracker({ inputRate: 1, outputRate: 1, maxRecords: 3 });

    for (let i = 0; i < 5; i++) {
      tracker.record({ modelId: 'm1', provider: 'p1', inputTokens: 100, outputTokens: 100 });
    }

    expect(tracker.getRecent(10)).toHaveLength(3);
  });
});