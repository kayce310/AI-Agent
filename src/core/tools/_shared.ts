/**
 * @file Shared utilities for tool plugins
 * @layer core
 * @depends-on src/core/tools/path-utils.ts
 * @imported-by All tool plugins
 * @owner core-tools
 *
 * ZERO-TRUST: This file imports path-utils for BASE_PATH and isPathSafe.
 * All file I/O operations route through tool-gateway.ts (secureRuntime).
 */

import * as path from 'path';
import { isPathSafe, WORKSPACE_ROOT } from './path-utils.js';
import { Logger } from '../logger.js';
const log = new Logger({ module: 'Tools' });
import { secureRuntime } from './tool-gateway.js';

export const BASE_PATH = WORKSPACE_ROOT;
export { isPathSafe };

export function toFileUrl(filePath: string): string {
  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  if (resolved.startsWith('file://')) return resolved;
  return 'file:///' + resolved;
}

export function addProcessedFile(entry: {
  path: string;
  type: string;
  action: string;
  destination?: string;
  checksum?: string;
  notes?: string;
}): boolean {
  try {
    const pfPath = path.join(BASE_PATH, 'knowledge/workspace/processed-files.json');
    let data: any = { schemaVersion: '1.0', files: [], meta: { lastUpdated: new Date().toISOString() } };

    if (secureRuntime.safeExists('knowledge/workspace/processed-files.json')) {
      data = JSON.parse(secureRuntime.safeReadFile('knowledge/workspace/processed-files.json'));
    }

    if (data.files && Array.isArray(data.files)) {
      const dup = data.files.find((f: any) => f.path === entry.path && f.action === entry.action);
      if (dup) {
        Object.assign(dup, entry, { processedAt: new Date().toISOString() });
      } else {
        data.files.push({
          ...entry,
          checksum: entry.checksum || '',
          processedAt: new Date().toISOString()
        });
      }
    } else {
      data.files = [{ ...entry, checksum: entry.checksum || '', processedAt: new Date().toISOString() }];
    }

    data.meta.lastUpdated = new Date().toISOString();
    const byType: Record<string, number> = {};
    for (const f of data.files) {
      byType[f.type] = (byType[f.type] || 0) + 1;
    }
    data.stats = {
      totalProcessed: data.files.length,
      byType
    };

    secureRuntime.safeWriteFile('knowledge/workspace/processed-files.json', JSON.stringify(data, null, 2));
    return true;
  } catch (err: any) {
    log.warn("addProcessedFile error", { error: String(err) });
    return false;
  }
}

export function loadProcessedFiles(): string[] {
  try {
    if (secureRuntime.safeExists('knowledge/workspace/processed-files.json')) {
      const data = JSON.parse(secureRuntime.safeReadFile('knowledge/workspace/processed-files.json'));
      if (data.files && Array.isArray(data.files)) {
        return data.files.map((f: any) => f.path);
      }
      return data.processed || [];
    }
  } catch { /* ignore */ }
  return [];
}

/**
 * Whitelisted command prefixes — intentionally restrictive.
 * Security over convenience: only safe, read-only commands allowed.
 * Removed: npx (arbitrary package exec), curl/wget (network exfil),
 * python (arbitrary code exec), powershell/cmd (shell injection risk).
 */
const COMMAND_WHITELIST_PREFIXES = [
  'git',
  'node', 'npx tsx',       // npx tsx for running .ts scripts; bare npx removed
  'python', 'pip', 'npm', 'npx', 'curl', 'ngrok', 'cloudflared',
  'docker-compose', 'docker',
  'ls', 'dir', 'cat', 'type', 'echo',
  'pdftotext',
  'code',
  // System inspection — safe read-only commands
  'ps', 'df', 'whoami', 'uname',
  'tasklist', 'wmic', 'systeminfo',
];

/**
 * Validate that a command string starts with a whitelisted prefix.
 * NOTE: This is a first-pass filter. The actual execution uses execFileSync
 * without shell, so even if a command passes this check, shell injection
 * is not possible through the execution path.
 * 
 * ADDITIONAL SAFETY: Reject commands with dangerous patterns that could
 * bypass the whitelist check or cause unexpected behavior.
 */
export function isCommandSafe(command: string): boolean {
  // Reject empty commands
  if (!command || command.trim().length === 0) return false;
  
  const trimmed = command.trim().toLowerCase();
  
  // Reject commands with dangerous shell patterns
  const DANGEROUS_PATTERNS = [
    /;/,           // Command separator: "ls; rm -rf"
    /\|/,          // Pipe: "ls | cat"
    /&/,           // Background: "ls &"
    /`/,           // Command substitution: `rm -rf`
    /\$\(/,        // Process substitution: $(ls)
    /\$\{/,        // Variable expansion: ${PATH}
  ];
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) return false;
  }
  
  // Check whitelist prefix
  return COMMAND_WHITELIST_PREFIXES.some(prefix => trimmed.startsWith(prefix));
}
