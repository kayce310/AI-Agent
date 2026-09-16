/**
 * @file Fresh Observation — Current system state for evaluators
 * @layer core
 * @owner core-engine
 *
 * Provides fresh system state for runtime evaluators.
 * Boundary: fresh reality vs historical evidence.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FreshObservation {
  files: Map<string, string>; // path -> content snippet or exists
  timestamp: number;
}

/**
 * Capture current state of the filesystem for specific paths.
 * Phase 2: Simple filesystem observer.
 */
export function captureObservation(relevantPaths: string[]): FreshObservation {
  const files = new Map<string, string>();
  for (const p of relevantPaths) {
    try {
      if (fs.existsSync(p)) {
        const stats = fs.statSync(p);
        if (stats.isFile()) {
          files.set(p, 'exists');
        } else {
          files.set(p, 'directory');
        }
      } else {
        files.set(p, 'missing');
      }
    } catch {
      files.set(p, 'error');
    }
  }
  return {
    files,
    timestamp: Date.now()
  };
}
