#!/usr/bin/env node
/**
 * @file kato-state-manager — Startup script (CLI bridge)
 * @layer scripts
 * @depends-on (none — standalone, calls core via subprocess)
 * @owner infrastructure
 *
 * P1-1 fix: scripts/ no longer imports from core/.
 * Instead, delegates to core/cli/state-manager-bridge.ts via npx tsx.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const [, , command = 'read', ...args] = process.argv;

interface StateResult {
  ok: boolean;
  error?: { code: string; message: string; details?: unknown };
  [key: string]: unknown;
}

/**
 * Call core state manager via subprocess to maintain layer boundary.
 * scripts/ must not import from core/ (R2 import path integrity rule).
 */
function callStateManager(commandName: string, commandArgs: string[]): Promise<StateResult> {
  return new Promise((resolve) => {
    const bridgePath = path.join(PROJECT_ROOT, 'src/core/cli/state-manager-bridge.ts');
    const child = spawn('npx', ['tsx', bridgePath, commandName, ...commandArgs], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number | null) => {
      try {
        const result = JSON.parse(stdout) as StateResult;
        resolve(result);
      } catch {
        resolve({
          ok: false,
          error: {
            code: 'PARSE_ERROR',
            message: `Failed to parse state manager output (exit ${code})`,
            details: { stdout: stdout.slice(0, 500), stderr: stderr.slice(0, 500) },
          },
        });
      }
    });

    child.on('error', (err: Error) => {
      resolve({
        ok: false,
        error: {
          code: 'SUBPROCESS_ERROR',
          message: `Failed to spawn state manager: ${err.message}`,
        },
      });
    });
  });
}

async function main(): Promise<void> {
  const result = await callStateManager(command, args);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    ok: false,
    error: {
      code: 'UNHANDLED_STATE_MANAGER_ERROR',
      message: error instanceof Error ? error.message : String(error),
    },
  }, null, 2));
  process.exit(1);
});
