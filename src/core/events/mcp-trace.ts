/**
 * @file MCP Trace — Tool call aggregation and timing analysis
 * @layer core/events
 * @created 2026-06-21
 * @description Aggregates tool_finished events from EventBus into
 *   per-tool stats (count, latency, success rate) and flat timeline.
 */

import { EventBus } from './bus.js';

// ═══ TYPES ═══

export interface ToolCallSummary {
  callId: string;
  toolName: string;
  success: boolean;
  durationMs: number;
  timestamp: number;
  args?: Record<string, unknown>;
  result?: string;
  taskId?: string;
}

export interface ToolStats {
  toolName: string;
  totalCount: number;
  successCount: number;
  failCount: number;
  successRate: number; // 0-1
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  totalDurationMs: number;
}

export interface McpTraceResponse {
  success: boolean;
  data?: {
    /** Flat timeline of all tool calls, newest first */
    timeline: ToolCallSummary[];
    /** Per-tool aggregated stats */
    stats: ToolStats[];
    /** Global summary */
    summary: {
      totalCalls: number;
      totalSuccess: number;
      totalFail: number;
      overallSuccessRate: number;
      totalDurationMs: number;
      avgDurationMs: number;
      uniqueToolCount: number;
      timespanMs: number;
    };
  };
  error?: string;
}

// ═══ MCP TRACE ═══

export class McpTrace {
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  /**
   * Build MCP trace from EventBus tool events.
   * @param limit Max events to scan (default 500)
   * @param toolName Optional filter by tool name
   */
  buildTrace(limit: number = 500, toolName?: string): McpTraceResponse {
    try {
      const recent = this.bus.getRecent(limit);

      // Extract tool_finished events (they carry duration, success, args, result)
      const toolFinished = recent.filter(e => e.type === 'tool_finished');
      const toolCalled = recent.filter(e => e.type === 'tool_called');

      // Build callId → tool_called lookup for args
      const calledMap = new Map<string, any>();
      for (const tc of toolCalled) {
        const p = tc.payload as Record<string, unknown>;
        calledMap.set(p.callId as string, p);
      }

      // Build timeline
      const timeline: ToolCallSummary[] = [];
      for (const e of toolFinished) {
        const p = e.payload as Record<string, unknown>;
        const callId = p.callId as string;
        const name = p.toolName as string;

        // Apply tool name filter
        if (toolName && name !== toolName) continue;

        const called = calledMap.get(callId);
        timeline.push({
          callId,
          toolName: name,
          success: p.success as boolean,
          durationMs: p.durationMs as number,
          timestamp: e.timestamp,
          args: (p.args as Record<string, unknown>) || called?.args as Record<string, unknown> || undefined,
          result: (p.result as string) || undefined,
          taskId: (p.taskId as string) || called?.taskId as string || undefined,
        });
      }

      // Sort newest first
      timeline.sort((a, b) => b.timestamp - a.timestamp);

      // Aggregate per-tool stats
      const toolGroups = new Map<string, number[]>();
      const toolSuccess = new Map<string, number>();
      const toolFail = new Map<string, number>();

      for (const call of timeline) {
        const durations = toolGroups.get(call.toolName) || [];
        durations.push(call.durationMs);
        toolGroups.set(call.toolName, durations);

        if (call.success) {
          toolSuccess.set(call.toolName, (toolSuccess.get(call.toolName) || 0) + 1);
        } else {
          toolFail.set(call.toolName, (toolFail.get(call.toolName) || 0) + 1);
        }
      }

      const stats: ToolStats[] = [];
      for (const [name, durations] of Array.from(toolGroups.entries())) {
        const sorted = [...durations].sort((a, b) => a - b);
        const total = sorted.length;
        const success = toolSuccess.get(name) || 0;
        const fail = toolFail.get(name) || 0;

        stats.push({
          toolName: name,
          totalCount: total,
          successCount: success,
          failCount: fail,
          successRate: total > 0 ? success / total : 0,
          avgDurationMs: total > 0 ? sorted.reduce((a, b) => a + b, 0) / total : 0,
          minDurationMs: sorted[0] || 0,
          maxDurationMs: sorted[sorted.length - 1] || 0,
          p50DurationMs: sorted[Math.floor(total * 0.5)] || 0,
          p95DurationMs: sorted[Math.floor(total * 0.95)] || 0,
          totalDurationMs: sorted.reduce((a, b) => a + b, 0),
        });
      }

      // Sort stats by total count descending
      stats.sort((a, b) => b.totalCount - a.totalCount);

      // Global summary
      const allDurations = timeline.map(t => t.durationMs);
      const totalSuccess = timeline.filter(t => t.success).length;
      const totalFail = timeline.filter(t => !t.success).length;
      const timespan = timeline.length > 1
        ? timeline[0].timestamp - timeline[timeline.length - 1].timestamp
        : 0;

      const summary = {
        totalCalls: timeline.length,
        totalSuccess,
        totalFail,
        overallSuccessRate: timeline.length > 0 ? totalSuccess / timeline.length : 0,
        totalDurationMs: allDurations.reduce((a, b) => a + b, 0),
        avgDurationMs: allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length : 0,
        uniqueToolCount: toolGroups.size,
        timespanMs: timespan,
      };

      return {
        success: true,
        data: { timeline, stats, summary },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
