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
import { globalHooks } from '../hooks.js';

const log = new Logger({ module: 'Delegate' });

// ── Delegate Tool Implementation ──

/**
 * Create the delegate_task tool.
 */
export function createDelegateTool(registry: AgentRegistry): Tool {
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
        // PA-2 resume-policy (2026-08-11): abort giữa chừng = crash-restart cấp subagent
        // (signal từ parent — 'Operation cancelled' chỉ được throw ở 1 nơi: checkAbort
        // đầu loop). KHÔNG phải lỗi nghiệp vụ → status 'crashed', parent không auto-retry,
        // user tự yêu cầu lại. Giữ CẤM sub-checkpoint namespace (f3479a8d).
        if (err.message === 'Operation cancelled') {
          const partial = String(err.crashPartial || '');
          const base = '⚠️ Task bị gián đoạn do hệ thống khởi động lại giữa chừng. Vui lòng yêu cầu lại nếu cần.';
          log.warn(`⚠️ [DELEGATE] ${agentName} interrupted by restart — crashed (partial: ${partial.slice(0, 80)}...)`);
          return {
            agentName,
            content: partial ? `${base}\n\nPhần đã hoàn thành:\n${partial}` : base,
            toolCycles: Number(err.crashToolCycles) || 0,
            modelUsed: 'none',
            success: false,
            error: 'Task interrupted by system restart',
            status: 'crashed',
          };
        }
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
    // PA-2 resume-policy: gắn partial (phần đã hoàn thành) để execute() trả về user.
    if (signal?.aborted) {
      const err: any = new Error('Operation cancelled');
      err.crashPartial = buildPartialSummary(messages);
      err.crashToolCycles = toolCycles;
      throw err;
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

        const toolName = toolCall.function.name;
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch { /* keep {} */ }

        // Hard-enforce allowedTools — defense-in-depth (registry.execute cũng check ở tầng thực thi)
        if (!agent.allowedTools.includes(toolName)) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `TOOL_BLOCKED_BY_POLICY: ${toolName} không nằm trong allowedTools của ${agent.name}` }),
          });
          continue;
        }

        // Guard chain như parent loop (agent.ts:918) — PrivilegeGuard/risk-gate/HITL áp cho subagent
        const hooksAllowed = await globalHooks.emit('tool:call', {
          sessionId: getRequestContext()?.sessionId,
          toolName,
          toolArgs: toolCall.function.arguments,
          cycle: toolCycles,
          reasoningContent: null,
        });
        if (!hooksAllowed) {
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `TOOL_BLOCKED: ${toolName} was blocked by security guard` }),
          });
          continue;
        }

        const toolResult = await registry.getToolRegistry().execute(toolName, parsedArgs, agent.allowedTools);

        await globalHooks.emit('tool:result', {
          sessionId: getRequestContext()?.sessionId,
          toolName,
          args: toolCall.function.arguments,
          result: toolResult,
          cycle: toolCycles,
        });

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

/**
 * PA-2 resume-policy: tổng hợp phần việc subagent kịp hoàn thành trước khi bị gián
 * đoạn — 2 tool result cuối (mỗi cái ≤ 300 chars) để user biết đã làm gì rồi.
 */
function buildPartialSummary(messages: any[]): string {
  const toolResults: string[] = [];
  for (let i = messages.length - 1; i >= 0 && toolResults.length < 2; i--) {
    const m = messages[i];
    if (m.role !== 'tool') continue;
    let text = '';
    try {
      const parsed = JSON.parse(m.content);
      text = parsed !== null && typeof parsed === 'object'
        ? String(parsed.content ?? JSON.stringify(parsed))
        : String(parsed);
    } catch {
      text = String(m.content);
    }
    toolResults.push(text.slice(0, 300));
  }
  return toolResults.reverse().join(' | ');
}

export function createDelegatePlugin(registry: AgentRegistry): ToolPlugin {
  return {
    name: 'delegation',
    tools: [createDelegateTool(registry)],
  };
}

export default createDelegatePlugin;
