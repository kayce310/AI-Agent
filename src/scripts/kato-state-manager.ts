#!/usr/bin/env node
/**
 * @file kato-state-manager — Startup script
 * @layer scripts
 * @depends-on src/core/index.ts, src/modules/discord/index.ts
 * @owner infrastructure
 */
import { KatoStateManager, ProcessedFile } from '../core/memory/state-manager.js';

const [, , command = 'read', ...args] = process.argv;
const manager = new KatoStateManager();

async function main(): Promise<void> {
  const result = await runCommand(command, args);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

async function runCommand(commandName: string, commandArgs: string[]) {
  switch (commandName) {
    case 'init':
      return manager.init(commandArgs.join(' ') || null);
    case 'read':
      return manager.read();
    case 'ready': {
      const role = commandArgs[0] ?? 'Lead AI Engineer';
      const skills = commandArgs.slice(1);
      return manager.markReady(role, skills);
    }
    case 'verify':
      return manager.verify();
    case 'repair':
      return manager.repair();
    case 'begin-tx':
      return manager.beginTx(commandArgs.join(' ') || 'unknown');
    case 'commit-tx':
      return manager.commitTx(commandArgs[0] || '');
    case 'scan':
      return manager.scanBlueprint();
    case 'mark': {
      // Usage: mark <filepath> [action] [destination]
      // Example: mark knowledge/blueprints/test.ts integrated src/test.ts
      const filePath = commandArgs[0];
      if (!filePath) {
        return {
          ok: false as const,
          error: { code: 'MISSING_ARGUMENT', message: 'Usage: mark <filepath> [action] [destination]' },
        };
      }
      const action = (commandArgs[1] || 'integrated') as ProcessedFile['action'];
      const destination = commandArgs[2] || undefined;
      const fileType = manager.classifyFile(filePath);
      
      const processedFile: ProcessedFile = {
        path: filePath,
        type: fileType,
        processedAt: new Date().toISOString(),
        checksum: '', // TODO: compute actual checksum
        action,
        destination,
      };
      return manager.markFileProcessed(processedFile);
    }
    default:
      return {
        ok: false as const,
        error: {
          code: 'UNKNOWN_COMMAND',
          message: `Unsupported command: ${commandName}`,
          details: { supported: ['init', 'read', 'ready', 'scan', 'mark', 'verify', 'repair', 'begin-tx', 'commit-tx'] },
        },
      };
  }
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