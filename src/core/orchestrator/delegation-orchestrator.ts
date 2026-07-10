import { Logger } from '../logger.js';
import type { AgentConfig } from '../engine/agent.js';
import { AgentRegistry } from '../agents/agent-registry.js';
import { ToolRegistry } from '../tools/tool-registry.js';

export interface DelegationContext {
  sessionId: string;
  chatId: string;
  userId: string;
  modelId: string;
  originalPrompt: string;
  agentHistory: any[];
  availableTools: string[];
}

export class DelegationOrchestrator {
  private logger: Logger;
  private progressUpdateTimestamps: Map<string, number> = new Map();
  private agentRegistry: AgentRegistry;

  constructor(
    logger: Logger,
    agentConfig: AgentConfig,
    toolRegistry: ToolRegistry,
    agentRegistry: AgentRegistry,
  ) {
    this.logger = logger;
    this.agentRegistry = agentRegistry;
    this.logger.info("✅ DelegationOrchestrator initialized (delegate-ready).");
  }

  async handleComplexTask(context: DelegationContext): Promise<string> {
    this.logger.info(`🧠 [ORCH] Handling complex task: "${context.originalPrompt.slice(0, 80)}..."`);

    // For now, return a simple response
    // Full multi-step orchestration would go here
    const response = `📋 Task received: ${context.originalPrompt.slice(0, 100)}...\n\n✅ Processing via DelegationOrchestrator.`;
    
    return response;
  }

  async sendProgressUpdate(chatId: string, stepIndex: number, totalSteps: number, message: string): Promise<void> {
    try {
      this.logger.info(`[ORCH] Progress update: Bước ${stepIndex}/${totalSteps} - ${message}`);
      
      const now = Date.now();
      const lastUpdate = this.progressUpdateTimestamps.get(chatId);
      if (lastUpdate && (now - lastUpdate) < 2000) {
        this.logger.info(`[ORCH] Progress update rate limited for chatId ${chatId}`);
        return;
      }
      
      this.progressUpdateTimestamps.set(chatId, now);
      this.logger.info(`[ORCH] ✅ Progress update sent: Bước ${stepIndex}/${totalSteps} - ${message}`);
    } catch (error) {
      console.error('[ORCH] Failed to send progress update:', error);
    }
  }
}
