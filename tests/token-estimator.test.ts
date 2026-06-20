/**
 * @file Token Estimator Tests
 * @layer tests
 */
import { describe, it, expect } from 'vitest';

describe('Token Estimator', () => {
  it('should be importable', async () => {
    const mod = await import('../src/core/engine/token-estimator.js');
    expect(mod).toBeDefined();
  });
});
