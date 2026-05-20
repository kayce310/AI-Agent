/**
 * @file Tool Gateway — Centralized Security Gateway for all tool operations
 * @layer core
 * @depends-on src/core/security/privilege-guard.ts, src/core/agents/sandbox-executor.ts
 * @imported-by All tool plugins (filesystem, document, system, knowledge, archive, skills, report, _shared)
 * @owner core-security
 *
 * ZERO-TRUST: This is the ONLY file in src/core/tools/ allowed to import fs.
 * All other tools MUST route file operations through this gateway.
 */

import * as fs from 'fs';
import * as path from 'path';
import { isPathSafe } from '../security/privilege-guard.js';

export const WORKSPACE_ROOT = path.resolve(process.cwd());

/**
 * SecureRuntimeContext — Provides sandboxed file access for tools.
 * All paths validated through isPathSafe() before any I/O.
 */
export class SecureRuntimeContext {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = WORKSPACE_ROOT) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Validate a path is within workspace. Throws on violation.
   */
  private validatePath(inputPath: string): string {
    if (!isPathSafe(inputPath, this.workspaceRoot)) {
      throw new Error(`Path traversal blocked: "${inputPath}" is outside workspace root`);
    }
    return path.resolve(this.workspaceRoot, inputPath);
  }

  // ── Safe File Operations ──

  safeReadFile(inputPath: string): string {
    const resolved = this.validatePath(inputPath);
    return fs.readFileSync(resolved, 'utf8');
  }

  safeWriteFile(inputPath: string, content: string): void {
    const resolved = this.validatePath(inputPath);
    fs.writeFileSync(resolved, content, 'utf8');
  }

  safeExists(inputPath: string): boolean {
    const resolved = this.validatePath(inputPath);
    return fs.existsSync(resolved);
  }

  safeMkdir(inputPath: string): void {
    const resolved = this.validatePath(inputPath);
    fs.mkdirSync(resolved, { recursive: true });
  }

  safeUnlink(inputPath: string): void {
    const resolved = this.validatePath(inputPath);
    fs.unlinkSync(resolved);
  }

  safeReaddir(inputPath: string): fs.Dirent[] {
    const resolved = this.validatePath(inputPath);
    return fs.readdirSync(resolved, { withFileTypes: true });
  }

  safeStat(inputPath: string): fs.Stats {
    const resolved = this.validatePath(inputPath);
    return fs.statSync(resolved);
  }

  safeRm(inputPath: string): void {
    const resolved = this.validatePath(inputPath);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

// ── Singleton ──
export const secureRuntime = new SecureRuntimeContext();
