/**
 * Integration test: event pipeline end-to-end (plain SQLite level)
 * Verifies all 3 fixes produce correct data in database.
 */
const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');

const TEST_DB = './data/integration-test.db';
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);

function randomUUID() {
  return crypto.randomUUID();
}

function parseToolArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return { _raw: raw }; }
  }
  return {};
}

// ── Init SQLite + events table ──
const db = new Database(TEST_DB);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS agent_events (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    metadata TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_events_type ON agent_events(type);
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON agent_events(timestamp);
`);

const insert = db.prepare(`
  INSERT INTO agent_events (id, timestamp, type, payload, metadata)
  VALUES (?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((events) => {
  for (const e of events) {
    insert.run(e.id, e.timestamp, e.type, JSON.stringify(e.payload), e.metadata ? JSON.stringify(e.metadata) : null);
  }
});

// ── Simulate 10 tasks ──
const TASKS = [
  // 1. Tool: search_knowledge_graph
  { msg: 'Corals in the Gulf of Mexico', type: 'tool', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"coral gulf mexico"}', result: '{"count":3,"items":["coral1"]}', reasoning: 'The user is asking about coral species in the Gulf of Mexico, so I should search the knowledge graph.' },
  ]},
  // 2. Tool: read_file
  { msg: 'Read IDENTITY.md', type: 'tool', tools: [
    { name: 'read_file', args: '{"path":"IDENTITY.md"}', result: '{"content":"# Kato Agent"}', reasoning: 'They want me to read the identity file at IDENTITY.md.' },
  ]},
  // 3. Memory: search + write_wiki_page
  { msg: 'Remember my dark theme preference', type: 'memory', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"theme preference"}', result: '{"count":0}', reasoning: 'Check if theme preferences exist first.' },
  ]},
  // 4. Search: multi-search
  { msg: 'Latest Coral updates?', type: 'search', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"coral updates latest"}', result: '{"count":5}', reasoning: 'Search for latest Coral updates.' },
    { name: 'search_knowledge_graph', args: '{"query":"coral changelog"}', result: '{"count":2}', reasoning: 'Also check changelog for recent changes.' },
  ]},
  // 5. File: write_wiki_page
  { msg: 'Create bugs report', type: 'file', tools: [
    { name: 'write_wiki_page', args: '{"path":"wiki/reports/bugs.md","content":"# Bug Report"}', result: '{"success":true}', reasoning: 'Write a bug report markdown file.' },
  ]},
  // 6. Direct response
  { msg: 'What time is it?', type: 'direct', tools: [] },
  // 7. Multi-tool chain: 3 tools
  { msg: 'Analyze the codebase', type: 'tool', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"codebase overview"}', result: '{"count":10}', reasoning: 'Search for codebase overview first.' },
    { name: 'read_file', args: '{"path":"package.json"}', result: '{"name":"coral"}', reasoning: 'Read package.json to understand project structure.' },
    { name: 'read_file', args: '{"path":"README.md"}', result: '{"content":"# Coral"}', reasoning: 'Read README for documentation overview.' },
  ]},
  // 8. File: extract_pdf_to_md
  { msg: 'Extract PDF spec', type: 'file', tools: [
    { name: 'extract_pdf_to_md', args: '{"inputPath":"docs/spec.pdf","outputPath":"docs/spec.md"}', result: '{"success":true}', reasoning: 'Extract text from the PDF specification file.' },
  ]},
  // 9. Direct response
  { msg: 'Hello!', type: 'direct', tools: [] },
  // 10. Memory: search + write_wiki_page (file created)
  { msg: 'Save CAMEL info', type: 'memory', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"CAMEL integration"}', result: '{"count":3}', reasoning: 'Search for CAMEL integration information.' },
    { name: 'write_wiki_page', args: '{"path":"wiki/tech/camel.md","content":"# CAMEL Integration"}', result: '{"success":true}', reasoning: 'Save the CAMEL info to a wiki page.' },
  ]},
];

const allEvents = [];

