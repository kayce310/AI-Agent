/**
 * Orchestrator-Workforce Pattern
 * Multi-agent coordination with a central orchestrator managing worker agents.
 * 
 * The orchestrator:
 * 1. Decomposes tasks into subtasks
 * 2. Assigns subtasks to specialized workers
 * 3. Monitors progress and handles failures
 * 4. Synthesizes results from all workers
 */

export interface WorkerConfig {
  id: string;
  name: string;
  specialization: string;
  tools: string[];
  maxRetries: number;
}

export interface WorkItem {
  id: string;
  task: string;
  assignedWorker: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  retries: number;
}

export interface WorkforcePlan {
  orchestratorId: string;
  workers: WorkerConfig[];
  workItems: WorkItem[];
  synthesisStrategy: 'concatenate' | 'vote' | 'rank' | 'merge';
}

export class OrchestratorWorkforce {
  private workers: Map<string, WorkerConfig> = new Map();
  private workItems: Map<string, WorkItem> = new Map();
  private synthesisStrategy: 'concatenate' | 'vote' | 'rank' | 'merge';

  constructor(synthesisStrategy: 'concatenate' | 'vote' | 'rank' | 'merge' = 'merge') {
    this.synthesisStrategy = synthesisStrategy;
  }

  /**
   * Register a worker agent.
   */
  registerWorker(config: WorkerConfig): void {
    this.workers.set(config.id, config);
  }

  /**
   * Decompose a task into subtasks and assign to workers.
   */
  plan(task: string): WorkforcePlan {
    const subtasks = this.decompose(task);
    const items: WorkItem[] = [];

    for (let i = 0; i < subtasks.length; i++) {
      const workerId = this.selectWorker(subtasks[i]);
      items.push({
        id: `work-${Date.now()}-${i}`,
        task: subtasks[i],
        assignedWorker: workerId,
        status: 'pending',
        retries: 0,
      });
    }

    return {
      orchestratorId: 'orchestrator',
      workers: Array.from(this.workers.values()),
      workItems: items,
      synthesisStrategy: this.synthesisStrategy,
    };
  }

  private decompose(task: string): string[] {
    // Split by common delimiters
    const steps = task.split(/\b(then|after that|next|finally|step \d+[:.]?)\b/i)
      .filter(s => s.trim().length > 10 && !/^(then|after|next|finally|step)$/i.test(s.trim()));

    if (steps.length <= 1) {
      // If no clear decomposition, create research + execute steps
      return [
        `Research and gather information about: ${task}`,
        `Synthesize findings and produce final output for: ${task}`,
      ];
    }

    return steps.map(s => s.trim()).filter(s => s.length > 0);
  }

  private selectWorker(subtask: string): string {
    const workers = Array.from(this.workers.values());
    if (workers.length === 0) return 'default-worker';

    // Simple keyword matching for worker selection
    const lowerSubtask = subtask.toLowerCase();
    for (const worker of workers) {
      if (lowerSubtask.includes(worker.specialization.toLowerCase())) {
        return worker.id;
      }
    }

    // Round-robin fallback
    return workers[Math.floor(Math.random() * workers.length)].id;
  }

  /**
   * Execute a work item (simulated — real impl would call LLM).
   */
  async executeItem(item: WorkItem): Promise<WorkItem> {
    const worker = this.workers.get(item.assignedWorker);
    if (!worker) {
      return { ...item, status: 'failed', error: `Worker ${item.assignedWorker} not found` };
    }

    item.status = 'running';

    // Simulate execution with prompt template
    const prompt = this.buildWorkerPrompt(worker, item.task);

    // In real implementation, this would call the LLM
    // For now, return a placeholder result
    item.result = `[${worker.name}] Completed: ${item.task.substring(0, 100)}...`;
    item.status = 'completed';

    return item;
  }

  private buildWorkerPrompt(worker: WorkerConfig, task: string): string {
    return `You are ${worker.name}, specialized in ${worker.specialization}.

Available tools: ${worker.tools.join(', ')}

Task: ${task}

Complete this task using your specialization. Provide a detailed, structured response.`;
  }

  /**
   * Synthesize results from all completed work items.
   */
  synthesize(items: WorkItem[]): string {
    const completed = items.filter(i => i.status === 'completed' && i.result);

    if (completed.length === 0) {
      return 'No completed work items to synthesize.';
    }

    switch (this.synthesisStrategy) {
      case 'concatenate':
        return completed.map(i => i.result).join('\n\n---\n\n');

      case 'vote':
        // Return the most common result (simplified)
        return completed[0]?.result || '';

      case 'rank':
        // Rank by length (as a proxy for completeness)
        return completed
          .sort((a, b) => (b.result?.length || 0) - (a.result?.length || 0))
          [0]?.result || '';

      case 'merge':
      default:
        return this.mergeResults(completed);
    }
  }

  private mergeResults(items: WorkItem[]): string {
    const sections = items.map((item, idx) => {
      const worker = this.workers.get(item.assignedWorker);
      return `## Part ${idx + 1} (${worker?.name || 'Unknown'}):\n${item.result}`;
    });

    return `# Synthesized Result\n\n${sections.join('\n\n')}`;
  }

  /**
   * Handle a failed work item by reassigning or retrying.
   */
  handleFailure(item: WorkItem): WorkItem {
    const worker = this.workers.get(item.assignedWorker);
    const maxRetries = worker?.maxRetries || 3;

    if (item.retries < maxRetries) {
      return { ...item, retries: item.retries + 1, status: 'pending', error: undefined };
    }

    // Reassign to a different worker
    const otherWorkers = Array.from(this.workers.values()).filter(w => w.id !== item.assignedWorker);
    if (otherWorkers.length > 0) {
      const newWorker = otherWorkers[Math.floor(Math.random() * otherWorkers.length)];
      return { ...item, assignedWorker: newWorker.id, status: 'pending', retries: 0, error: undefined };
    }

    return { ...item, status: 'failed', error: 'Max retries exceeded and no alternative workers available' };
  }
}

export default OrchestratorWorkforce;