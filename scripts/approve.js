#!/usr/bin/env node
/**
 * ponytail: file-based approval for ASK-tier commands
 *
 * Usage:
 *   node scripts/approve.js <id>          → approve + execute
 *   node scripts/approve.js deny <id>     → deny
 *   node scripts/approve.js list          → show pending
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { resolvePending } from '../src/core/risk-gate.js';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'list') {
    try {
      const p = path.resolve(process.cwd(), 'data', 'pending-approvals.json');
      const pendings = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const active = pendings.filter(p => p.status === 'pending');
      if (active.length === 0) { console.log('✅ Không có lệnh nào chờ phê duyệt.'); return; }
      console.log('📋 Các lệnh chờ phê duyệt:');
      for (const p of active) {
        console.log(`  [${p.id}] ${p.command} (${new Date(p.timestamp).toLocaleString()})`);
      }
    } catch { console.log('✅ Không có lệnh nào chờ phê duyệt.'); }
    return;
  }

  if (args[0] === 'deny' && args[1]) {
    const cmd = resolvePending(args[1], 'deny');
    console.log(cmd === null ? `❌ Đã từ chối lệnh ${args[1]}` : `❌ Đã từ chối lệnh ${args[1]}: ${cmd}`);
    return;
  }

  const cmd = resolvePending(args[0], 'approve');
  if (cmd === null) {
    console.log(`❌ Không tìm thấy lệnh với id: ${args[0]}`);
    process.exit(1);
  }
  console.log(`✅ Đã phê duyệt lệnh: ${cmd}`);
  try {
    const output = execSync(cmd, { timeout: 30000, encoding: 'utf-8', cwd: process.cwd() });
    console.log(`📤 Output:\n${output}`);
  } catch (e) {
    console.error(`❌ Lỗi khi chạy lệnh: ${e.message}`);
    if (e.stdout) console.log(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
  }
}

main();