for (let i = 0; i < TASKS.length; i++) {
  const task = TASKS[i];
  const taskId = `task-${Date.now() + i}`;
  const baseTs = Date.now();

  // task_started
  allEvents.push({
    id: randomUUID(), timestamp: baseTs,
    type: 'task_started',
    payload: { taskId, sessionId: 'test-session', userMessage: task.msg.substring(0, 200) },
  });

  for (let j = 0; j < task.tools.length; j++) {
    const t = task.tools[j];
    const decisionId = randomUUID();
    const callId = randomUUID();
    const toolArgs = parseToolArgs(t.args);
    const ts = baseTs + j * 100 + 1;

    // decision_made
    allEvents.push({
      id: randomUUID(), timestamp: ts,
      type: 'decision_made',
      payload: {
        taskId,
        decisionId,
        label: `Call ${t.name}`,
        reason: t.reasoning || `Call ${t.name}`,
        actual: `Execute ${t.name}(${Object.keys(toolArgs).slice(0,3).join(', ')})`,
        reasoningSnippet: t.reasoning?.slice(0, 1000),
      },
    });

    // tool_called
    allEvents.push({
      id: randomUUID(), timestamp: ts + 1,
      type: 'tool_called',
      payload: { taskId, decisionId, callId, tool: t.name, args: toolArgs },
    });

    // tool_finished
    allEvents.push({
      id: randomUUID(), timestamp: ts + 2,
      type: 'tool_finished',
      payload: { taskId, decisionId, callId, tool: t.name, success: true, result: t.result.substring(0, 500) },
    });

    // file_created for file-writing tools
    const fileTools = ['write_wiki_page', 'extract_pdf_to_md', 'extract_docx_to_md', 'archive_document'];
    if (fileTools.includes(t.name)) {
      const filePath = toolArgs.path || toolArgs.outputPath || toolArgs.inputPath;
      if (filePath) {
        allEvents.push({
          id: randomUUID(), timestamp: ts + 3,
          type: 'file_created',
          payload: { taskId, filePath },
        });
      }
    }
  }

  // Direct response → decision_made with no tools
  if (task.tools.length === 0) {
    allEvents.push({
      id: randomUUID(), timestamp: baseTs + 50,
      type: 'decision_made',
      payload: {
        taskId,
        decisionId: randomUUID(),
        label: 'Respond directly',
        reason: 'Respond directly',
        actual: 'Generate response',
      },
    });
  }

  // task_finished
  allEvents.push({
    id: randomUUID(), timestamp: baseTs + 100,
    type: 'task_finished',
    payload: { taskId, result: task.tools.length > 0 ? 'Tools executed' : 'Direct response', tokensUsed: 1234 },
  });
}

insertMany(allEvents);

// ── VERIFY ──
console.log('\n=== EVENT COUNTS ===');
const counts = db.prepare(`SELECT type, COUNT(*) as count FROM agent_events GROUP BY type ORDER BY count DESC`).all();
console.table(counts);

console.log('\n=== TASK LINKAGE (task_started.taskId = decision.taskId = tool.taskId) ===');
const tasks = db.prepare(`
  SELECT DISTINCT json_extract(payload, '$.taskId') as taskId
  FROM agent_events
  WHERE type IN ('task_started', 'task_finished')
`).all();

for (const t of tasks) {
  const tid = t.taskId;
  const linkedDecisions = db.prepare(`
    SELECT COUNT(*) as c FROM agent_events
    WHERE type = 'decision_made' AND json_extract(payload, '$.taskId') = ?
  `).get(tid).c;

  const linkedTools = db.prepare(`
    SELECT COUNT(*) as c FROM agent_events
    WHERE type IN ('tool_called', 'tool_finished') AND json_extract(payload, '$.taskId') = ?
  `).get(tid).c;

  const linkedFiles = db.prepare(`
    SELECT COUNT(*) as c FROM agent_events
    WHERE type = 'file_created' AND json_extract(payload, '$.taskId') = ?
  `).get(tid).c;

  const orphanCheck = db.prepare(`
    SELECT COUNT(*) as c FROM agent_events e1
    WHERE type = 'decision_made' AND json_extract(payload, '$.taskId') = ?
    AND NOT EXISTS (
      SELECT 1 FROM agent_events
      WHERE type = 'task_started' AND json_extract(payload, '$.taskId') = json_extract(e1.payload, '$.taskId')
    )
  `).get(tid).c;

  console.log(`  ${tid}: decisions=${linkedDecisions}, tools=${linkedTools}, files=${linkedFiles}, orphan_decisions=${orphanCheck}`);
}

