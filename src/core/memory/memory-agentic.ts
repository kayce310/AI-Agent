/**
 * MemoryAgentic — Agentic memory layer that allows agents to modify memory autonomously.
 *
 * Extends MemoryTemporal with write/delete capabilities and agent-driven memory management.
 *
 * This implements the "agentic memory" concept from the architecture PDF.
 */
import MemoryTemporal, { MemoryConfig, MemoryItem } from './memory-temporal.js';
import { MemoryBlock } from './memory-log.js';

export interface MemoryAgenticConfig extends MemoryConfig {
  allowAgentWrite?: boolean;
  maxAgentWritesPerDay?: number;
}

const DEFAULT_CONFIG: MemoryAgenticConfig = {
  maxRetentionDays: 30,
  maxBlockSize: 1024,
  allowAgentWrite: true,
  maxAgentWritesPerDay: 1000,
};

export class MemoryAgentic extends MemoryTemporal {
  private agenticConfig: MemoryAgenticConfig;

  constructor(config?: MemoryAgenticConfig) {
    super(config);
    this.agenticConfig = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Agent can add a new memory block
   */
  public async addBlockForAgent(agentId: string, block: Omit<MemoryBlock, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): Promise<boolean> {
    await this.addBlock(block.content, {
      type: block.type,
      agentId,
      sessionId: block.sessionId,
      tags: block.tags,
      entities: block.entities,
      parentId: block.parentId,
    });
    return true;
  }

  /**
   * Agent can delete a memory block
   */
  public async deleteBlockForAgent(agentId: string, blockId: string): Promise<boolean> {
    return this.deleteBlock(blockId);
  }

  /**
   * Get memory blocks for a specific agent (filtered by world/context)
   */
  public async getAgentMemory(agentId: string, world?: string): Promise<MemoryItem[]> {
    return this.query({ agentId, world, limit: 100 });
  }
}

export default MemoryAgentic;
