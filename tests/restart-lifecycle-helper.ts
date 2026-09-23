/**
 * Restart Lifecycle Helper — simulates Coral startup for readiness test
 *
 * This script mimics what start-telegram.ts does at line ~386:
 * - Writes readiness marker after "full startup"
 * - Exits cleanly
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const READY_MARKER = path.join(os.tmpdir(), 'coral-ready.json');

(async () => {
  // Simulate startup delay (Coral needs time to init engine, gateway, telegram bridge)
  await new Promise(r => setTimeout(r, 500));

  // Write readiness marker (same as start-telegram.ts line ~386)
  fs.writeFileSync(READY_MARKER, JSON.stringify({ ts: Date.now() }), 'utf8');

  // Exit successfully
  console.log('Simulated Coral startup complete — readiness marker written');
  process.exit(0);
})();