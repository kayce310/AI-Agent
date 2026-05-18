/**
 * Agent Workforce Pattern
 * Manages a pool of specialized agents with task distribution and load balancing.
 */

export interface WorkforceAgent {
  id: string;
  name: string;
  skills: string[];
  capacity: number;
  currentLoad: number;
}

export interface WorkAssignment {
  taskId: string;
  task: string;
  assignedAgent: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'queued' | 'assigned' | 'in_progress' | 'completed';
}

export class AgentWorkforce {
  private agents: Map<string, WorkforceAgent> = new Map();
  private assignments: Map<string, WorkAssignment> = new Map();

  registerAgent(agent: WorkforceAgent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Assign a task to the best available agent.
   */
  assignTask(task: string, priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'): WorkAssignment | null {
    const available = Array.from(this.agents.values())
      .filter(a => a.currentLoad < a.capacity)
      .sort((a, b) => (a.currentLoad / a.capacity) - (b.currentLoad / b.capacity));

    if (available.length === 0) return null;

    // Select agent with lowest load ratio that has matching skills
    const best = available.find(a =>
      a.skills.some(s => task.toLowerCase().includes(s.toLowerCase()))
    ) || available[0];

    const assignment: WorkAssignment = {
      taskId: `task-${Date.now()}`,
      task,
      assignedAgent: best.id,
      priority,
      status: 'assigned',
    };

    best.currentLoad++;
    this.assignments.set(assignment.taskId, assignment);
    return assignment;
  }

  completeTask(taskId: string): void {
    const assignment = this.assignments.get(taskId);
    if (assignment) {
      assignment.status = 'completed';
      const agent = this.agents.get(assignment.assignedAgent);
      if (agent) agent.currentLoad = Math.max(0, agent.currentLoad - 1);
    }
  }

  getWorkload(): { agentId: string; name: string; load: number; capacity: number }[] {
    return Array.from(this.agents.values()).map(a => ({
      agentId: a.id,
      name: a.name,
      load: a.currentLoad,
      capacity: a.capacity,
    }));
  }
}

export default AgentWorkforce;