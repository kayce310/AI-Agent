/**
 * Quick smoke test for browser tools.
 * node --import tsx test/browser-demo.ts
 */
import plugin from '../src/core/tools/browser.js';

async function main() {
  console.log('Testing browser tools...\n');

  // Test 1: Navigate
  const navResult = await plugin.tools[0].execute({ url: 'https://example.com' });
  const nav = navResult as any;
  console.assert(nav.url === 'https://example.com', 'navigate: url mismatch');
  console.assert(nav.title === 'Example Domain', `navigate: expected Example Domain, got "${nav.title}"`);
  console.assert(nav.snapshot && nav.snapshot.length > 100, 'navigate: snapshot too short');
  console.log('  PASS: browser_navigate —', nav.url, '→', nav.title);

  // Test 2: Snapshot
  const snapResult = await plugin.tools[1].execute({});
  const snap = snapResult as any;
  console.assert(snap.snapshot && snap.snapshot.includes('@e1'), 'snapshot: ref IDs expected');
  console.log('  PASS: browser_snapshot —', snap.snapshot.length, 'chars, refs found');

  // Test 3: Evaluate
  const evalResult = await plugin.tools[5].execute({ expression: 'document.title' });
  const ev = evalResult as any;
  console.assert(ev.ok === true, 'evaluate: should succeed');
  console.assert(ev.value === 'Example Domain', `evaluate: expected Example Domain, got "${ev.value}"`);
  console.log('  PASS: browser_evaluate —', ev.value);

  // Test 4: Get images
  const imgResult = await plugin.tools[8].execute({});
  const imgs = imgResult as any;
  console.assert(imgs.count === 0, 'example.com should have 0 images');
  console.log('  PASS: browser_get_images —', imgs.count, 'images');

  // Test 5: Console
  const cnsResult = await plugin.tools[7].execute({});
  const cns = cnsResult as any;
  console.assert(Array.isArray(cns.entries), 'console: entries should be array');
  console.log('  PASS: browser_console —', cns.count, 'entries');

  // Test 6: Back (no-op since no history but should not crash)
  const backResult = await plugin.tools[6].execute({});
  const back = backResult as any;
  console.assert(back.url, 'back: should return url');
  console.log('  PASS: browser_back —', back.url);

  console.log('\n  ALL PASS');
}

main().then(() => process.exit(0)).catch(e => { console.error('FAIL:', e.message); process.exit(1); });
