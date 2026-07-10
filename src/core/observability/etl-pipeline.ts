/**
 * @file etl-pipeline — Event-to-Eval Data Pipeline
 * @layer core
 * @depends-on events/store
 * @owner core-observability
 *
 * Extracts agent events from EventStore → transforms into eval-ready datasets.
 *
 * Trigger: API endpoint POST /api/etl/run {from, to}
 * Also callable programmatically or via cron.
 *
 * Output format (JSON):
 *   {
 *     metadata: { generatedAt, from, to, totalEvents },
 *     samples: [
 *       {
 *         timestamp: number,
 *         taskId: string,
 *         type: string,
 *         input: string,          // user message / tool args
 *         output: string,         // agent response / tool result
 *         metadata: Record<string, unknown>
 *       }
 *     ]
 *   }
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'ETLPipeline' });

// ── Types ──

export interface ETLConfig {
  /** Event types to include */
  includeTypes?: string[];
  /** Event types to exclude */
  excludeTypes?: string[];
  /** Max events to process */
  maxEvents?: number;
  /** Include error events */
  includeErrors?: boolean;
}

export interface ETLSample {
  timestamp: number;
  taskId?: string;
  type: string;
  input: string;
  output: string;
  metadata: Record<string, unknown>;
}

export interface ETLResult {
  metadata: {
    generatedAt: number;
    from: number;
    to: number;
    totalEvents: number;
    sampleCount: number;
    config: ETLConfig;
  };
  samples: ETLSample[];
}

// ── ETL Pipeline ──

export class ETLPipeline {
  private eventStore: any; // EventStore

  constructor(eventStore: any) {
    this.eventStore = eventStore;
  }

  /**
   * Run the pipeline
   */
  run(from: number, to: number, config: ETLConfig = {}): ETLResult {
    const startTime = Date.now();

    // 1. Query events
    const events = this.eventStore.query({
      startTime: from,
      endTime: to,
      limit: config.maxEvents || 10000,
    });

    // 2. Filter
    let filtered = events;
    if (config.includeTypes?.length) {
      filtered = filtered.filter((e: any) => config.includeTypes!.includes(e.type));
    }
    if (config.excludeTypes?.length) {
      filtered = filtered.filter((e: any) => !config.excludeTypes!.includes(e.type));
    }
    if (!config.includeErrors) {
      filtered = filtered.filter((e: any) => e.type !== 'error');
    }

    // 3. Transform to eval samples
    const samples: ETLSample[] = filtered.map((event: any) => {
      const payload = event.payload || {};
      return {
        timestamp: event.timestamp,
        taskId: payload.taskId || event.metadata?.taskId,
        type: event.type,
        input: this.extractInput(event),
        output: this.extractOutput(event),
        metadata: {
          eventType: event.type,
          source: event.metadata?.source || 'agent',
          ...event.metadata,
        },
      };
    });

    const result: ETLResult = {
      metadata: {
        generatedAt: Date.now(),
        from,
        to,
        totalEvents: events.length,
        sampleCount: samples.length,
        config,
      },
      samples,
    };

    log.info(`ETL complete: ${samples.length}/${events.length} events processed in ${Date.now() - startTime}ms`);
    return result;
  }

  /**
   * Run from API request body
   */
  runFromRequest(body: { from: number; to: number; config?: ETLConfig }): ETLResult {
    const now = Date.now();
    const from = body.from || now - 86400000; // Default: last 24h
    const to = body.to || now;
    return this.run(from, to, body.config || {});
  }

  /**
   * Export result as JSON string
   */
  exportJSON(result: ETLResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Export as CSV (for spreadsheet eval)
   */
  exportCSV(result: ETLResult): string {
    const headers = ['timestamp', 'taskId', 'type', 'input', 'output'];
    const rows = result.samples.map(s => [
      new Date(s.timestamp).toISOString(),
      s.taskId || '',
      s.type,
      this.csvEscape(s.input),
      this.csvEscape(s.output),
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  // ── Private Helpers ──

  private extractInput(event: any): string {
    const p = event.payload || {};
    // Common input fields
    if (p.userMessage) return String(p.userMessage);
    if (p.message) return String(p.message);
    if (p.goal) return String(p.goal);
    if (p.args && typeof p.args === 'object') return JSON.stringify(p.args);
    if (p.command) return String(p.command);
    if (p.query) return String(p.query);
    // Fallback: stringify payload
    return JSON.stringify(p).slice(0, 500);
  }

  private extractOutput(event: any): string {
    const p = event.payload || {};
    // Common output fields
    if (p.result) return String(p.result);
    if (p.response) return String(p.response);
    if (p.content) return String(p.content);
    if (p.output) return String(p.output);
    if (p.error) return `ERROR: ${p.error}`;
    // Fallback: empty
    return '';
  }

  private csvEscape(value: string): string {
    if (!value) return '';
    const escaped = value.replace(/"/g, '""');
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
      return `"${escaped}"`;
    }
    return escaped;
  }
}

// ── Factory ──

let pipelineInstance: ETLPipeline | null = null;

export function getETLPipeline(eventStore: any): ETLPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new ETLPipeline(eventStore);
  }
  return pipelineInstance;
}

export default ETLPipeline;
