/**
 * @file Logger Tests
 * @layer tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Logger } from '../src/core/logger.js';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ module: 'test' });
  });

  it('should create logger with module name', () => {
    expect(logger).toBeDefined();
  });

  it('should have info method', () => {
    expect(typeof logger.info).toBe('function');
  });

  it('should have warn method', () => {
    expect(typeof logger.warn).toBe('function');
  });

  it('should have error method', () => {
    expect(typeof logger.error).toBe('function');
  });

  it('should have debug method', () => {
    expect(typeof logger.debug).toBe('function');
  });

  it('should not throw on log calls', () => {
    expect(() => logger.info('test message')).not.toThrow();
    expect(() => logger.warn('test warning')).not.toThrow();
    expect(() => logger.error('test error')).not.toThrow();
    expect(() => logger.debug('test debug')).not.toThrow();
  });

  it('should accept context object', () => {
    expect(() => logger.info('with context', { key: 'value', num: 42 })).not.toThrow();
  });
});
