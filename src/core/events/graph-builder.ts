/**
 * @file Cognitive Graph Builder — Transform traces into causal decision graphs
 * @layer core
 * @created 2026-06-21
 * 
 * Input: CognitiveTrace (decisions + tools + artifacts)
 * Output: GraphNode[] + GraphEdge[]
 * 
 * Relations:
 *   Decision → Tool Called → Tool Finished → Artifact → Decision
 * 
 * Deterministic: Uses only taskId, decisionId, callId, timestamps.
 * No LLM inference. No text parsing.
 */

export interface GraphNode {
  id: string;
  type: 'decision' | 'tool' | 'artifact' | 'task';
  label: string;
  timestamp: number;
  decisionId?: string;
  callId?: string;
  taskId: string;
  payload?: any;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: 'caused' | 'executed' | 'produced' | 'followed';
  timestamp?: number;
}

export interface CognitiveGraph {
  taskId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface DecisionData {
  decisionId: string;
  decision: string;
  reason?: string;
  reasoningSnippet?: string;
  timestamp: number;
  taskId: string;
}

export interface ToolData {
  callId: string;
  toolName: string;
  decisionId: string;
  timestamp: number;
  taskId: string;
  status: 'called' | 'finished';
  success?: boolean;
  durationMs?: number;
}

export interface ArtifactData {
  type: string;
  timestamp: number;
  taskId: string;
  decisionId: string;
  payload: any;
}

export class CognitiveGraphBuilder {
  private taskId: string;
  private nodes: Map<string, GraphNode>;
  private edges: GraphEdge[];
  private decisionOrder: DecisionData[] = [];
  private toolsByDecision: Map<string, ToolData[]> = new Map();
  private artifactsByDecision: Map<string, ArtifactData[]> = new Map();

  constructor(taskId: string) {
    this.taskId = taskId;
    this.nodes = new Map();
    this.edges = [];
  }

  /**
   * Add decision node
   */
  addDecision(data: DecisionData): string {
    const nodeId = `decision:${data.decisionId}`;
    
    this.nodes.set(nodeId, {
      id: nodeId,
      type: 'decision',
      label: data.decision,
      timestamp: data.timestamp,
      decisionId: data.decisionId,
      taskId: this.taskId,
      payload: {
        reason: data.reason,
        reasoningSnippet: data.reasoningSnippet,
      },
    });

    this.decisionOrder.push(data);
    return nodeId;
  }

  /**
   * Add tool node (called or finished)
   */
  addTool(data: ToolData): string {
    const nodeId = `tool:${data.callId}`;
    
    if (!this.nodes.has(nodeId)) {
      this.nodes.set(nodeId, {
        id: nodeId,
        type: 'tool',
        label: `${data.toolName}${data.status === 'finished' ? (data.success ? ' ✓' : ' ✗') : ''}`,
        timestamp: data.timestamp,
        callId: data.callId,
        decisionId: data.decisionId,
        taskId: this.taskId,
        payload: {
          toolName: data.toolName,
          status: data.status,
          success: data.success,
          durationMs: data.durationMs,
        },
      });
    }

    // Track tools by decision
    if (!this.toolsByDecision.has(data.decisionId)) {
      this.toolsByDecision.set(data.decisionId, []);
    }
    this.toolsByDecision.get(data.decisionId)!.push(data);

    return nodeId;
  }

  /**
   * Add artifact node
   */
  addArtifact(data: ArtifactData): string {
    const nodeId = `artifact:${data.type}:${data.payload.path || data.payload.key || Date.now()}`;
    
    this.nodes.set(nodeId, {
      id: nodeId,
      type: 'artifact',
      label: `${data.type}: ${data.payload.path || data.payload.key || '?'}`,
      timestamp: data.timestamp,
      taskId: this.taskId,
      decisionId: data.decisionId,
      payload: data.payload,
    });

    // Track artifacts by decision
    if (!this.artifactsByDecision.has(data.decisionId)) {
      this.artifactsByDecision.set(data.decisionId, []);
    }
    this.artifactsByDecision.get(data.decisionId)!.push(data);

    return nodeId;
  }

