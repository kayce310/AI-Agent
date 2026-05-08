#!/usr/bin/env node
import { KatoStateManager } from '../core/state-manager.js';

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
    default:
      return {
        ok: false as const,
        error: {
          code: 'UNKNOWN_COMMAND',
          message: `Unsupported command: ${commandName}`,
          details: { supported: ['init', 'read', 'ready'] },
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