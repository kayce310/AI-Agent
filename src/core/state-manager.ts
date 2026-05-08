import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type AgentLifecycle = 'UNINITIALIZED' | 'INITIALIZING' | 'READY' | 'ERROR';

export interface KatoWorkspaceState {
  schemaVersion: '1.0';
  agent: {
    lifecycle: AgentLifecycle;
    role: string | null;
    loadedSkills: string[];
    lastInitializedAt: string | null;
  };
  session: {
    id: string;
    startedAt: string;
    updatedAt: string;
    currentTask: string | null;
  };
  controlPlane: {
    bootloader: 'CLINE.md';
    router: 'knowledge/wiki/AGENTS.md';
    index: 'knowledge/wiki/index.md';
  };
  dataPlane: {
    statePath: 'knowledge/workspace/state.json';
    manager: 'kato-state-manager';
    checksum: string;
  };
  notes: string[];
}

export interface StructuredStateError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface StructuredStateSuccess<T> {
  ok: true;
  data: T;
}

export type StructuredStateResult<T> = StructuredStateSuccess<T> | StructuredStateError;

const DEFAULT_STATE_PATH = path.resolve('knowledge/workspace/state.json');
const LOCK_SUFFIX = '.lock';
const TMP_SUFFIX = '.tmp';
const BACKUP_SUFFIX = '.bak.1';
const LOCK_STALE_MS = 30_000;

export class KatoStateManager {
  constructor(private readonly statePath = DEFAULT_STATE_PATH) {}

  async init(currentTask: string | null = null): Promise<StructuredStateResult<KatoWorkspaceState>> {
    if (existsSync(this.statePath)) {
      return this.read();
    }

    const now = new Date().toISOString();
    const state = this.withChecksum({
      schemaVersion: '1.0',
      agent: {
        lifecycle: 'UNINITIALIZED',
        role: null,
        loadedSkills: [],
        lastInitializedAt: null,
      },
      session: {
        id: `session-${now.replace(/[:.]/g, '-')}`,
        startedAt: now,
        updatedAt: now,
        currentTask,
      },
      controlPlane: {
        bootloader: 'CLINE.md',
        router: 'knowledge/wiki/AGENTS.md',
        index: 'knowledge/wiki/index.md',
      },
      dataPlane: {
        statePath: 'knowledge/workspace/state.json',
        manager: 'kato-state-manager',
        checksum: '',
      },
      notes: ['Initialized by kato-state-manager. Agent must read AGENTS.md before READY.'],
    });

    return this.write(state);
  }

  async read(): Promise<StructuredStateResult<KatoWorkspaceState>> {
    try {
      const raw = await readFile(this.statePath, 'utf8');
      const parsed = JSON.parse(raw) as KatoWorkspaceState;
      this.assertValid(parsed);
      const expected = this.computeChecksum(parsed);
      if (parsed.dataPlane.checksum !== expected) {
        return this.error('CHECKSUM_MISMATCH', 'state.json checksum does not match file contents', {
          expected,
          actual: parsed.dataPlane.checksum,
        });
      }
      return { ok: true, data: parsed };
    } catch (error) {
      return this.error('STATE_READ_FAILED', 'Unable to read state.json', this.normalizeError(error));
    }
  }

  async update(patch: Partial<KatoWorkspaceState>): Promise<StructuredStateResult<KatoWorkspaceState>> {
    const current = existsSync(this.statePath) ? await this.read() : await this.init();
    if (!current.ok) return current;

    const merged = this.withChecksum({
      ...current.data,
      ...patch,
      agent: { ...current.data.agent, ...patch.agent },
      session: {
        ...current.data.session,
        ...patch.session,
        updatedAt: new Date().toISOString(),
      },
      controlPlane: { ...current.data.controlPlane, ...patch.controlPlane },
      dataPlane: { ...current.data.dataPlane, ...patch.dataPlane, checksum: '' },
      notes: patch.notes ?? current.data.notes,
    });

    return this.write(merged);
  }

  async markReady(role: string, loadedSkills: string[]): Promise<StructuredStateResult<KatoWorkspaceState>> {
    return this.update({
      agent: {
        lifecycle: 'READY',
        role,
        loadedSkills,
        lastInitializedAt: new Date().toISOString(),
      },
    });
  }

  private async write(state: KatoWorkspaceState): Promise<StructuredStateResult<KatoWorkspaceState>> {
    const lockPath = `${this.statePath}${LOCK_SUFFIX}`;
    const tmpPath = `${this.statePath}${TMP_SUFFIX}`;
    const backupPath = `${this.statePath}${BACKUP_SUFFIX}`;

    try {
      await this.acquireLock(lockPath);
      await mkdir(path.dirname(this.statePath), { recursive: true });

      if (existsSync(this.statePath)) {
        const currentRaw = await readFile(this.statePath, 'utf8');
        await writeFile(backupPath, currentRaw, 'utf8');
      }

      const finalState = this.withChecksum(state);
      await writeFile(tmpPath, `${JSON.stringify(finalState, null, 2)}\n`, 'utf8');
      await rename(tmpPath, this.statePath);

      return { ok: true, data: finalState };
    } catch (error) {
      return this.error('STATE_WRITE_FAILED', 'Unable to atomically write state.json', this.normalizeError(error));
    } finally {
      await rm(lockPath, { force: true }).catch(() => undefined);
      await rm(tmpPath, { force: true }).catch(() => undefined);
    }
  }

  private async acquireLock(lockPath: string): Promise<void> {
    if (existsSync(lockPath)) {
      const lockStat = await stat(lockPath);
      const ageMs = Date.now() - lockStat.mtimeMs;
      if (ageMs < LOCK_STALE_MS) {
        throw new Error(`State lock exists: ${lockPath}`);
      }
      await rm(lockPath, { force: true });
    }
    await writeFile(lockPath, `${process.pid}\n${new Date().toISOString()}\n`, { flag: 'wx' });
  }

  private assertValid(state: KatoWorkspaceState): void {
    if (state.schemaVersion !== '1.0') throw new Error('Unsupported schemaVersion');
    if (!['UNINITIALIZED', 'INITIALIZING', 'READY', 'ERROR'].includes(state.agent.lifecycle)) {
      throw new Error(`Invalid lifecycle: ${state.agent.lifecycle}`);
    }
    if (state.dataPlane.manager !== 'kato-state-manager') throw new Error('Invalid state manager');
  }

  private withChecksum(state: KatoWorkspaceState): KatoWorkspaceState {
    const withoutChecksum = { ...state, dataPlane: { ...state.dataPlane, checksum: '' } };
    return {
      ...withoutChecksum,
      dataPlane: {
        ...withoutChecksum.dataPlane,
        checksum: this.computeChecksum(withoutChecksum),
      },
    };
  }

  private computeChecksum(state: KatoWorkspaceState): string {
    const normalized = JSON.stringify({ ...state, dataPlane: { ...state.dataPlane, checksum: '' } });
    return createHash('sha256').update(normalized).digest('hex');
  }

  private error(code: string, message: string, details?: unknown): StructuredStateError {
    return { ok: false, error: { code, message, details } };
  }

  private normalizeError(error: unknown): Record<string, string> {
    return error instanceof Error ? { name: error.name, message: error.message } : { message: String(error) };
  }
}

export const katoStateManager = new KatoStateManager();