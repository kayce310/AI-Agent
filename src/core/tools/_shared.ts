/**
 * Shared utilities for tool plugins
 */
import * as fs from 'fs';
import * as path from 'path';

export const BASE_PATH = path.resolve(process.cwd());

const SAFE_PATHS = [
  path.resolve(BASE_PATH),
  path.resolve(BASE_PATH, 'src'),
  path.resolve(BASE_PATH, 'knowledge'),
  path.resolve(BASE_PATH, 'config'),
  path.resolve(BASE_PATH, 'scripts'),
  path.resolve(BASE_PATH, 'docker'),
  path.resolve(BASE_PATH, '9router'),
];

export function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return SAFE_PATHS.some(safe => resolved.startsWith(safe));
}

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

    if (fs.existsSync(pfPath)) {
      data = JSON.parse(fs.readFileSync(pfPath, 'utf8'));
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

    fs.writeFileSync(pfPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`📝 auto-mark processed: ${entry.path} (${entry.action})`);
    return true;
  } catch (err: any) {
    console.error(`❌ Failed to mark processed file: ${err.message}`);
    return false;
  }
}

export function loadProcessedFiles(): string[] {
  try {
    const pfPath = path.join(BASE_PATH, 'knowledge/workspace/processed-files.json');
    if (fs.existsSync(pfPath)) {
      const data = JSON.parse(fs.readFileSync(pfPath, 'utf8'));
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