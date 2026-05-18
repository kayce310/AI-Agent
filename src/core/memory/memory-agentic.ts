/**
 * MemoryAgentic — Agentic memory layer that allows agents to modify memory autonomously.
 * 
 * Extends MemoryTemporal with write/delete capabilities and agent-driven memory management.
 * 
 * This implements the "agentic memory" concept from the architecture PDF.
 */
import MemoryTemporal, { MemoryBlock, MemoryConfig } from './memory-temporal.js';

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
  public async addBlockForAgent(agentId: string, block: MemoryBlock): Promise<boolean> {
    // Agent-specific validation could be added here if needed
    this.addBlock(block);
    return true;
  }

  /**
   * Agent can delete a memory block
   */
  public async deleteBlockForAgent(agentId: string, blockId: string): Promise<boolean> {
    this.deleteBlock(blockId);
    return true;
  }

  /**
   * Get memory blocks for a specific agent (filtered by world/context)
   */
  public getAgentMemory(agentId: string, world?: string): MemoryBlock[] {
    const all = this.getRecentBlocks(100);
    return world ? all.filter((b: any) => b.metadata?.world === world) : all;
  }
}

export default MemoryAgentic;