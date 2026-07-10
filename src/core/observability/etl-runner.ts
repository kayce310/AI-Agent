/**
 * @file etl-runner — ETL Pipeline Runner (EventStore Integration)
 * @layer core
 * @depends-on observability/etl-pipeline, events/store
 * @owner core-observability
 *
 * Bridges EventStore → ETLPipeline → file output.
 * Can be called from API endpoint, cron job, or CLI.
 *
 * Usage:
 *   import { runETLPipeline } from './etl-runner.js';
 *   const { outputPath, result } = await runETLPipeline(eventStore, from, to);
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { ETLPipeline, getETLPipeline } from './etl-pipeline.js';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'ETLRunner' });

// ── Types ──

export interface RunOptions {
  /** Output directory (default: D:\hermes\etl-output) */
  outputDir?: string;
  /** Export CSV alongside JSON */
  includeCSV?: boolean;
  /** Event type filter */
  includeTypes?: string[];
  /** Exclude error events */
  excludeErrors?: boolean;
  /** Max events to process */
  maxEvents?: number;
}

export interface RunResult {
  outputPath: string;
  csvPath?: string;
  result: {
    metadata: {
      totalEvents: number;
      sampleCount: number;
      from: number;
      to: number;
    };
    samples: any[];
  };
}

// ── Main runner ──

export async function runETLPipeline(
  eventStore: any,
  from: number,
  to: number,
  options: RunOptions = {}
): Promise<RunResult> {
  const outputDir = options.outputDir || './etl-output';

  // 1. Create pipeline (reuse singleton)
  const pipeline = getETLPipeline(eventStore);

  // 2. Run pipeline
  const result = pipeline.run(from, to, {
    includeTypes: options.includeTypes,
    includeErrors: !options.excludeErrors,
    maxEvents: options.maxEvents,
  });

  // 3. Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // 4. Write JSON
  const jsonFileName = `eval-${from}-${to}.json`;
  const jsonPath = join(outputDir, jsonFileName);
  await writeFile(jsonPath, pipeline.exportJSON(result), 'utf-8');

  log.info(`ETL output written: ${jsonPath} (${result.metadata.sampleCount} samples)`);

  // 5. Optionally write CSV
  let csvPath: string | undefined;
  if (options.includeCSV) {
    const csvFileName = `eval-${from}-${to}.csv`;
    csvPath = join(outputDir, csvFileName);
    await writeFile(csvPath, pipeline.exportCSV(result), 'utf-8');
    log.info(`CSV output written: ${csvPath}`);
  }

  return {
    outputPath: jsonPath,
    csvPath,
    result,
  };
}

/**
 * CLI entry point: run via `npx ts-node etl-runner.ts <from> <to>`
 *
 * Example:
 *   npx ts-node etl-runner.ts 1782378600000 1782465000000
 *   npx ts-node etl-runner.ts --last-24h
 */
async function main() {
  const args = process.argv.slice(2);

  let from: number;
  let to: number;

  if (args[0] === '--last-24h') {
    to = Date.now();
    from = to - 86400000;
  } else if (args.length >= 2) {
    from = parseInt(args[0], 10);
    to = parseInt(args[1], 10);
  } else {
    console.error('Usage: npx ts-node etl-runner.ts <from_timestamp> <to_timestamp>');
    console.error('       npx ts-node etl-runner.ts --last-24h');
    process.exit(1);
  }

  // Lazy import to avoid loading DB driver unless actually running CLI
  try {
    const { EventStore } = await import('../events/store.js');
    const { getStorage } = await import('../memory/sqlite-storage.js');

    const storage = getStorage();
    const db = storage.getDb();
    if (!db) {
      console.error('Error: SQLite database not initialized. Start Coral first.');
      process.exit(1);
    }

    const eventStore = new EventStore(db);
    const { outputPath, result } = await runETLPipeline(eventStore, from, to, {
      includeCSV: true,
    });

    console.log(`✅ ETL complete: ${outputPath}`);
    console.log(`   Events: ${result.metadata.totalEvents}`);
    console.log(`   Samples: ${result.metadata.sampleCount}`);
  } catch (err: any) {
    console.error(`ETL failed: ${err.message}`);
    process.exit(1);
  }
}

// Only run main() if executed directly (not imported)
const isMain = process.argv[1]?.includes('etl-runner');
if (isMain) {
  main();
}

export default runETLPipeline;
