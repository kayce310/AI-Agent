const m = await import('pdf-parse');
console.log('Module keys:', Object.keys(m));
console.log('Default type:', typeof m.default);
// Check what export names exist
for (const key of Object.keys(m)) {
  console.log(`  ${key}: ${typeof m[key]}`);
}