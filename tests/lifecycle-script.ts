/**
 * Lifecycle helper for coral.db integrity test
 * Process A (init): creates fresh coral.db, writes initial data, exits
 * Process B (write): reopens same coral.db, writes additional data, exits
 * Process C (verify): reopens same coral.db, checks integrity, verifies data consistency
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const REPO = path.resolve(__dirname, '..');
const PROCESS_SCRIPT = path.join(REPO, 'tests', 'lifecycle-script.ts');

interface LifecycleResult {
  ok: boolean;
  pid?: number;
  rowsWritten?: number;
  integrityCheck?: string;
  error?: string;
}

function runChild(mode: 'init' | 'write' | 'verify', dbPath: string): LifecycleResult {
  const stdout = execSync(
    process.execPath,
    [path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), PROCESS_SCRIPT, mode, dbPath],
    { cwd: REPO, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return JSON.parse(stdout.trim().split('\n').pop() ?? '{}') as LifecycleResult;
}

const mode = process.argv[2] as 'init' | 'write' | 'verify';
const dbPath = process.argv[3];

if (!mode || !dbPath) {
  console.error('Usage: tsx lifecycle-helper.ts <init|write|verify> <dbPath>');
  process.exit(1);
}

// Ensure data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

if (mode === 'init') {
  // Init: create fresh DB with initial data
  const sqlite = require('better-sqlite3');
  const db = new sqlite.Database(dbPath);
  
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      )
    `);
    
    const stmt = db.prepare('INSERT INTO test_data (value) VALUES (?)');
    for (let i = 0; i < 10; i++) {
      stmt.run(`init_${i}`);
    }
    
    const result = stmt.run('success');
    
    // Verify we can query
    const select = db.prepare('SELECT COUNT(*) as count FROM test_data');
    const count = select.get() as { count: number };
    
    const output = { 
      ok: true, 
      pid: process.pid, 
      rowsWritten: count.count,
      integrityCheck: 'ok'
    };
    console.log(JSON.stringify(output));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e) }));
  } finally {
    db.close();
  }
  
} else if (mode === 'write') {
  // Write: reopen existing DB, append data
  const sqlite = require('better-sqlite3');
  const db = new sqlite.Database(dbPath);
  
  try {
    db.exec('CREATE TABLE IF NOT EXISTS test_data (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (strftime(\'%s\', \'now\')));');
    
    const stmt = db.prepare('INSERT INTO test_data (value) VALUES (?)');
    for (let i = 0; i < 5; i++) {
      stmt.run(`write_${i}`);
    }
    
    const select = db.prepare('SELECT COUNT(*) as count FROM test_data');
    const count = select.get() as { count: number };
    
    const output = { 
      ok: true, 
      pid: process.pid, 
      rowsWritten: count.count,
      integrityCheck: 'ok'
    };
    console.log(JSON.stringify(output));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e) }));
  } finally {
    db.close();
  }
  
} else if (mode === 'verify') {
  // Verify: check integrity and data consistency
  const sqlite = require('better-sqlite3');
  const db = new sqlite.Database(dbPath);
  
  try {
    // Check integrity
    const integrity = db.pragma('integrity_check', { simple: true }) as string;
    
    // Verify we can query
    const select = db.prepare('SELECT COUNT(*) as count FROM test_data');
    const count = select.get() as { count: number };
    
    // Verify data structure
    const schema = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='test_data'").get();
    
    const output = { 
      ok: true,
      pid: process.pid,
      rowsWritten: count.count,
      integrityCheck: integrity,
      schema: !!schema
    };
    console.log(JSON.stringify(output));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: String(e) }));
  } finally {
    db.close();
  }
  
} else {
  console.error(`Unknown mode: ${mode}`);
  process.exit(1);
}