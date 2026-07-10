/**
 * @file World Model — Cron-based polling probes + Delta Detector
 * @layer core
 * @owner world
 *
 * Layer 2: System/File/Network probes run every 30s via CronScheduler.
 * ponytail: Delta detector stores previous file snapshot in-memory,
 * emits world:delta event via EventBus if set.
 */
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { EventBus } from '../events/bus.js';
import { WorldDeltaSchema } from '../events/types.js';
import { randomUUID } from 'crypto';

export interface SystemSnapshot {
  cpus: number;
  loadAvg: number[];
  freeMemMb: number;
  totalMemMb: number;
  uptimeSec: number;
}

export interface FileSnapshot {
  files: string[];
  fileCount: number;
  totalSizeKb: number;
}

export interface FileDelta {
  added: string[];
  removed: string[];
  modified: string[];
}

export interface NetworkProbe {
  router9: boolean;
  timestamp: number;
}

export interface WorldReport {
  system: SystemSnapshot;
  files: FileSnapshot;
  network: NetworkProbe;
  delta?: FileDelta;
}

export class WorldModel {
  private lastSnapshot: string[] = [];
  private eventBus: EventBus | null = null;

  setEventBus(bus: EventBus): void { this.eventBus = bus; }

  systemProbe(): SystemSnapshot {
    return {
      cpus: os.cpus().length,
      loadAvg: os.loadavg(),
      freeMemMb: Math.round(os.freemem() / 1024 / 1024),
      totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
      uptimeSec: Math.floor(os.uptime()),
    };
  }

  /** Read knowledge/ dir recursively into a flat list of relative paths */
  private readKnowledgePaths(): string[] {
    try {
      const knowledgeDir = path.resolve(process.cwd(), 'knowledge');
      return fs.readdirSync(knowledgeDir, { recursive: true } as any)
        .filter((f: any) => typeof f === 'string' && !f.startsWith('.'))
        .map((f: any) => f.toString());
    } catch { return []; }
  }

  /** Compute delta between previous snapshot and current */
  private compareDelta(current: string[], prev: string[]): FileDelta {
    const prevSet = new Set(prev);
    const currSet = new Set(current);
    return {
      added: current.filter(f => !prevSet.has(f)),
      removed: prev.filter(f => !currSet.has(f)),
      modified: [], // ponytail: size-based comparison skipped; add when needed
    };
  }

  fileSystemProbe(): FileSnapshot {
    const files = this.readKnowledgePaths();
    const totalSizeKb = files.reduce((sum, f) => {
      try { return sum + fs.statSync(path.resolve(process.cwd(), 'knowledge', f)).size; }
      catch { return sum; }
    }, 0);
    return { files: files.slice(0, 50), fileCount: files.length, totalSizeKb: Math.round(totalSizeKb / 1024) };
  }

  async run(): Promise<WorldReport> {
    const files = this.readKnowledgePaths();
    const delta = this.lastSnapshot.length > 0 ? this.compareDelta(files, this.lastSnapshot) : undefined;
    this.lastSnapshot = files;

    // emit event if delta detected
    if (delta && (delta.added.length > 0 || delta.removed.length > 0) && this.eventBus) {
      const event = WorldDeltaSchema.parse({
        id: randomUUID(),
        timestamp: Date.now(),
        type: 'world:delta' as const,
        payload: { added: delta.added, removed: delta.removed },
        metadata: { source: 'world/model.ts', version: '1.0' },
      });
      this.eventBus.publish(event);
    }

    return {
      system: this.systemProbe(),
      files: { files: files.slice(0, 50), fileCount: files.length, totalSizeKb: Math.round(files.reduce((sum, f) => {
        try { return sum + fs.statSync(path.resolve(process.cwd(), 'knowledge', f)).size; }
        catch { return sum; }
      }, 0) / 1024) },
      network: { router9: false, timestamp: Date.now() }, // ponytail: placeholder; 9router hardcoded check removed
      delta,
    };
  }

  /** ponytail: returns last report fields for prompt injection without re-probing */
  getState(): string {
    const s = this.systemProbe();
    const f = this.fileSystemProbe();
    return `🌍 System: ${s.cpus}CPU, ${s.freeMemMb}/${s.totalMemMb}MB free, load ${s.loadAvg.join(', ')} | Knowledge: ${f.fileCount} files, ${f.totalSizeKb}KB`;
  }
}

export const worldModel = new WorldModel();
