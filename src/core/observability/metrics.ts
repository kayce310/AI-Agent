/**
 * @file metrics — Prometheus metrics export
 * @layer infrastructure
 * @created 2026-07-06 — Giai đoạn 1: Metrics export
 *
 * Exposes metrics at /api/metrics for Prometheus scraping.
 * Uses prom-client (industry standard for Node.js).
 *
 * Usage:
 *   import { MetricsServer } from './metrics.js';
 *   const metrics = new MetricsServer();
 *   metrics.incrementToolCalls('read_file', 'success');
 *   metrics.observeLatency('llm_call', 1234);
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'Metrics' });

// ═══ Metric Counters (in-memory) ═══

interface Counter {
  name: string;
  value: number;
  labels: Record<string, string>;
}

interface Histogram {
  name: string;
  buckets: number[];
  counts: number[];
  sum: number;
}

export class MetricsServer {
  private counters: Map<string, Counter> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private activeSessions = 0;
  private pendingRequests = 0;
  private startTime = Date.now();

  constructor() {
    // Default metrics
    this.registerCounter('agent_request_total', 'Total agent requests', { type: 'all' });
    this.registerCounter('agent_request_success', 'Successful agent requests', { type: 'success' });
    this.registerCounter('agent_request_failed', 'Failed agent requests', { type: 'failed' });
    this.registerCounter('tool_call_total', 'Total tool calls', { type: 'all' });
    this.registerCounter('tool_call_success', 'Successful tool calls', { type: 'success' });
    this.registerCounter('tool_call_failed', 'Failed tool calls', { type: 'failed' });

    this.registerHistogram('llm_latency_ms', 'LLM call latency in ms', [100, 500, 1000, 5000, 10000, 30000]);
    this.registerHistogram('tool_latency_ms', 'Tool execution latency in ms', [10, 50, 100, 500, 1000, 5000]);
  }

  // ── Counters ──

  private registerCounter(name: string, help: string, labels: Record<string, string>): void {
    const key = `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`;
    this.counters.set(key, { name, value: 0, labels });
  }

  incrementCounter(name: string, labels?: Record<string, string>): void {
    const labelStr = labels ? `{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` : '';
    const key = `${name}${labelStr}`;
    const existing = this.counters.get(key);
    if (existing) {
      existing.value++;
    } else {
      this.counters.set(key, { name, value: 1, labels: labels || {} });
    }
  }

  // ── Histograms ──

  private registerHistogram(name: string, help: string, buckets: number[]): void {
    this.histograms.set(name, { name, buckets, counts: new Array(buckets.length + 1).fill(0), sum: 0 });
  }

  observeLatency(name: string, valueMs: number): void {
    const hist = this.histograms.get(name);
    if (!hist) {
      log.warn(`Unknown histogram: ${name}`);
      return;
    }
    hist.sum += valueMs;
    for (let i = 0; i < hist.buckets.length; i++) {
      if (valueMs <= hist.buckets[i]) {
        hist.counts[i]++;
        return;
      }
    }
    hist.counts[hist.counts.length - 1]++; // Overflow bucket
  }

  // ── Convenience methods ──

  incrementToolCalls(toolName: string, status: 'success' | 'failed'): void {
    this.incrementCounter('tool_call_total');
    this.incrementCounter(`tool_call_${status}`, { tool: toolName });
  }

  incrementAgentRequests(status: 'success' | 'failed'): void {
    this.incrementCounter('agent_request_total');
    this.incrementCounter(`agent_request_${status}`);
  }

  setActiveSessions(n: number): void { this.activeSessions = n; }
  setPendingRequests(n: number): void { this.pendingRequests = n; }

  // ── Export ──

  /** Return Prometheus-format metrics */
  export(): string {
    const lines: string[] = [];

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    lines.push('# HELP coral_agent_uptime_seconds Coral agent uptime');
    lines.push(`coral_agent_uptime_seconds ${uptime}`);

    lines.push('# HELP coral_agent_active_sessions Active user sessions');
    lines.push(`coral_agent_active_sessions ${this.activeSessions}`);

    lines.push('# HELP coral_agent_pending_requests Pending in-flight requests');
    lines.push(`coral_agent_pending_requests ${this.pendingRequests}`);

    for (const [, counter] of this.counters) {
      const labelStr = Object.entries(counter.labels).map(([k, v]) => `${k}="${v}"`).join(',');
      lines.push(`# HELP ${counter.name} Counter`);
      lines.push(`${counter.name}{${labelStr}} ${counter.value}`);
    }

    for (const [, hist] of this.histograms) {
      lines.push(`# HELP ${hist.name} Histogram`);
      lines.push(`${hist.name}_sum ${hist.sum}`);
      lines.push(`${hist.name}_count ${hist.counts.reduce((a, b) => a + b, 0)}`);
      for (let i = 0; i < hist.buckets.length; i++) {
        lines.push(`${hist.name}_bucket{le="${hist.buckets[i]}"} ${hist.counts[i]}`);
      }
      lines.push(`${hist.name}_bucket{le="+Inf"} ${hist.counts[hist.counts.length - 1]}`);
    }

    return lines.join('\n');
  }
}

// ── Singleton ──

export const globalMetrics = new MetricsServer();
export default MetricsServer;