  /**
   * Build graph edges: Decision → Tool → Artifact → NextDecision
   */
  buildEdges(): void {
    // Decision → Tool relationship
    this.toolsByDecision.forEach((tools, decisionId) => {
      const decisionNodeId = `decision:${decisionId}`;
      
      for (const tool of tools) {
        const toolNodeId = `tool:${tool.callId}`;
        
        // Decision caused tool call
        this.edges.push({
          from: decisionNodeId,
          to: toolNodeId,
          relation: 'caused',
          timestamp: tool.timestamp,
        });
      }
    });

    // Tool → Artifact relationship
    this.artifactsByDecision.forEach((artifacts, decisionId) => {
      const tools = this.toolsByDecision.get(decisionId) || [];
      
      for (const artifact of artifacts) {
        const artifactNodeId = this._getArtifactNodeId(artifact);
        
        // Link to the most recent tool in this decision
        const recentTool = tools
          .filter(t => t.timestamp < artifact.timestamp)
          .sort((a, b) => b.timestamp - a.timestamp)[0];
        
        if (recentTool) {
          const toolNodeId = `tool:${recentTool.callId}`;
          this.edges.push({
            from: toolNodeId,
            to: artifactNodeId,
            relation: 'produced',
            timestamp: artifact.timestamp,
          });
        }
      }
    });

    // Decision → NextDecision relationship (temporal flow)
    for (let i = 0; i < this.decisionOrder.length - 1; i++) {
      const current = this.decisionOrder[i];
      const next = this.decisionOrder[i + 1];
      
      const currentNodeId = `decision:${current.decisionId}`;
      const nextNodeId = `decision:${next.decisionId}`;
      
      this.edges.push({
        from: currentNodeId,
        to: nextNodeId,
        relation: 'followed',
        timestamp: next.timestamp,
      });
    }
  }

  /**
   * Build final graph
   */
  build(): CognitiveGraph {
    // Reset edges before building to prevent duplication on re-build
    this.edges = [];
    this.buildEdges();

    return {
      taskId: this.taskId,
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  /**
   * Clear all internal state.
   * Useful for defensive cleanup when reusing a builder instance.
   */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
    this.decisionOrder = [];
    this.toolsByDecision.clear();
    this.artifactsByDecision.clear();
  }

  /**
   * Helper: Get artifact node ID (idempotent)
   */
  private _getArtifactNodeId(artifact: ArtifactData): string {
    return `artifact:${artifact.type}:${artifact.payload.path || artifact.payload.key || artifact.timestamp}`;
  }
}

/**
 * Convert CognitiveTrace to CognitiveGraph
 */
export function traceToGraph(taskId: string, trace: any): CognitiveGraph {
  const builder = new CognitiveGraphBuilder(taskId);

  if (!trace || !trace.decisions) {
    return builder.build();
  }

  // Add decisions and their tools/artifacts
  for (const decision of trace.decisions) {
    builder.addDecision({
      decisionId: decision.decisionId,
      decision: decision.decision.payload?.decision || 'Unknown',
      reason: decision.decision.payload?.reason,
      reasoningSnippet: decision.decision.payload?.reasoningSnippet,
      timestamp: decision.decision.timestamp,
      taskId,
    });

    // Add tools for this decision
    for (const tool of decision.tools) {
      if (tool.toolCalled) {
        builder.addTool({
          callId: tool.toolCalled.payload?.callId,
          toolName: tool.toolCalled.payload?.toolName,
          decisionId: decision.decisionId,
          timestamp: tool.toolCalled.timestamp,
          taskId,
          status: 'called',
        });
      }

      if (tool.toolFinished) {
        builder.addTool({
          callId: tool.toolFinished.payload?.callId,
          toolName: tool.toolFinished.payload?.toolName,
          decisionId: decision.decisionId,
          timestamp: tool.toolFinished.timestamp,
          taskId,
          status: 'finished',
          success: tool.toolFinished.payload?.success,
          durationMs: tool.toolFinished.payload?.durationMs,
        });
      }
    }

    // Add artifacts for this decision
    for (const artifact of decision.artifacts) {
      builder.addArtifact({
        type: artifact.type,
        timestamp: artifact.timestamp,
        taskId,
        decisionId: decision.decisionId,
        payload: artifact.payload,
      });
    }
  }

  return builder.build();
}
