/**
 * @file SQLite Unified Storage — Memory + Session Search + Todo
 * @layer core
 * @depends-on better-sqlite3
 * @imported-by engine.ts, gateway
 * @owner core-storage
 *
 * Unified SQLite storage for Kato Agent:
 * - Memory: Persistent user facts/preferences across sessions
 * - Session: Full-text search over conversation history (FTS5)
 * - Todo: Task tracking with progress persistence
 *
 * Based on langchainjs patterns (17k stars, production-proven).
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'kato.db');

export class KatoStorage {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    // Ensure data directory exists
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      -- Memory: Persistent user facts/preferences
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        content TEXT NOT NULL,
        embedding TEXT,  -- JSON array for semantic search (optional)
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);

      -- Session: Conversation history with FTS5
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
        content TEXT NOT NULL,
        tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_session ON sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

      -- FTS5 virtual table for full-text search
      CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
        content,
        session_id,
        user_id,
        content=sessions,
        content_rowid=id
      );

      -- Triggers to keep FTS in sync
      CREATE TRIGGER IF NOT EXISTS sessions_ai AFTER INSERT ON sessions BEGIN
        INSERT INTO sessions_fts(rowid, content, session_id, user_id)
        VALUES (new.id, new.content, new.session_id, new.user_id);
      END;

      CREATE TRIGGER IF NOT EXISTS sessions_ad AFTER DELETE ON sessions BEGIN
        INSERT INTO sessions_fts(sessions_fts, rowid, content, session_id, user_id)
        VALUES('delete', old.id, old.content, old.session_id, old.user_id);
      END;

      CREATE TRIGGER IF NOT EXISTS sessions_au AFTER UPDATE ON sessions BEGIN
        INSERT INTO sessions_fts(sessions_fts, rowid, content, session_id, user_id)
        VALUES('delete', old.id, old.content, old.session_id, old.user_id);
        INSERT INTO sessions_fts(rowid, content, session_id, user_id)
        VALUES (new.id, new.content, new.session_id, new.user_id);
      END;

      -- Todo: Task tracking with progress
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'completed' | 'cancelled'
        priority INTEGER DEFAULT 0,  -- Higher = more priority
        parent_id INTEGER REFERENCES todos(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      CREATE INDEX IF NOT EXISTS idx_todos_parent ON todos(parent_id);
    `);
  }

  // ═══════════════════════════════════════════════════════════════
  // MEMORY OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  addMemory(userId: string, content: string, category: string = 'general'): number {
    const stmt = this.db.prepare(`
      INSERT INTO memories (user_id, content, category) VALUES (?, ?, ?)
    `);
    const result = stmt.run(userId, content, category);
    return result.lastInsertRowid as number;
  }

  getMemories(userId: string, category?: string, limit: number = 50): MemoryEntry[] {
    if (category) {
      return this.db.prepare(`
        SELECT * FROM memories WHERE user_id = ? AND category = ?
        ORDER BY created_at DESC LIMIT ?
      `).all(userId, category, limit) as MemoryEntry[];
    }
    return this.db.prepare(`
      SELECT * FROM memories WHERE user_id = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(userId, limit) as MemoryEntry[];
  }

  searchMemories(userId: string, query: string, limit: number = 10): MemoryEntry[] {
    return this.db.prepare(`
      SELECT * FROM memories
      WHERE user_id = ? AND content LIKE ?
      ORDER BY created_at DESC LIMIT ?
    `).all(userId, `%${query}%`, limit) as MemoryEntry[];
  }

  updateMemory(id: number, content: string): void {
    this.db.prepare(`
      UPDATE memories SET content = ?, updated_at = datetime('now') WHERE id = ?
    `).run(content, id);
  }

  deleteMemory(id: number): void {
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // SESSION OPERATIONS (with FTS5 search)
  // ═══════════════════════════════════════════════════════════════

  addSessionMessage(sessionId: string, userId: string, role: string, content: string, tokens: number = 0): number {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (session_id, user_id, role, content, tokens) VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(sessionId, userId, role, content, tokens);
    return result.lastInsertRowid as number;
  }

  getSessionHistory(sessionId: string, limit: number = 100): SessionMessage[] {
    return this.db.prepare(`
      SELECT * FROM sessions WHERE session_id = ?
      ORDER BY created_at ASC LIMIT ?
    `).all(sessionId, limit) as SessionMessage[];
  }

  searchSessions(query: string, userId?: string, limit: number = 20): SessionSearchResult[] {
    if (userId) {
      return this.db.prepare(`
        SELECT s.*, rank FROM sessions_fts fts
        JOIN sessions s ON s.id = fts.rowid
        WHERE sessions_fts MATCH ? AND s.user_id = ?
        ORDER BY rank LIMIT ?
      `).all(query, userId, limit) as SessionSearchResult[];
    }
    return this.db.prepare(`
      SELECT s.*, rank FROM sessions_fts fts
      JOIN sessions s ON s.id = fts.rowid
      WHERE sessions_fts MATCH ?
      ORDER BY rank LIMIT ?
    `).all(query, limit) as SessionSearchResult[];
  }

  getUserSessions(userId: string, limit: number = 20): SessionInfo[] {
    return this.db.prepare(`
      SELECT session_id, MIN(created_at) as started, MAX(created_at) as last_active,
             COUNT(*) as message_count
      FROM sessions WHERE user_id = ?
      GROUP BY session_id
      ORDER BY last_active DESC LIMIT ?
    `).all(userId, limit) as SessionInfo[];
  }

  // ═══════════════════════════════════════════════════════════════
  // TODO OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  addTodo(userId: string, title: string, description?: string, parentId?: number, priority: number = 0): number {
    const stmt = this.db.prepare(`
      INSERT INTO todos (user_id, title, description, parent_id, priority) VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(userId, title, description || null, parentId || null, priority);
    return result.lastInsertRowid as number;
  }

  getTodos(userId: string, status?: string): TodoItem[] {
    if (status) {
      return this.db.prepare(`
        SELECT * FROM todos WHERE user_id = ? AND status = ?
        ORDER BY priority DESC, created_at ASC
      `).all(userId, status) as TodoItem[];
    }
    return this.db.prepare(`
      SELECT * FROM todos WHERE user_id = ?
      ORDER BY priority DESC, created_at ASC
    `).all(userId) as TodoItem[];
  }

  getTodoProgress(userId: string): TodoProgress {
    const total = this.db.prepare(`
      SELECT COUNT(*) as count FROM todos WHERE user_id = ?
    `).get(userId) as { count: number };
    const completed = this.db.prepare(`
      SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND status = 'completed'
    `).get(userId) as { count: number };
    const inProgress = this.db.prepare(`
      SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND status = 'in_progress'
    `).get(userId) as { count: number };

    return {
      total: total.count,
      completed: completed.count,
      inProgress: inProgress.count,
      percentage: total.count > 0 ? Math.round((completed.count / total.count) * 100) : 0,
    };
  }

  updateTodoStatus(id: number, status: string): void {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    this.db.prepare(`
      UPDATE todos SET status = ?, completed_at = ?, updated_at = datetime('now') WHERE id = ?
    `).run(status, completedAt, id);
  }

  deleteTodo(id: number): void {
    this.db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  }

  // ═══════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ═══════════════════════════════════════════════════════════════

  close(): void {
    this.db.close();
  }

  // ═══ EVENT STORE ═══
  initEventTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_events (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_events_type ON agent_events(type);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON agent_events(timestamp);
    `);
  }

  getDb(): Database.Database {
    return this.db;
  }
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MemoryEntry {
  id: number;
  user_id: string;
  category: string;
  content: string;
  embedding?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  id: number;
  session_id: string;
  user_id: string;
  role: string;
  content: string;
  tokens: number;
  created_at: string;
}

export interface SessionSearchResult extends SessionMessage {
  rank: number;
}

export interface SessionInfo {
  session_id: string;
  started: string;
  last_active: string;
  message_count: number;
}

export interface TodoItem {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  parent_id?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface TodoProgress {
  total: number;
  completed: number;
  inProgress: number;
  percentage: number;
}

// Singleton
let _instance: KatoStorage | null = null;

export function getStorage(): KatoStorage {
  if (!_instance) {
    _instance = new KatoStorage();
  }
  return _instance;
}

export default KatoStorage;
