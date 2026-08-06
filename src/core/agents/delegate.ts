/**
 * @file Delegate Tool — CrewAI-style Task Delegation
 * @layer core
 * @depends-on src/core/agents/agent-registry.ts, src/core/llm/model-adapter.ts
 * @imported-by src/core/tools/tool-registry.ts (registered as ToolPlugin)
 * @owner core-agents
 *
 * Provides a delegate_task tool that allows Coral to assign subtasks
 * to specialist agents. The specialist runs its own ReAct loop with
 * restricted tools, and returns the result to Coral.
 *
 * Pattern: CrewAI Delegation (sub-routine)
 * - Coral calls delegate_task(agentName, task)
 * - Specialist agent runs with its own tools
 * - Result returns to Coral → Coral continues orchestration
 */

import { AgentRegistry, SpecialistAgent, DelegationResult } from './agent-registry.js';
export { AgentRegistry }; // re-export cho DelegationOrchestrator
import type { Tool, ToolPlugin } from '../tools/tool-registry.js';
import { Logger } from '../logger.js';
import { getRequestContext } from '../request-context.js';

const log = new Logger({ module: 'Delegate' });

// ── Delegate Tool Implementation ──

/**
 * Create the delegate_task tool.
 */
function createDelegateTool(registry: AgentRegistry): Tool {
  return {
    name: 'delegate_task',
    description: 'Giao phó task cho specialist agent. Specialist sẽ chạy với tools riêng và trả kết quả về. Dùng khi cần chuyên gia xử lý phần việc cụ thể.',
    schema: {
      type: 'object',
      properties: {
        agentName: {
          type: 'string',
          description: `Tên specialist agent. Options: ${registry.listAgents().join(', ')}`,
        },
        task: {
          type: 'string',
          description: 'Mô tả chi tiết task cần giao phó. Include context và expected output.',
        },
      },
      required: ['agentName', 'task'],
    },
    execute: async (args: Record<string, any>): Promise<DelegationResult> => {
      const { agentName, task } = args;

      // Validate agent exists
      const agent = registry.getAgent(agentName);
      if (!agent) {
        return {
          agentName: agentName || 'unknown',
          content: '',
          toolCycles: 0,
          modelUsed: 'none',
          success: false,
          error: `Agent "${agentName}" not found. Available: ${registry.listAgents().join(', ')}`,
        };
      }

      log.info(`📤 [DELEGATE] Task to ${agentName}: "${task.slice(0, 80)}..."`);

      try {
        const result = await runSpecialistAgent(agent, task, registry);
        log.info(`📥 [DELEGATE] ${agentName} completed: ${result.toolCycles} cycles, ${result.content.length} chars`);
        return result;
      } catch (err: any) {
        log.error(`❌ [DELEGATE] ${agentName} failed: ${err.message}`);
        return {
          agentName,
          content: '',
          toolCycles: 0,
          modelUsed: 'none',
          success: false,
          error: err.message,
        };
      }
    },
  };
}

/**
 * Run a specialist agent with its own ReAct loop.
 */
export async function runSpecialistAgent(
  agent: SpecialistAgent,
  task: string,
  registry: AgentRegistry,
): Promise<DelegationResult> {
  const modelRouter = registry.getModelRouter();
  const agentTools = registry.getToolsForAgent(agent.name);
  const maxCycles = agent.maxCycles || 8;
  // Cancel propagation: signal từ parent request (EngineRequest.abortSignal → RequestContext.signal)
  const signal = getRequestContext()?.signal;

  // Build system prompt for specialist
  const systemPrompt = [
    `Bạn là ${agent.name} — ${agent.role}.`,
    ``,
    `Mục tiêu: ${agent.goal}`,
    ``,
    `Background: ${agent.backstory}`,
    ``,
    `Quy tắc:`,
    `- Trả lời bằng tiếng Việt`,
    `- Sử dụng markdown formatting`,
    `- Chỉ dùng các tools được phép: ${agent.allowedTools.join(', ')}`,
    `- Hoàn thành task và trả kết quả ngắn gọn, chính xác`,
  ].join('\n');

  // Build messages
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: task },
  ];

  // ReAct loop (simplified — no hooks, no tracing for sub-agents)
  let toolCycles = 0;
  let finalContent = '';

  while (toolCycles < maxCycles) {
    // Cancel propagation — parent abort dừng subagent loop (mirror agent.ts checkAbort)
    if (signal?.aborted) {
      throw new Error('Operation cancelled');
    }

    const modelResult = await modelRouter.route(messages, {
      model: agent.modelId,
      tools: agentTools,
      maxTokens: 4096,
      signal,
    });

    // Direct response (no tool calls)
    if (modelResult.finishReason === 'stop') {
      finalContent = modelResult.content || '';
      return {
        agentName: agent.name,
        content: finalContent,
        toolCycles,
        modelUsed: modelResult.modelUsed,
        success: true,
      };
    }

    // Tool calls
    if (modelResult.finishReason === 'tool_calls' && modelResult.toolCalls) {
      // Add assistant message
      messages.push({
        role: 'assistant',
        content: modelResult.content || null,
        tool_calls: modelResult.toolCalls,
      });

      toolCycles++;

      // Execute tools
      for (const toolCall of modelResult.toolCalls) {
        if (toolCall.type !== 'function') continue;

        const toolResult = await registry.getToolRegistry().execute(
          toolCall.function.name,
          JSON.parse(toolCall.function.arguments || '{}'),
        );

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      continue;
    }

    // Unknown finish reason
    finalContent = modelResult.content || 'Không thể hoàn thành task.';
    break;
  }

  // Max cycles exceeded
  if (!finalContent) {
    finalContent = `Đã đạt giới hạn ${maxCycles} tool cycles. Kết quả chưa hoàn chỉnh.`;
  }

  return {
    agentName: agent.name,
    content: finalContent,
    toolCycles,
    modelUsed: 'unknown',
    success: toolCycles < maxCycles,
  };
}

// ── Tool Plugin Export ──

export function createDelegatePlugin(registry: AgentRegistry): ToolPlugin {
  return {
    name: 'delegation',
    tools: [createDelegateTool(registry)],
  };
}

export default createDelegatePlugin;
