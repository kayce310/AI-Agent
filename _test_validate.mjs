import { z } from 'zod';

// Test what happens when args is different types that parseToolArgs might return
const PayloadSchema = z.object({
  args: z.record(z.string(), z.unknown()),
});

function parseToolArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); }
    catch { return { _raw: raw }; }
  }
  return {};
}

const testCases = [
  '{"name":"test"}',        // valid JSON object string
  '"cmd ls"',               // JSON string (not object)
  '["ls", "-la"]',          // JSON array string
  'null',                   // JSON null string
  '42',                     // JSON number string
  'true',                   // JSON boolean string
  '{invalid}',              // invalid JSON string
  '',                       // empty string
  null,                     // null input
  undefined,                // undefined input
  { name: 'test' },         // already an object
  [],                       // empty array
  ['ls'],                   // array with items
  42,                       // number
];

console.log('=== parseToolArgs output type analysis ===\n');
for (const input of testCases) {
  const result = parseToolArgs(input);
  const success = typeof result === 'object' && !Array.isArray(result) && result !== null;
  try {
    PayloadSchema.parse({ args: result });
    console.log(`  ✅ ${JSON.stringify(input).padEnd(25)} → ${JSON.stringify(result).substring(0,30).padEnd(30)} Record`);
  } catch (err) {
    console.log(`  ❌ ${JSON.stringify(input).padEnd(25)} → ${JSON.stringify(result).substring(0,30).padEnd(30)} FAILS (${typeof result}${Array.isArray(result) ? '[]' : ''})`);
  }
}

console.log('\n=== Key edge cases ===');
console.log('Empty array []:', Array.isArray([]), typeof []);
console.log('typeof [] === \'object\':', typeof [] === 'object');
console.log('Object.keys([]).length:', Object.keys([]).length);
console.log('JSON.parse("[]") instanceof Array:', JSON.parse('[]') instanceof Array);
console.log('typeof JSON.parse("42"):', typeof JSON.parse('42'));
console.log('typeof JSON.parse("null"):', typeof JSON.parse('null'));
