// Test to reproduce the agent flow with THINKING_ONLY response
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Agent } from '../src/core/engine/agent.js';
import { ModelRouter, RouterAdapter } from '../src/core/llm/model-adapter.js';
import { ProviderRegistry } from '../src/core/llm/provider-registry.js';
import { CheckpointStore } from '../src/core/checkpoint.js';

function makeRequest(sessionId: string): any {
  return {
    sessionId,
    messages: [{ role: 'user', content: 'game bạn dev tới đâu rồi' }],
    modelId: 'mock-model',
    agentName: 'test',
    protocol: 'test',
    mentionPrefix: '',
    task: 'game bạn dev tới đâu rồi',
  };
}

describe('Agent: THINKING_ONLY end-to-end flow', () => {
  let agent: Agent;
  let store: CheckpointStore;
  
  beforeEach(() => {
    // Router that returns THINKING_ONLY response
    const route = vi.fn(async () => ({
      content: '',
      reasoningContent: 'Let me analyze the game dev progress by checking wiki files.',
      toolCalls: undefined,
      finishReason: 'stop',
      modelUsed: 'mock-model',
      providerUsed: 'mock'
    }));
    
    // Minimal tool registry
    const toolRegistry: any = {
      getDefinitions: () => [],
      use: () => {},
      executeToolCall: vi.fn(),
    };
    
    store = new CheckpointStore();
    
    agent = new Agent({
      modelRouter: { route } as any,
      toolRegistry,
      checkpointStore: store,
      maxToolCycles: 15,
    });
  });
  
  it('should NOT produce E1 fallback when model returns THINKING_ONLY', async () => {
    const sessionId = 'test-thinking-only-session';
    store.start(`req-${sessionId}`, sessionId, 'game bạn dev tới đâu rồi');
    
    const result = await agent.run(makeRequest(sessionId));
    
    console.log('Agent result:', {
      content: result.content,
      finished: result.finished,
      toolCycles: result.toolCycles
    });
    
    // Should NOT be E1 fallback
    expect(result.content).not.toContain('[E1]');
    expect(result.content).not.toContain('Coral chưa hoàn tất');
  });
});