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
import { WORKSPACE_ROOT, isPathSafe } from './path-utils.js';
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
    `);
    return true;
  } catch (err: any) {
    console.warn(`[Tools] addProcessedFile error: ${err.message}`);
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

const COMMAND_WHITELIST_PREFIXES = [
  'npm', 'git', 'node', 'npx tsx', 'npx',
  'docker-compose', 'docker',
  'cd', 'dir', 'ls', 'cat', 'type', 'echo',
  'cmd /c', 'powershell',
  'code',
  'python', 'python3', 'pip', 'pip3',
  'pdftotext',
  'curl',
  'wget',
];

export function isCommandSafe(command: string): boolean {
  const trimmed = command.trim().toLowerCase();
  return COMMAND_WHITELIST_PREFIXES.some(prefix => trimmed.startsWith(prefix));
}

