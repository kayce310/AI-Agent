/**
 * @file state-manager — Memory module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve project root from script location (src/core/state-manager.ts → ../../)
// NOT from process.cwd(), to prevent creating duplicate state.json
// when agent runs commands from a different directory
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export type AgentLifecycle = 'UNINITIALIZED' | 'INITIALIZING' | 'READY' | 'BLOCKED' | 'ERROR';

export interface KatoWorkspaceState {
  schemaVersion: '1.0';
  agent: {
    lifecycle: AgentLifecycle;
    role: string | null;
    loadedSkills: string[];
    lastInitializedAt: string | null;
    readyAt: string | null;
  };
  session: {
    id: string;
    startedAt: string;
    updatedAt: string;
    currentTask: string | null;
  };
  modelCooldowns?: Record<string, string>;
  controlPlane: {
    bootloader: 'KATO.md';
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

export interface ProcessedFile {
  path: string;
  type: 'code' | 'document' | 'config' | 'script' | 'other';
  processedAt: string;
  checksum: string;
  action: 'integrated' | 'archived' | 'reference_created';
  destination?: string;
}

export interface ProcessedFilesState {
  schemaVersion: '1.0';
  meta: {
    description: string;
    lastUpdated: string | null;
  };
  files: ProcessedFile[];
  stats: {
    totalProcessed: number;
    byType: Record<string, number>;
  };
}

export interface CheckpointState {
  mandatoryChecks: {
    beforeFileWrite: string[];
    afterFileWrite: string[];
    onToolCallFail: string[];
  };
  techDebt: {
    openItems: Array<{
      id: string;
      priority: string;
      description: string;
      owner: string;
      targetSession: string;
    }>;
  };
}

export interface UnifiedState {
  version: '1.0';
  lastUpdated: string;
  state: KatoWorkspaceState | null;
  checkpoint: CheckpointState | null;
  processedFiles: ProcessedFilesState | null;
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

// Resolve paths relative to PROJECT_ROOT (script location), NOT process.cwd()
// This prevents duplicate state.json when agent runs from wrong CWD
const DEFAULT_STATE_PATH = path.join(PROJECT_ROOT, 'knowledge/workspace/state.json');
const DEFAULT_PROCESSED_FILES_PATH = path.join(PROJECT_ROOT, 'knowledge/workspace/processed-files.json');
const DEFAULT_CHECKPOINT_PATH = path.join(PROJECT_ROOT, 'knowledge/workspace/checkpoint.json');
const CURRENT_STATE_PATH = path.join(PROJECT_ROOT, '.kato/state/current.json');
const TRANSACTION_LOG_DIR = '.kato/state';
const TRANSACTION_LOG_FILE = 'transactions.log';

const LOCK_SUFFIX = '.lock';
const TMP_SUFFIX = '.tmp';
const BACKUP_SUFFIX = '.bak.1';
const LOCK_STALE_MS = 30_000;

export class KatoStateManager {
  constructor(
    private readonly statePath = DEFAULT_STATE_PATH,
    private readonly processedFilesPath = DEFAULT_PROCESSED_FILES_PATH,
    private readonly checkpointPath = DEFAULT_CHECKPOINT_PATH,
    private readonly currentStatePath = CURRENT_STATE_PATH
  ) {}

  async scanBlueprint(): Promise<StructuredStateResult<{
    newFiles: string[];
    alreadyProcessed: string[];
    totalUntracked: number;
  }>> {
    try {
      const { execSync } = await import('node:child_process');
      const gitOutput = execSync('git status --porcelain', { encoding: 'utf8' });
      const untrackedFiles = gitOutput
        .split('\n')
        .filter(line => line.startsWith('?? '))
        .map(line => line.substring(3).trim())
        .filter(path => path.startsWith('knowledge/blueprints/'));

      const processedState = await this.readProcessedFiles();
      const processedPaths = new Set(processedState.files.map(f => f.path));

      const newFiles = untrackedFiles.filter(f => !processedPaths.has(f));
      const alreadyProcessed = untrackedFiles.filter(f => processedPaths.has(f));

      return {
        ok: true,
        data: {
          newFiles,
          alreadyProcessed,
          totalUntracked: untrackedFiles.length,
        },
      };
    } catch (error) {
      return this.error('BLUEPRINT_SCAN_FAILED', 'Unable to scan blueprints', this.normalizeError(error));
    }
  }

  async markFileProcessed(file: ProcessedFile): Promise<StructuredStateResult<ProcessedFilesState>> {
    try {
      const state = await this.readProcessedFiles();
      state.files = state.files.filter(f => f.path !== file.path);
      state.files.push(file);
      state.stats.totalProcessed = state.files.length;
      state.stats.byType[file.type] = (state.stats.byType[file.type] || 0) + 1;
      state.meta.lastUpdated = new Date().toISOString();
      return this.writeProcessedFiles(state);
    } catch (error) {
      return this.error('MARK_PROCESSED_FAILED', 'Unable to mark file as processed', this.normalizeError(error));
    }
  }

  classifyFile(filePath: string): ProcessedFile['type'] {
    const ext = path.extname(filePath).toLowerCase();
    const codeExts = ['.ts', '.js', '.m', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs'];
    const docExts = ['.pdf', '.docx', '.doc', '.txt', '.md'];
    const configExts = ['.json', '.yml', '.yaml', '.toml', '.xml'];
    const scriptExts = ['.sh', '.bash', '.ps1', '.bat'];

    if (codeExts.includes(ext)) return 'code';
    if (docExts.includes(ext)) return 'document';
    if (configExts.includes(ext)) return 'config';
    if (scriptExts.includes(ext)) return 'script';
    return 'other';
  }

  async beginTx(intent: string): Promise<StructuredStateResult<{ txId: string; logPath: string }>> {
    try {
      const txLogDir = path.join(PROJECT_ROOT, TRANSACTION_LOG_DIR);
      const txLogPath = path.join(txLogDir, TRANSACTION_LOG_FILE);
      await mkdir(txLogDir, { recursive: true });

      const txId = `tx-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
      const entry = {
        txId,
        phase: 'BEGIN',
        timestamp: new Date().toISOString(),
        intent,
      };

      await writeFile(txLogPath, `${JSON.stringify(entry)}\n`, { flag: 'as' });
      return { ok: true, data: { txId, logPath: txLogPath } };
    } catch (error) {
      return this.error('TX_BEGIN_FAILED', 'Unable to begin transaction', this.normalizeError(error));
    }
  }

  async commitTx(txId: string): Promise<StructuredStateResult<{ logPath: string }>> {
    try {
      const txLogDir = path.join(PROJECT_ROOT, TRANSACTION_LOG_DIR);
      const txLogPath = path.join(txLogDir, TRANSACTION_LOG_FILE);
      await mkdir(txLogDir, { recursive: true });

      const entry = {
        txId,
        phase: 'COMMIT',
        timestamp: new Date().toISOString(),
        intent: null,
      };

      await writeFile(txLogPath, `${JSON.stringify(entry)}\n`, { flag: 'as' });
      return { ok: true, data: { logPath: txLogPath } };
    } catch (error) {
      return this.error('TX_COMMIT_FAILED', 'Unable to commit transaction', this.normalizeError(error));
    }
  }

  async readCheckpoint(): Promise<StructuredStateResult<CheckpointState>> {
    try {
      if (!existsSync(this.checkpointPath)) {
        return this.error('CHECKPOINT_NOT_FOUND', 'checkpoint.json does not exist');
      }
      const raw = await readFile(this.checkpointPath, 'utf8');
      const parsed = JSON.parse(raw) as CheckpointState;
      return { ok: true, data: parsed };
    } catch (error) {
      return this.error('CHECKPOINT_READ_FAILED', 'Unable to read checkpoint.json', this.normalizeError(error));
    }
  }

  // ── Unified state (current.json) ──

  async readCurrentState(): Promise<StructuredStateResult<UnifiedState>> {
    try {
      if (!existsSync(this.currentStatePath)) {
        // Fallback: build from legacy files
        const stateResult = existsSync(this.statePath) ? await this.read() : null;
        const checkpointResult = await this.readCheckpoint();
        const processedResult = await this.readProcessedFiles();
        return {
          ok: true,
          data: {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            state: stateResult?.ok ? stateResult.data : null,
            checkpoint: checkpointResult.ok ? checkpointResult.data : null,
            processedFiles: processedResult,
          },
        };
      }
      const raw = await readFile(this.currentStatePath, 'utf8');
      const parsed = JSON.parse(raw) as UnifiedState;
      return { ok: true, data: parsed };
    } catch (error) {
      return this.error('CURRENT_STATE_READ_FAILED', 'Unable to read current.json', this.normalizeError(error));
    }
  }

  async syncUnifiedState(): Promise<StructuredStateResult<UnifiedState>> {
    try {
      const stateResult = existsSync(this.statePath) ? await this.read() : null;
      const checkpointResult = await this.readCheckpoint();
      const processedResult = await this.readProcessedFiles();

      const unified: UnifiedState = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        state: stateResult?.ok ? stateResult.data : null,
        checkpoint: checkpointResult.ok ? checkpointResult.data : null,
        processedFiles: processedResult,
      };

      await mkdir(path.dirname(this.currentStatePath), { recursive: true });
      await writeFile(this.currentStatePath, `${JSON.stringify(unified, null, 2)}\n`, 'utf8');
      return { ok: true, data: unified };
    } catch (error) {
      return this.error('SYNC_UNIFIED_FAILED', 'Unable to sync current.json', this.normalizeError(error));
    }
  }

  // ── Verify & Repair ──

  async verify(): Promise<StructuredStateResult<{
    consistent: boolean;
    warnings: Array<{ field: string; message: string }>;
  }>> {
    const warnings: Array<{ field: string; message: string }> = [];

    try {
      const currentResult = await this.readCurrentState();
      if (!currentResult.ok) {
        warnings.push({ field: 'current', message: 'Cannot read current.json — ' + currentResult.error.message });
        return { ok: true, data: { consistent: false, warnings } };
      }

      const current = currentResult.data;

      // Compare state.json with current.json
      if (current.state && existsSync(this.statePath)) {
        const stateResult = await this.read();
        if (stateResult.ok) {
          if (stateResult.data.session.id !== current.state.session.id) {
            warnings.push({ field: 'state', message: `state.json session ID differs from current.json` });
          }
        } else {
          warnings.push({ field: 'state', message: 'state.json unreadable: ' + stateResult.error.message });
        }
      }

      // Compare checkpoint.json with current.json
      if (current.checkpoint && existsSync(this.checkpointPath)) {
        const cpResult = await this.readCheckpoint();
        if (cpResult.ok) {
          const cpItems = cpResult.data.techDebt.openItems.length;
          const currItems = current.checkpoint.techDebt.openItems.length;
          if (cpItems !== currItems) {
            warnings.push({ field: 'checkpoint', message: `checkpoint.json has ${cpItems} items, current.json has ${currItems}` });
          }
        }
      }

      // Compare processed-files.json with current.json
      if (current.processedFiles && existsSync(this.processedFilesPath)) {
        const pfResult = await this.readProcessedFiles();
        const currPf = current.processedFiles;
        if (pfResult.files.length !== currPf.files.length) {
          warnings.push({ field: 'processedFiles', message: `processed-files.json has ${pfResult.files.length} files, current.json has ${currPf.files.length}` });
        }
      }

      return {
        ok: true,
        data: { consistent: warnings.length === 0, warnings },
      };
    } catch (error) {
      return this.error('VERIFY_FAILED', 'Unable to verify state consistency', this.normalizeError(error));
    }
  }

  async repair(): Promise<StructuredStateResult<{ fixed: string[] }>> {
    const fixed: string[] = [];

    try {
      // Build current.json from legacy files
      const stateResult = existsSync(this.statePath) ? await this.read() : null;
      const checkpointResult = await this.readCheckpoint();
      const processedResult = await this.readProcessedFiles();

      const unified: UnifiedState = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        state: stateResult?.ok ? stateResult.data : null,
        checkpoint: checkpointResult.ok ? checkpointResult.data : null,
        processedFiles: processedResult,
      };

      await mkdir(path.dirname(this.currentStatePath), { recursive: true });
      await writeFile(this.currentStatePath, `${JSON.stringify(unified, null, 2)}\n`, 'utf8');
      fixed.push('current.json rebuilt from legacy files');

      return { ok: true, data: { fixed } };
    } catch (error) {
      return this.error('REPAIR_FAILED', 'Unable to repair state', this.normalizeError(error));
    }
  }

  private async readProcessedFiles(): Promise<ProcessedFilesState> {
    if (!existsSync(this.processedFilesPath)) {
      return {
        schemaVersion: '1.0',
        meta: { description: 'Track processed files to skip scanning on next session', lastUpdated: null },
        files: [],
        stats: { totalProcessed: 0, byType: {} },
      };
    }
    const raw = await readFile(this.processedFilesPath, 'utf8');
    return JSON.parse(raw) as ProcessedFilesState;
  }

  private async writeProcessedFiles(state: ProcessedFilesState): Promise<StructuredStateResult<ProcessedFilesState>> {
    try {
      await mkdir(path.dirname(this.processedFilesPath), { recursive: true });
      await writeFile(this.processedFilesPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
      // Sync unified state after processed-files write
      await this.syncUnifiedState().catch(() => undefined);
      return { ok: true, data: state };
    } catch (error) {
      return this.error('WRITE_PROCESSED_FILES_FAILED', 'Unable to write processed-files.json', this.normalizeError(error));
    }
  }

  async init(currentTask: string | null = null): Promise<StructuredStateResult<KatoWorkspaceState>> {
    if (existsSync(this.statePath)) {
      // Try reading existing state — if it's valid, return it
      const existing = await this.read();
      if (existing.ok) return existing;
      // If read fails (e.g. schema mismatch, old format), overwrite with fresh state
      console.warn(`[state-manager] Existing state.json is incompatible, creating fresh state: ${existing.error.message}`);
    }

    const now = new Date().toISOString();
    const state = this.withChecksum({
      schemaVersion: '1.0',
      agent: {
        lifecycle: 'UNINITIALIZED',
        role: null,
        loadedSkills: [],
        lastInitializedAt: null,
        readyAt: null,
      },
      session: {
        id: `session-${now.replace(/[:.]/g, '-')}-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
        startedAt: now,
        updatedAt: now,
        currentTask,
      },
      controlPlane: {
        bootloader: 'KATO.md',
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
    const now = new Date().toISOString();
    return this.update({
      agent: {
        lifecycle: 'READY',
        role,
        loadedSkills,
        lastInitializedAt: now,
        readyAt: now,
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

      // Sync unified state after each state write
      await this.syncUnifiedState().catch(() => undefined);

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
    if (!['UNINITIALIZED', 'INITIALIZING', 'READY', 'BLOCKED', 'ERROR'].includes(state.agent.lifecycle)) {
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
