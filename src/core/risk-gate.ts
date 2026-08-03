/**
 * @file Risk Gate — ALLOW / ASK / DENY classification + file-based approval
 * @layer core
 * @owner core-security
 *
 * ponytail: ASK tier writes to data/pending-approvals.json and blocks.
 * Interactive approval via scripts/approve.js <id> | deny <id>.
 */
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export type RiskLevel = 'allow' | 'ask' | 'deny';

/** Map command patterns to risk levels */
const COMMAND_RISK: [RegExp, RiskLevel][] = [
  // DENY — destructive / system-critical
  [/^rm\s+-rf\s+\//, 'deny'],
  [/^taskkill\s+\/F\s+\/PID\s+[0-9]{1,4}$/, 'deny'],
  [/^docker\s+/, 'deny'],
  [/^shutdown|^reboot|^init\s+/, 'deny'],
  // DENY — credential exfil
  [/\.env(\s|$|\.)/i,    'deny'],  // cat .env, type .env.production, Get-Content .env
  [/^(env|printenv)$/i,  'deny'],  // dump entire environment
  [/^set(\s|$)/,         'deny'],  // Windows: set / set FOO (prints env vars)
  // ASK — network exfil risk
  [/^curl\s+/, 'ask'],
  [/^ngrok\s+/, 'ask'],
  [/^npx\s+/, 'ask'],
  // ALLOW — safe reads (default for whitelisted commands)
];

export function classifyCommand(command: string): RiskLevel {
  for (const [pattern, level] of COMMAND_RISK) {
    if (pattern.test(command)) return level;
  }
  return 'allow';
}

export function classifyFileWrite(targetPath: string, baseDir: string): RiskLevel {
  const resolved = targetPath.replace(/\\/g, '/');
  const base = baseDir.replace(/\\/g, '/');
  return resolved.startsWith(base) ? 'allow' : 'ask';
}

/** pendings file path */
function pendingPath(): string {
  return path.resolve(process.cwd(), 'data', 'pending-approvals.json');
}

export interface PendingApproval {
  id: string;
  command: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'denied';
}

function readPending(): PendingApproval[] {
  try {
    return JSON.parse(fs.readFileSync(pendingPath(), 'utf-8'));
  } catch { return []; }
}

function writePending(items: PendingApproval[]): void {
  const dir = path.dirname(pendingPath());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(pendingPath(), JSON.stringify(items, null, 2), 'utf-8');
}

/**
 * Register a pending approval and return the id.
 * Caller (execute_command handler) reads status later to decide execution.
 */
export function registerPending(command: string): string {
  const id = randomUUID().slice(0, 8);
  const items = readPending();
  items.push({ id, command, timestamp: Date.now(), status: 'pending' });
  writePending(items);
  return id;
}

/**
 * Approve or deny a pending command by id.
 * Returns the approved command string if approved, null if denied/not-found.
 */
export function resolvePending(id: string, action: 'approve' | 'deny'): string | null {
  const items = readPending();
  const idx = items.findIndex(p => p.id === id);
  if (idx === -1) return null;
  if (action === 'deny') {
    items[idx].status = 'denied';
    writePending(items);
    return null;
  }
  items[idx].status = 'approved';
  writePending(items);
  return items[idx].command;
}
