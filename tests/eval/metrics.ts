/**
 * @file eval-metrics.ts — Calculate evaluation metrics
 * @layer tests
 * @purpose Compute success metrics from test results
 */

import { TestResult } from './runner.js';

// ─── Metrics Interfaces ────────────────────────────────────────────────────

export interface SuccessMetrics {
  taskSuccessRate: number;
  toolAccuracy: number;
  hallucinationRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  errorRate: number;
}

export interface MetricConfig {
  taskSuccessThreshold: number; // 70%
  toolAccuracyThreshold: number; // 85%
  hallucinationThreshold: number; // <10%
  latencyP95Threshold: number; // <30000ms
}

// ─── Metric Calculators ────────────────────────────────────────────────────

export class EvalMetrics {
  private results: TestResult[];

  constructor(results: TestResult[]) {
    this.results = results;
  }

  /**
   * Calculate task success rate
   * Percentage of tests that passed
   */
  getTaskSuccessRate(): number {
    const passed = this.results.filter(r => r.passed).length;
    return (passed / this.results.length) * 100;
  }

  /**
   * Calculate average duration
   */
  getAvgDuration(): number {
    const durations = this.results
      .map(r => r.durationMs)
      .filter((d): d is number => d !== undefined);
    
    if (durations.length === 0) return 0;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  /**
   * Calculate latency percentiles
   */
  getLatencyPercentiles(): {
    p50: number;
    p95: number;
    p99: number;
  } {
    const durations = this.results
      .map(r => r.durationMs)
      .filter((d): d is number => d !== undefined)
      .sort((a, b) => a - b);

    if (durations.length === 0) return { p50: 0, p95: 0, p99: 0 };

    const p50Idx = Math.floor(durations.length * 0.5);
    const p95Idx = Math.floor(durations.length * 0.95);
    const p99Idx = Math.floor(durations.length * 0.99);

    return {
      p50: durations[p50Idx],
      p95: durations[p95Idx],
      p99: durations[p99Idx],
    };
  }

  /**
   * Calculate error rate
   */
  getErrorRate(): number {
    const withErrors = this.results.filter(r => r.error !== undefined).length;
    return (withErrors / this.results.length) * 100;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): SuccessMetrics {
    const latencies = this.getLatencyPercentiles();

    return {
      taskSuccessRate: this.getTaskSuccessRate(),
      toolAccuracy: this.getTaskSuccessRate(), // For now, use same as success rate
      hallucinationRate: this.getErrorRate(), // Placeholder
      latencyP50: latencies.p50,
      latencyP95: latencies.p95,
      latencyP99: latencies.p99,
      errorRate: this.getErrorRate(),
    };
  }

  /**
   * Check if metrics meet thresholds
   */
  checkThresholds(config: MetricConfig): {
    allPassed: boolean;
    failedMetrics: string[];
  } {
    const metrics = this.getAllMetrics();
    const failed: string[] = [];

    if (metrics.taskSuccessRate < config.taskSuccessThreshold) {
      failed.push(`taskSuccessRate: ${metrics.taskSuccessRate.toFixed(1)}% < ${config.taskSuccessThreshold}%`);
    }

    if (metrics.toolAccuracy < config.toolAccuracyThreshold) {
      failed.push(`toolAccuracy: ${metrics.toolAccuracy.toFixed(1)}% < ${config.toolAccuracyThreshold}%`);
    }

    if (metrics.hallucinationRate > config.hallucinationThreshold) {
      failed.push(`hallucinationRate: ${metrics.hallucinationRate.toFixed(1)}% > ${config.hallucinationThreshold}%`);
    }

    if (metrics.latencyP95 > config.latencyP95Threshold) {
      failed.push(`latencyP95: ${metrics.latencyP95.toFixed(0)}ms > ${config.latencyP95Threshold}ms`);
    }

    return {
      allPassed: failed.length === 0,
      failedMetrics: failed,
    };
  }

  /**
   * Generate human-readable report
   */
  generateReport(config: MetricConfig): string {
    const metrics = this.getAllMetrics();
    const thresholds = this.checkThresholds(config);

    const lines: string[] = [
      '',
      '📊 EVALUATION METRICS REPORT',
      '═════════════════════════════',
      '',
      'Performance:',
      `  Task Success Rate: ${metrics.taskSuccessRate.toFixed(1)}%`,
      `  Avg Duration: ${metrics.getAvgDuration?.() ?? this.getAvgDuration()}ms`,
      `  Latency P50: ${metrics.latencyP50}ms`,
      `  Latency P95: ${metrics.latencyP95}ms`,
      `  Latency P99: ${metrics.latencyP99}ms`,
      '',
      'Quality:',
      `  Error Rate: ${metrics.errorRate.toFixed(1)}%`,
      '',
      thresholds.allPassed
        ? '✅ ALL METRICS PASS'
        : '❌ METRICS BELOW THRESHOLD:',
      ...thresholds.failedMetrics.map(m => `  ⚠️ ${m}`),
      '',
    ];

    return lines.join('\n');
  }
}

// ─── Default Config ────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: MetricConfig = {
  taskSuccessThreshold: 70,
  toolAccuracyThreshold: 85,
  hallucinationThreshold: 10,
  latencyP95Threshold: 30000,
};

// ─── Export utilities ──────────────────────────────────────────────────────

export const createEvalMetrics = (results: TestResult[]) => new EvalMetrics(results);
