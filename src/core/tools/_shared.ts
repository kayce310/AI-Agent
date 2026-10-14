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
 * Whitelisted command prefixes — expanded for full agent capabilities.
 * Security via execFileSync (no shell) + risk-gate for dangerous commands.
 */
const COMMAND_WHITELIST_PREFIXES = [
  // VCS
  'git',
  // Runtime & package managers
  'node', 'npx tsx', 'npx', 'python', 'pip', 'npm',
  // Network tools
  'curl', 'wget', 'ngrok', 'cloudflared', 'ssh', 'scp', 'rsync',
  'ping', 'nslookup', 'dig', 'traceroute', 'netstat', 'ss',
  // Container & deploy
  'docker-compose', 'docker', 'docker compose',
  // File viewing (read-only)
  'ls', 'dir', 'cat', 'type', 'echo', 'head', 'tail', 'less', 'more',
  'wc', 'sort', 'uniq', 'cut', 'tr', 'diff', 'xxd', 'od',
  // File search
  'grep', 'rg', 'ag', 'find', 'fd', 'which', 'where', 'locate',
  // Windows-specific file search
  'findstr', 'find', 'more',
  // File operations (safe via execFileSync)
  'mkdir', 'touch', 'cp', 'mv', 'rm', 'rmdir', 'del', 'copy', 'xcopy', 'robocopy',
  // Archive
  'tar', 'zip', 'unzip', '7z', 'gzip', 'gunzip',
  // System inspection
  'ps', 'df', 'whoami', 'uname', 'date', 'time', 'uptime',
  'env', 'printenv', 'set', 'path',
  'tasklist', 'wmic', 'systeminfo', 'hostname',
  // Process management
  'kill', 'pkill', 'taskkill',
  // Cron
  'crontab', 'at',
  // Misc
  'pdftotext', 'code', 'code-server',
  'base64', 'md5sum', 'sha256sum',
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
  
  const trimmed = command.trim();
  
  // Reject dangerous command substitution & absolute security invariants
  const DANGEROUS_PATTERNS = [
    /`/,           // Command substitution: `rm -rf`
    /\$\(/,        // Process substitution: $(ls)
    /\$\{/,        // Variable expansion: ${PATH}
    /\b(mkfs|diskpart|format\s+[a-z]:)\b/i, // Disk destructive
    /\brmdir\s+[\/\\]s\s+[\/\\]q\s+[a-z]:[\/\\]/i, // Wipe drive root
    /\brm\s+-rf\s+[\/\\](?:\s|$)/i, // rm -rf /
    /(?:^|[^&])&(?:[^&]|$)/, // Background execution: single '&'
  ];
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }
  
  // Split compound commands by chaining/pipe operators: ';', '&&', '||', '|'
  const subCommands = trimmed
    .split(/(?:;{1,2}|&&|\|{1,2})/)
    .map(c => c.trim())
    .filter(c => c.length > 0);

  if (subCommands.length === 0) return false;

  // Every single sub-command must match a whitelisted prefix
  for (const sub of subCommands) {
    // Strip leading environment definitions or redirects (e.g. 2>/dev/null)
    const normalized = sub
      .replace(/2>&1|2>\s*\/dev\/null|>\s*\/dev\/null/gi, '')
      .trim()
      .toLowerCase();

    if (!normalized) continue;

    const matched = COMMAND_WHITELIST_PREFIXES.some(prefix => {
      // Check prefix either as exact start with space/boundary or exact match
      return normalized === prefix || normalized.startsWith(prefix + ' ') || normalized.startsWith(prefix + '\t');
    });

    if (!matched) {
      return false;
    }
  }
  
  return true;
}
