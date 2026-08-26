/**
 * @file atomic-write — R2 §3: torn-JSON-proof file writes.
 *
 * fs.writeFileSync alone is NOT atomic: a crash mid-write leaves a truncated
 * file that JSON.parse rejects on next boot. Fix: write to a temp file in the
 * SAME directory (same volume → rename is atomic), then fs.renameSync over
 * the destination. renameSync replaces an existing target on Windows and POSIX.
 */

import * as fs from 'fs';
import * as path from 'path';

export function atomicWriteFileSync(filePath: string, data: string): void {
  const dir = path.dirname(filePath);
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmpPath, data, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } finally {
    // Best effort: if rename failed (e.g. target locked), don't litter tmp files.
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
}
