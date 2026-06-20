#!/usr/bin/env node
/**
 * Integration test: simulates engine event pipeline end-to-end.
 * Exercises all 3 fixes with real SQLite writes.
 * Outputs JSON summary for report generation.
 */
import { randomUUID } from 'node:crypto';
import { EventBus } from '../src/core/events/bus.js';
import { EventValidator } from '../src/core/events/validator.js';
import { EventStore } from '../src/core/events/store.js';
import { StructuredLogger } from '../src/core/events/logger.js';
import { EventFactory } from '../src/core/events/factory.js';
import { existsSync, unlinkSync } from 'node:fs';

const TEST_DB = './data/integration-test.db';
const results = [];

// ── Helper: parseToolArgs (mirrors engine.ts Fix 1) ──
function parseToolArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); }
    catch { return { _raw: raw }; }
  }
  return {};
}

// ── Cleanup ──
if (existsSync(TEST_DB)) unlinkSync(TEST_DB);

// ── Init pipeline ──
const bus = new EventBus();
const store = new EventStore(TEST_DB);
const logger = new StructuredLogger(bus);
bus.on((event) => {
  const parsed = EventValidator.validate(event);
  if (parsed) store.append(parsed);
});

// ── Simulate 10 tasks ──
const TASK_TYPES = [
  // 1. Tool task — agent calls search_knowledge_graph
  { userMsg: 'Corals in the Gulf of Mexico', type: 'tool', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"coral gulf mexico"}', result: '{"count":3,"items":["coral1"]}' },
  ]},
  // 2. Tool task — agent calls read_file
  { userMsg: 'Read the identity file', type: 'tool', tools: [
    { name: 'read_file', args: '{"path":"IDENTITY.md"}', result: '{"content":"# Kato Agent"}' },
  ]},
  // 3. Memory task — agent writes to memory then responds
  { userMsg: 'Remember that I prefer dark theme', type: 'memory', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"theme preference"}', result: '{"count":0}' },
    { name: 'write_wiki_page', args: '{"path":"wiki/user/preferences.md","content":"dark theme"}', result: '{"success":true}' },
  ]},
  // 4. Search task — agent searches multiple sources
  { userMsg: 'What are the latest Coral updates?', type: 'search', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"coral updates latest"}', result: '{"count":5}' },
    { name: 'search_knowledge_graph', args: '{"query":"coral changelog"}', result: '{"count":2}' },
  ]},
  // 5. File task — agent creates a file
  { userMsg: 'Create a new report about bugs', type: 'file', tools: [
    { name: 'write_wiki_page', args: '{"path":"wiki/reports/bugs.md","content":"# Bug Report"}', result: '{"success":true}' },
  ]},
  // 6. Direct response — no tools, just a simple answer
  { userMsg: 'What time is it?', type: 'direct', tools: [] },
  // 7. Multi-tool chain — 3 tool calls in sequence
  { userMsg: 'Analyze the full codebase', type: 'tool', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"codebase overview"}', result: '{"count":10}' },
    { name: 'read_file', args: '{"path":"package.json"}', result: '{"name":"coral"}' },
    { name: 'read_file', args: '{"path":"README.md"}', result: '{"content":"# Coral"}' },
  ]},
  // 8. File task — extract PDF
  { userMsg: 'Extract text from this PDF', type: 'file', tools: [
    { name: 'extract_pdf_to_md', args: '{"inputPath":"docs/spec.pdf","outputPath":"docs/spec.md"}', result: '{"success":true}' },
  ]},
  // 9. Direct response — another simple one
  { userMsg: 'Hello Kato!', type: 'direct', tools: [] },
  // 10. Tool + memory — search then store
  { userMsg: 'Find and save info about CAMEL integration', type: 'tool+memory', tools: [
    { name: 'search_knowledge_graph', args: '{"query":"CAMEL integration"}', result: '{"count":3}' },
    { name: 'write_wiki_page', args: '{"path":"wiki/tech/camel.md","content":"# CAMEL"}', result: '{"success":true}' },
  ]},
];

const reasoningSnippets = [
  'The user is asking about coral species in the Gulf of Mexico, so I should search the knowledge graph for relevant information.',
  'They want me to read the identity file. I know this file exists at IDENTITY.md so I will retrieve its contents.',
  'The user wants to save a preference about dark theme. I should first check if this info exists, then write it to the wiki.',
  'They are asking about the latest updates to Coral. I should search for both general updates and the changelog to give a comprehensive answer.',
  'The user wants a bug report created. I will write a markdown file to the wiki/reports directory with a bug report template.',
  null,  // direct response — no reasoning expected (or it can have one)
  'They want a full codebase analysis. I need to search for the overview, then read the package.json and README to understand the project structure.',
  'They want to extract text from a PDF file. I will use the extract_pdf_to_md tool with the input and output paths.',
  null,  // direct response
  'The user wants information about CAMEL integration saved. I should search for it first, then create a wiki page with the findings.',
];

