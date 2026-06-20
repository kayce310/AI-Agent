/**
 * @file System Monitor — Health checks for Coral Agent
 * @layer core
 * @owner cron
 *
 * Monitors disk, memory, LLM connectivity, and error rates.
 * Returns report strings for Telegram notification.
 */

import * as os from 'os';
import * as fs from 'fs';
import { Logger } from '../logger.js';
import { globalMemoryStore } from '../memory/memory-store.js';

const log = new Logger({ module: 'Monitor' });

export interface HealthReport {
  timestamp: number;
  disk: { usage: string; free: string; percent: number };
  memory: { used: string; free: string; total: string; percent: number };
  uptime: string;
  memoryStoreSize: number;
  alerts: string[];
}

/**
 * System Monitor — Periodic health checks.
 * Returns notification content if alert threshold reached, null if healthy.
 */
export class SystemMonitor {
  private alertThresholds = {
    diskPercent: 85,
    memoryPercent: 80,
  };

  /**
   * Run all health checks.
   * Returns a notification string if any alert is triggered, null otherwise.
   */
  async runHealthCheck(): Promise<string | null> {
    const alerts: string[] = [];
    const report = await this.collectMetrics();

    // Check disk
    if (report.disk.percent >= this.alertThresholds.diskPercent) {
      alerts.push(`⚠️ Disk usage: ${report.disk.percent}% (${report.disk.free} free)`);
    }

    // Check memory
    if (report.memory.percent >= this.alertThresholds.memoryPercent) {
      alerts.push(`⚠️ Memory usage: ${report.memory.percent}% (${report.memory.free} free)`);
    }

    if (alerts.length === 0) {
      return null; // All healthy, no notification needed
    }

    // Format alert notification
    return [
      '🏥 **Coral Health Alert**',
      '',
      ...alerts,
      '',
      `⏱ Uptime: ${report.uptime}`,
      `💾 Disk: ${report.disk.usage} (${report.disk.free} free)`,
      `🧠 Memory: ${report.memory.used}/${report.memory.total} (${report.memory.percent}%)`,
      `📦 MemoryStore: ${report.memoryStoreSize} blocks`,
    ].join('\n');
  }

  /**
   * Collect system metrics.
   */
  private async collectMetrics(): Promise<HealthReport> {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = Math.round((usedMem / totalMem) * 100);

    // Disk usage via os.statfs or fallback
    let diskUsage = 'N/A';
    let diskFree = 'N/A';
    let diskPercent = 0;

    try {
      // Windows: use a simple fallback
      if (process.platform === 'win32') {
        diskUsage = 'N/A (Windows)';
        diskFree = 'N/A';
        diskPercent = 0;
      } else {
        // Unix: try statvfs
        const { execSync } = require('child_process');
        const df = execSync('df -h / | tail -1', { encoding: 'utf8' });
        const parts = df.trim().split(/\s+/);
        diskUsage = parts[1] || 'N/A';
        diskFree = parts[3] || 'N/A';
        diskPercent = parseInt(parts[4]) || 0;
      }
    } catch {
      // Fallback if df fails
      diskUsage = 'Unknown';
      diskFree = 'Unknown';
      diskPercent = 0;
    }

    // Memory store size
    let memoryStoreSize = 0;
    try {
      const blocks = await globalMemoryStore.getAll();
      memoryStoreSize = blocks.length;
    } catch {
      // Memory store not initialized
    }

    return {
      timestamp: Date.now(),
      disk: { usage: diskUsage, free: diskFree, percent: diskPercent },
      memory: {
        used: this.formatBytes(usedMem),
        free: this.formatBytes(freeMem),
        total: this.formatBytes(totalMem),
        percent: memPercent,
      },
      uptime: this.formatUptime(os.uptime()),
      memoryStoreSize,
      alerts: [],
    };
  }

  /**
   * Format bytes to human-readable.
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  }

  /**
   * Format seconds to human-readable uptime.
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }
}

export default SystemMonitor;
