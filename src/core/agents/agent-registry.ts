/**
 * @file Agent Registry — Specialist Agent Definitions
 * @layer core
 * @depends-on src/core/llm/model-adapter.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/agents/delegate.ts
 * @owner core-agents
 *
 * CrewAI-style delegation: defines specialist agents with roles, goals, and tools.
 * Each agent can be invoked via the delegate_task tool.
 */

import { ModelRouter } from '../llm/model-adapter.js';
import { ToolRegistry } from '../tools/tool-registry.js';

// ── Types ──

export interface SpecialistAgent {
  /** Unique identifier */
  name: string;
  /** Role description (used in delegation context) */
  role: string;
  /** Goal — what this agent tries to achieve */
  goal: string;
  /** Backstory — persona context for the LLM */
  backstory: string;
  /** Tool names this agent can use (subset of ToolRegistry) */
  allowedTools: string[];
  /** Model to use (optional, defaults to main model) */
  modelId?: string;
  /** Max tool call cycles for this agent */
  maxCycles?: number;
}

export interface DelegationResult {
  agentName: string;
  content: string;
  toolCycles: number;
  modelUsed: string;
  success: boolean;
  error?: string;
}

// ── Specialist Agent Definitions ──

export const SPECIALIST_AGENTS: SpecialistAgent[] = [
  {
    name: 'researcher',
    role: 'Nghiên cứu viên — tìm kiếm và tổng hợp thông tin',
    goal: 'Tìm kiếm thông tin chính xác, cập nhật từ web và knowledge base',
    backstory: 'Bạn là một researcher giàu kinh nghiệm,善于 tìm kiếm và phân tích thông tin từ nhiều nguồn. Bạn luôn trích dẫn nguồn và kiểm tra tính chính xác.',
    allowedTools: ['web_search', 'fetch_url', 'search_knowledge_graph', 'read_file', 'search_archived_md', 'quote_from_source'],
    maxCycles: 8,
  },
  {
    name: 'coder',
    role: 'Lập trình viên — viết và review code',
    goal: 'Viết code chất lượng cao, tuân thủ best practices, debug hiệu quả',
    backstory: 'Bạn là senior developer với kinh nghiệm TypeScript/Node.js. Bạn viết code clean, có tests, và tuân thủ coding standards.',
    allowedTools: ['read_file', 'list_directory', 'execute_command', 'search_knowledge_graph'],
    maxCycles: 10,
  },
  {
    name: 'writer',
    role: 'Nhà văn — viết nội dung, báo cáo, tài liệu',
    goal: 'Viết nội dung rõ ràng, có cấu trúc, dễ hiểu bằng tiếng Việt',
    backstory: 'Bạn là content writer chuyên nghiệp,擅长 viết blog, báo cáo, tài liệu kỹ thuật. Bạn sử dụng markdown formatting và luôn có cấu trúc rõ ràng.',
    allowedTools: ['read_file', 'search_knowledge_graph', 'generate_report', 'write_wiki_page'],
    maxCycles: 6,
  },
  {
    name: 'analyst',
    role: 'Phân tích viên — phân tích dữ liệu và đưa ra insights',
    goal: 'Phân tích sâu sắc, tìm patterns, đưa ra recommendations có căn cứ',
    backstory: 'Bạn là data analyst với tư duy logic mạnh. Bạn phân tích dữ liệu từ nhiều nguồn, tìm patterns, và đưa ra insights actionable.',
    allowedTools: ['read_file', 'search_knowledge_graph', 'search_archived_md', 'extract_formulas', 'web_search'],
    maxCycles: 8,
  },
];

// ── Agent Registry ──

export class AgentRegistry {
  private agents: Map<string, SpecialistAgent>;
  private modelRouter: ModelRouter;
  private toolRegistry: ToolRegistry;

  constructor(modelRouter: ModelRouter, toolRegistry: ToolRegistry) {
    this.modelRouter = modelRouter;
    this.toolRegistry = toolRegistry;
    this.agents = new Map();

    // Register all specialist agents
    for (const agent of SPECIALIST_AGENTS) {
      this.agents.set(agent.name, agent);
    }
  }

  /**
   * Get a specialist agent by name.
   */
  getAgent(name: string): SpecialistAgent | undefined {
    return this.agents.get(name);
  }

  /**
   * List all available agent names.
   */
  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get agent descriptions for delegation context.
   */
  getAgentDescriptions(): string {
    return SPECIALIST_AGENTS
      .map(a => `- **${a.name}**: ${a.role} — ${a.goal}`)
      .join('\n');
  }

  /**
   * Filter tools for a specific agent.
   */
  getToolsForAgent(agentName: string): any[] {
    const agent = this.agents.get(agentName);
    if (!agent) return [];

    const allTools = this.toolRegistry.getDefinitions();
    return allTools.filter(t => agent.allowedTools.includes(t.function.name));
  }

  /**
   * Get ModelRouter instance.
   */
  getModelRouter(): ModelRouter {
    return this.modelRouter;
  }

  /**
   * Get ToolRegistry instance.
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }
}
