/**
 * MemoryTemporal — time-indexed block storage for agent memory
 *
 * Provides temporal queries (e.g., "get memory from last week") and supports Letta-style
 * layered memory with a *world* block type.
 */

export interface MemoryBlock {
  id: string;
  createdAt: number;
  content: string;
  metadata?: Record<string, any>;
}

export interface MemoryConfig {
  maxRetentionDays?: number;
  maxBlockSize?: number;
}

export class MemoryTemporal {
  private blocks: Map<string, MemoryBlock> = new Map();

  // keep private, but store fully-populated config so no "possibly undefined" reads
  private config: Required<MemoryConfig>;

  constructor(config?: MemoryConfig) {
    this.config = {
      maxRetentionDays: config?.maxRetentionDays ?? 30,
      maxBlockSize: config?.maxBlockSize ?? 1024,
    };
  }

  /** Add a new memory block */
  public addBlock(block: MemoryBlock): void {
    this.blocks.set(block.id, block);
  }

  /** Retrieve a block by its ID */
  public getBlock(id: string): MemoryBlock | undefined {
    return this.blocks.get(id);
  }

  /** Get most recent N blocks within retention window */
  public getRecentBlocks(limit: number = 10): MemoryBlock[] {
    const now = Date.now();
    const retentionMs = this.config.maxRetentionDays * 24 * 60 * 60 * 1000;

    return Array.from(this.blocks.values())
      .filter((b) => now - b.createdAt <= retentionMs)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /** Remove a block by ID */
  public deleteBlock(id: string): void {
    this.blocks.delete(id);
  }

  /** Get all blocks for a specific world (future extension) */
  public getBlocksByWorld(world: string): MemoryBlock[] {
    return Array.from(this.blocks.values()).filter((b) => b.metadata?.world === world);
  }
}

export default MemoryTemporal;