for (let i = 0; i < TASK_TYPES.length; i++) {
  const task = TASK_TYPES[i];
  const taskId = `task-${Date.now() + i}`;
  const sessionId = '8967780585';  // Telegram group
  const taskResult = { taskId, type: task.type, userMsg: task.userMsg, events: [] };

  // 1. task_started
  logger.taskStarted(taskId, task.userMsg.substring(0, 200));
  taskResult.events.push('task_started');

  // 2. For each tool: decision_made → tool_called → tool_finished
  for (let j = 0; j < task.tools.length; j++) {
    const tool = task.tools[j];
    const decisionId = randomUUID();
    const callId = randomUUID();

    // Parse args using Fix 1 helper
    const toolArgs = parseToolArgs(tool.args);
    const argsSummary = Object.keys(toolArgs).slice(0, 3).join(', ');

    // decision_made
    const reason = reasoningSnippets[i] || `Call ${tool.name}`;
    const snippet = reasoningSnippets[i]?.slice(0, 1000) || undefined;
    logger.decisionMade(taskId, decisionId, `Call ${tool.name}`, reason, `Execute ${tool.name}(${argsSummary})`, snippet);
    taskResult.events.push('decision_made');

    // tool_called
    logger.toolCall(taskId, decisionId, callId, tool.name, toolArgs);
    taskResult.events.push('tool_called');

    // tool_finished
    const success = !tool.result.includes('error');
    logger.toolResult(taskId, decisionId, callId, tool.name, success, 0, toolArgs, tool.result.substring(0, 500));
    taskResult.events.push('tool_finished');

    // file_created for file-writing tools
    const fileTools = ['write_wiki_page', 'extract_pdf_to_md', 'extract_docx_to_md', 'archive_document'];
    if (fileTools.includes(tool.name)) {
      const filePath = toolArgs.path || toolArgs.outputPath || toolArgs.inputPath;
      if (filePath) {
        logger.fileCreated(taskId, filePath);
        taskResult.events.push('file_created');
      }
    }
  }

  // 3. For direct response tasks: decision_made (no tools)
  if (task.tools.length === 0) {
    const decisionId = randomUUID();
    const snippet = reasoningSnippets[i]?.slice(0, 1000) || undefined;
    const reason = reasoningSnippets[i] ? reasoningSnippets[i].split('.')[0] + '.' : 'Respond directly';
    logger.decisionMade(taskId, decisionId, 'Respond directly', reason, 'Generate response', snippet);
    taskResult.events.push('decision_made');
  }

  // 4. task_finished
  logger.taskFinished(taskId, task.tools.length > 0 ? 'Tools executed' : 'Direct response', 1234);
  taskResult.events.push('task_finished');

  results.push(taskResult);
}

// ── Query SQLite to verify ──
const db = store.getDatabase();
const eventCounts = db.prepare(`
  SELECT type, COUNT(*) as count FROM agent_events GROUP BY type ORDER BY count DESC
`).all();

const taskLinkage = db.prepare(`
  SELECT t.taskId, t.type as eventType, t.timestamp
  FROM agent_events t
  WHERE t.type = 'task_started'
  ORDER BY t.timestamp
`).all();

const decisionLinkage = db.prepare(`
  SELECT d.taskId, d.payload
  FROM agent_events d
  WHERE d.type = 'decision_made'
  ORDER BY d.timestamp
`).all();

const toolLinkage = db.prepare(`
  SELECT t.taskId, t.type, t.payload
  FROM agent_events t
  WHERE t.type IN ('tool_called', 'tool_finished')
  ORDER BY t.timestamp
`).all();

// Verify all decisions have matching task_started
const taskIds = new Set(taskLinkage.map(r => r.taskId));
const mismatchedDecisions = decisionLinkage.filter(d => !taskIds.has(d.taskId));

// Verify tool_called and tool_finished counts match
const toolCalledCount = db.prepare(`SELECT COUNT(*) as c FROM agent_events WHERE type='tool_called'`).get().c;
const toolFinishedCount = db.prepare(`SELECT COUNT(*) as c FROM agent_events WHERE type='tool_finished'`).get().c;

// Verify file_created
const fileCreatedCount = db.prepare(`SELECT COUNT(*) as c FROM agent_events WHERE type='file_created'`).get().c;

// Verify decisionId linkage
const decisionToolLink = db.prepare(`
  SELECT d.payload as decisionPayload, tc.payload as toolPayload
  FROM agent_events d
  JOIN agent_events tc ON d.taskId = tc.taskId
  WHERE d.type = 'decision_made' AND tc.type = 'tool_called'
  AND d.timestamp <= tc.timestamp
  ORDER BY d.timestamp, tc.timestamp
`).all();

store.close();

// ── Output ──
const output = {
  testDB: TEST_DB,
  eventCounts,
  taskCount: taskLinkage.length,
  decisionCount: decisionLinkage.length,
  toolCalledCount,
  toolFinishedCount,
  fileCreatedCount,
  mismatchedDecisions: mismatchedDecisions.length,
  mismatchedDetails: mismatchedDecisions.map(d => ({ taskId: d.taskId, reason: JSON.parse(d.payload).reason })),
  toolPairsMatch: toolCalledCount === toolFinishedCount,
  tasks: results,
};

console.log(JSON.stringify(output, null, 2));
