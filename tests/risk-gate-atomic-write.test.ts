import { describe, it, expect, beforeAll } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);
const PENDING = path.resolve(process.cwd(), 'data', 'pending-approvals.json');

// Child process: dùng code THẬT (risk-gate.registerPending), 25 lần ghi, sau mỗi
// lần đọc lại file và parse — nếu process khác để lại file nửa-ghi, JSON.parse fail.
const CHILD = `
import { registerPending } from './src/core/risk-gate.ts';
import * as fs from 'fs';
import * as path from 'path';
const file = path.resolve(process.cwd(), 'data', 'pending-approvals.json');
for (let i = 0; i < 25; i++) {
  registerPending('echo child-' + process.pid + '-' + i);
  const items = JSON.parse(fs.readFileSync(file, 'utf-8')); // throw nếu nửa-ghi
  if (!Array.isArray(items)) throw new Error('not an array');
}
console.log('child-done');
`;

describe('risk-gate atomic write (pending-approvals.json)', () => {
  beforeAll(() => {
    fs.mkdirSync(path.dirname(PENDING), { recursive: true });
    fs.writeFileSync(PENDING, '[]');
  });

  it('2 concurrent writers: file luôn JSON hợp lệ, không bao giờ đọc được nửa-ghi', async () => {
    const run = () =>
      execFileAsync(process.execPath, ['--import', 'tsx', '-e', CHILD], {
        cwd: process.cwd(),
        timeout: 60_000,
      });
    await Promise.all([run(), run()]);

    const items = JSON.parse(fs.readFileSync(PENDING, 'utf-8'));
    expect(Array.isArray(items)).toBe(true);
    // Mọi entry ghi thành công đều hợp lệ (id + status), không entry corrupt
    for (const it of items) {
      expect(typeof it.id).toBe('string');
      expect(it.status).toBe('pending');
    }
    // Không còn file temp sót lại
    expect(fs.existsSync(`${PENDING}.tmp`)).toBe(false);
  });
});
