/** @file restart-notify — write/read restart marker file */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MARKER = path.join(os.tmpdir(), 'coral-restart.json');
const READY_MARKER = path.join(os.tmpdir(), 'coral-ready.json');

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

/** Write readiness marker when Coral is fully initialized */
export function writeReadyMarker(): void {
  try {
    fs.writeFileSync(READY_MARKER, JSON.stringify({ ts: Date.now() }), 'utf8');
  } catch {}
}

/** Read readiness marker, delete it, return info or null */
export function readReadyMarker(): { ts: number } | null {
  try {
    if (!fs.existsSync(READY_MARKER)) return null;
    const data = JSON.parse(fs.readFileSync(READY_MARKER, 'utf8'));
    fs.unlinkSync(READY_MARKER);
    return data;
  } catch {
    try { fs.unlinkSync(READY_MARKER); } catch {}
    return null;
  }
}
