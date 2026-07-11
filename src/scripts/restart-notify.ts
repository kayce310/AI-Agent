/** @file restart-notify — write/read restart marker file */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MARKER = path.join(os.tmpdir(), 'coral-restart.json');

export function writeRestartMarker(chatId: string): void {
  try { fs.writeFileSync(MARKER, JSON.stringify({ chatId, ts: Date.now() }), 'utf8'); } catch {}
}

export function readRestartMarker(): { chatId: string } | null {
  try {
    if (!fs.existsSync(MARKER)) return null;
    const data = JSON.parse(fs.readFileSync(MARKER, 'utf8'));
    fs.unlinkSync(MARKER);
    return data;
  } catch {
    try { fs.unlinkSync(MARKER); } catch {}
    return null;
  }
}