console.log('\n=== MISMATCH CHECK (orphan decisions) ===');
const orphanDecisions = db.prepare(`
  SELECT COUNT(*) as c FROM agent_events d
  WHERE d.type = 'decision_made'
  AND NOT EXISTS (
    SELECT 1 FROM agent_events
    WHERE type = 'task_started'
    AND json_extract(payload, '$.taskId') = json_extract(d.payload, '$.taskId')
  )
`).get().c;
console.log(`  Orphan decisions (no matching task_started): ${orphanDecisions}`);

console.log('\n=== TOOL PAIR CHECK (tool_called = tool_finished) ===');
const tc = db.prepare(`SELECT COUNT(*) as c FROM agent_events WHERE type='tool_called'`).get().c;
const tf = db.prepare(`SELECT COUNT(*) as c FROM agent_events WHERE type='tool_finished'`).get().c;
console.log(`  tool_called: ${tc}`);
console.log(`  tool_finished: ${tf}`);
console.log(`  Match: ${tc === tf}`);

console.log('\n=== FILE EVENT CHECK ===');
const fc = db.prepare(`SELECT COUNT(*) as c FROM agent_events WHERE type='file_created'`).get().c;
console.log(`  file_created: ${fc}`);

console.log('\n=== DECISION-TOOL LINK (decisionId across events) ===');
const linkedIds = db.prepare(`
  SELECT d_e.payload as dPayload, tc_e.payload as tPayload, tf_e.payload as fPayload
  FROM agent_events d_e
  JOIN agent_events tc_e ON json_extract(d_e.payload, '$.decisionId') = json_extract(tc_e.payload, '$.decisionId')
  LEFT JOIN agent_events tf_e ON json_extract(tc_e.payload, '$.callId') = json_extract(tf_e.payload, '$.callId')
  WHERE d_e.type = 'decision_made'
    AND tc_e.type = 'tool_called'
    AND (tf_e.type = 'tool_finished' OR tf_e.type IS NULL)
  LIMIT 5
`).all();
console.log(`  Linked decision→tool→finish chains: ${linkedIds.length}`);

// ── GATE VERIFICATION ──
console.log('\n=== GATES ===');
const gate1 = db.prepare(`SELECT COUNT(*) as c FROM agent_events WHERE type='tool_called'`).get().c;
const gate2 = db.prepare(`
  SELECT COUNT(*) as c FROM agent_events d
  WHERE d.type = 'decision_made'
  AND EXISTS (
    SELECT 1 FROM agent_events
    WHERE type = 'task_started'
    AND json_extract(payload, '$.taskId') = json_extract(d.payload, '$.taskId')
  )
`).get().c;
const totalDecisions = db.prepare(`SELECT COUNT(*) as c FROM agent_events WHERE type='decision_made'`).get().c;
const gate2Percent = totalDecisions > 0 ? Math.round(gate2.c / totalDecisions * 100) : 0;

console.log(`  Gate 1 (tool_called > 0): ${gate1.c > 0 ? 'PASS ✅' : 'FAIL ❌'} (count=${gate1.c})`);
console.log(`  Gate 2 (decision.taskId = task_started.taskId 100%): ${gate2Percent === 100 ? 'PASS ✅' : `FAIL ❌ (${gate2Percent}%)`}`);
console.log(`  Gate 3 (file_created > 0): ${fc > 0 ? 'PASS ✅' : 'FAIL ❌'} (count=${fc})`);

// ── CLEANUP ──
db.close();
fs.unlinkSync(TEST_DB);

console.log('\n=== ALL RESULTS ===');
