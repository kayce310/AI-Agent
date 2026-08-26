/**
 * @file crash-handler — R2 §A/§4: last-resort process-level handlers.
 *
 * ONLY job: best-effort synchronous flush of dirty checkpoint state BEFORE
 * exit, then exit non-zero. No notification, no retry framework, no resource
 * cleanup, no orchestration (§4).
 *
 * Limitation (documented): cannot guarantee a flush on SIGKILL/power loss or
 * if the handler itself throws — this is best-effort only.
 */

import { getCheckpoint } from './checkpoint.js';
import { Logger } from './logger.js';

const log = new Logger({ module: 'CrashHandler' });

let installed = false;

/**
 * Install global uncaughtException/unhandledRejection handlers.
 * Idempotent; call once from a real entrypoint that boots an Engine.
 */
export function installCrashHandler(): void {
  if (installed) return;
  installed = true;

  const flushAndExit = (origin: string, err: unknown): void => {
    // Best-effort SYNC flush of dirty snapshots. flushSync swallows its own
    // errors so the handler can never throw before exiting.
    try {
      getCheckpoint().flushSync();
    } catch {
      /* nothing left to do — exit below regardless */
    }
    log.error(`[R2] ${origin}: flush done (best-effort), exiting`, { error: String(err) });
    process.exit(1);
  };

  process.on('uncaughtException', (err) => flushAndExit('uncaughtException', err));
  process.on('unhandledRejection', (reason) => flushAndExit('unhandledRejection', reason));
}
