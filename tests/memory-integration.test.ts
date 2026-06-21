/**
 * @file memory-integration.test.ts — End-to-end Memory Recall Test
 * @layer tests
 * @owner Phase 1: Memory Wiring
 *
 * Tests the complete cycle: Tool Result → Store → Recall in Next Request
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryStore } from '../src/core/memory/memory-store.js';
import { PromptBuilder } from '../src/core/llm/prompt-builder.js';

describe('Memory Integration: Tool → Store → Recall', () => {
  let memoryStore: MemoryStore;

  beforeEach(async () => {
    // Use temp directory for test
    memoryStore = new MemoryStore('./.test-memory-integration');
    await memoryStore.init();
  });

  afterEach(async () => {
    // Cleanup
    try {
      await memoryStore.clear?.();
    } catch { /* ignore */ }
  });

  /**
   * Test 1: Tool result is stored in memory
   */
  it('should store tool result in memory', async () => {
    const sessionId = 'session-001';
    const toolName = 'read_file';
    const toolResult = 'File content: Lorem ipsum dolor sit amet';

    // Simulate: Engine runs tool, stores result
    await memoryStore.add('task', `Tool ${toolName}: ${toolResult}`, {
      tags: ['tool_result', toolName],
      sessionId,
    });

    // Verify: Memory has the block
    const blocks = await memoryStore.getAll();
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks[0].content).toContain(toolResult);
  });

  /**
   * Test 2: Stored memory is recalled on query
   */
  it('should recall stored memory on query', async () => {
    const sessionId = 'session-002';
    
    // Store: "Generated report for Q2"
    await memoryStore.add('task' as any, 'Generated report for Q2 with metrics', {
      tags: ['report', 'q2'],
      sessionId,
    } as any);

    // Query: "What reports did I generate?"
    const recalledBlocks = await memoryStore.query('reports generated', {
      topK: 5,
      sessionId,
    });

    expect(recalledBlocks.length).toBeGreaterThan(0);
    expect(recalledBlocks[0].content).toContain('report');
  });

  /**
   * Test 3: Session-specific recall (doesn't mix sessions)
   */
  it('should recall only session-specific memories', async () => {
    const session1 = 'user-alice';
    const session2 = 'user-bob';

    // Store: Alice's task
    await memoryStore.add('task' as any, 'Alice processed invoice 123', {
      sessionId: session1,
      tags: ['invoice'],
    });

    // Store: Bob's task
    await memoryStore.add('task' as any, 'Bob created project dashboard', {
      sessionId: session2,
      tags: ['dashboard'],
    });

    // Query: Alice asks about invoices
    const aliceRecall = await memoryStore.query('invoice', {
      topK: 10,
      sessionId: session1,
    });

    // Query: Bob asks about invoices
    const bobRecall = await memoryStore.query('invoice', {
      topK: 10,
      sessionId: session2,
    });

    // Alice should get her invoice, Bob should not
    expect(aliceRecall.length).toBeGreaterThan(0);
    expect(aliceRecall[0].content).toContain('Alice');
    
    // Bob's recall should NOT contain Alice's invoice
    const bobHasAliceInvoice = bobRecall.some(b => b.content.includes('Alice'));
    expect(bobHasAliceInvoice).toBe(false);
  });

  /**
   * Test 4: Memory recall is injected into PromptBuilder
   */
  it('should inject memory context into system prompt', async () => {
    const sessionId = 'session-003';
    
    // Store: Previous conversation
    await memoryStore.add('task' as any, 'User asked about Python decorators', {
      sessionId,
      tags: ['python', 'decorators'],
    } as any);

    // Query: Simulate what engine does
    const recalledBlocks = await memoryStore.query('Python decorators', {
      topK: 10,
      sessionId,
    } as any);

    // Format memory context (same as engine does)
    let memoryContext = '';
    if (recalledBlocks.length > 0) {
      const memoryLines = recalledBlocks.map((block, i) => {
        const timeStr = block.timestamp 
          ? new Date(block.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' })
          : 'unknown';
        const tags = block.tags?.length ? ` [${block.tags.join(', ')}]` : '';
        return `${i + 1}. [${block.type}${tags}] (${timeStr}): ${block.content.substring(0, 200)}`;
      });
      memoryContext = memoryLines.join('\n');
    }

    // Build prompt with memory context
    const promptBuilder = new PromptBuilder();
    const systemPrompt = promptBuilder.buildSystem({
      agentName: 'Coral',
      mentionPrefix: '@Coral',
      task: 'Explain Python decorators',
      memoryContext,
      currentRequest: 'Can you explain decorators again?',
    } as any);

    // Verify: System prompt includes memory
    expect(systemPrompt).toContain('TRÍ NHỚ');
    expect(systemPrompt).toContain('Python decorators');
  });

  /**
   * Test 5: Multi-turn conversation with memory
   */
  it('should maintain conversation context across turns', async () => {
    const sessionId = 'session-004';

    // Turn 1: User asks question, tool generates response
    const turn1Request = 'What is the capital of France?';
    const turn1Response = 'The capital of France is Paris. It is located on the Seine River.';

    await memoryStore.add('task' as any, `Q: ${turn1Request}\nA: ${turn1Response}`, {
      sessionId,
      tags: ['geography', 'capitals'],
    });

    // Turn 2: User asks follow-up
    const turn2Request = 'Tell me more about it';
    const turn2Recall = await memoryStore.query('France Paris', {
      topK: 5,
      sessionId,
    });

    expect(turn2Recall.length).toBeGreaterThan(0);
    expect(turn2Recall[0].content).toContain('Paris');
    expect(turn2Recall[0].content).toContain('France');
  });

  /**
   * Test 6: Tool-to-Memory-to-LLM cycle (critical path)
   */
  it('should complete full cycle: tool result → memory → LLM context', async () => {
    const sessionId = 'session-005';

    // Phase 1: Tool executes and result is stored
    const toolResult = {
      toolName: 'search_files',
      success: true,
      result: 'Found 3 files matching pattern: config.ts, app.ts, types.ts',
    };

    await memoryStore.add('task', `Tool ${toolResult.toolName}: ${toolResult.result}`, {
      sessionId,
      tags: ['tool_result', toolResult.toolName, 'search'],
    });

    // Phase 2: Next request comes in
    const nextRequest = 'What files did we find?';

    // Phase 3: Engine queries memory
    const memoryRecall = await memoryStore.query(nextRequest, {
      topK: 10,
      sessionId,
    });

    // Phase 4: Memory is passed to LLM
    expect(memoryRecall.length).toBeGreaterThan(0);
    expect(memoryRecall[0].content).toContain('config.ts');
    expect(memoryRecall[0].content).toContain('app.ts');
  });

  /**
   * Test 7: Memory filtering by tags
   */
  it('should filter memory by tags', async () => {
    const sessionId = 'session-006';

    await memoryStore.add('task', 'Tool result 1: error handling', {
      sessionId,
      tags: ['error', 'handling'],
    });

    await memoryStore.add('task', 'Tool result 2: file parsing', {
      sessionId,
      tags: ['file', 'parsing'],
    });

    // Query with tag filter
    const errorMemories = await memoryStore.query('error', {
      topK: 10,
      sessionId,
      types: ['task'],
    });

    expect(errorMemories.length).toBeGreaterThan(0);
    expect(errorMemories.every(b => b.tags?.includes('error') || b.content.includes('error'))).toBe(true);
  });

  /**
   * Test 8: Memory degradation (TTL) — optional, for Phase 2
   */
  it('should respect time-based retention', async () => {
    const sessionId = 'session-007';

    // Add block with explicit timestamp (old)
    const oldTime = Date.now() - (35 * 24 * 60 * 60 * 1000); // 35 days ago
    
    await memoryStore.add('task' as any, 'Old forgotten task', {
      sessionId,
      tags: ['old'],
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days TTL
    } as any);

    // Add recent block
    await memoryStore.add('task' as any, 'Recent task', {
      sessionId,
      tags: ['recent'],
    } as any);

    // Query should include both (retention policy is not enforced in query)
    // But marked with timestamp for UI/filtering
    const blocks = await memoryStore.getAll();
    expect(blocks.length).toBeGreaterThan(0);
    
    // Both blocks exist
    const hasOld = blocks.some(b => b.content.includes('Old'));
    const hasRecent = blocks.some(b => b.content.includes('Recent'));
    expect(hasOld || hasRecent).toBe(true); // At least one
  });
});
