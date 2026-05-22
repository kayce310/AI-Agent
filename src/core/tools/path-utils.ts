/**
 * @file Path utilities — Shared path validation (no circular deps)
 * @layer core
 * @depends-on (none — standalone utility)
 * @imported-by src/core/tools/tool-gateway.ts, src/core/tools/_shared.ts, src/core/security/privilege-guard.ts
 * @owner core-tools
 *
 * ZERO-TRUST: This file has NO imports from tool-gateway or privilege-guard.
 * It is a leaf dependency — imported by others, imports nothing from core/tools.
 */

import * as path from 'path';

/** Workspace root — resolved once at load time */
export const WORKSPACE_ROOT = path.resolve(process.cwd());

const SAFE_PATHS = [
  path.resolve(WORKSPACE_ROOT),
  path.resolve(WORKSPACE_ROOT, 'src'),
  path.resolve(WORKSPACE_ROOT, 'knowledge'),
  path.resolve(WORKSPACE_ROOT, 'config'),
  path.resolve(WORKSPACE_ROOT, 'scripts'),
  path.resolve(WORKSPACE_ROOT, 'docker'),
];

/**
 * Check if a path is within allowed safe directories.
 * Returns true if path is SAFE, false if TRAVERSAL DETECTED.
 */
export function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return SAFE_PATHS.some(safe => resolved.startsWith(safe));
}
