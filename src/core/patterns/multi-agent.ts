/**
 * @file multi-agent — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Multi-Agent Pattern — Debate & Consensus
 * Multiple agents debate a topic and reach consensus through structured discussion.
 * 
 * Flow:
 * 1. Each agent provides initial position
 * 2. Agents critique each other's positions
 * 3. Agents revise based on critiques
 * 4. Consensus is reached when agreement threshold is met
 */

export interface AgentPosition {
  agentId: string;
  agentName: string;
  position: string;
  confidence: number;
  round: number;
}

export interface Critique {
  fromAgent: string;
  toAgent: string;
  critique: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface DebateResult {
  consensus: string;
  agreementRate: number;
  rounds: number;
  positions: AgentPosition[];
  critiques: Critique[];
}

export class MultiAgentDebate {
  private agents: { id: string; name: string; perspective: string }[] = [];
  private maxRounds: number;
  private consensusThreshold: number;

  constructor(maxRounds: number = 3, consensusThreshold: number = 0.7) {
    this.maxRounds = maxRounds;
    this.consensusThreshold = consensusThreshold;
  }

  addAgent(id: string, name: string, perspective: string): void {
    this.agents.push({ id, name, perspective });
  }

  /**
   * Run a debate on the given topic.
   */
  async debate(topic: string): Promise<DebateResult> {
    const positions: AgentPosition[] = [];
    const critiques: Critique[] = [];
    let round = 0;
    let consensus = '';

    // Round 0: Initial positions
    for (const agent of this.agents) {
      positions.push({
        agentId: agent.id,
        agentName: agent.name,
        position: this.generateInitialPosition(agent, topic),
        confidence: 0.5 + Math.random() * 0.3,
        round: 0,
      });
    }

    // Debate rounds
    for (round = 1; round <= this.maxRounds; round++) {
      const roundCritiques = this.generateCritiques(positions.filter(p => p.round === round - 1));
      critiques.push(...roundCritiques);

      // Update positions based on critiques
      for (const agent of this.agents) {
        const agentCritiques = roundCritiques.filter(c => c.toAgent === agent.id);
        const currentPos = positions.filter(p => p.agentId === agent.id && p.round === round - 1)[0];

        if (currentPos) {
          positions.push({
            agentId: agent.id,
            agentName: agent.name,
            position: this.revisePosition(currentPos, agentCritiques, topic),
            confidence: this.calculateConfidence(currentPos, agentCritiques),
            round,
          });
        }
      }

      // Check consensus
      const latestPositions = positions.filter(p => p.round === round);
      const agreementRate = this.calculateAgreement(latestPositions);

      if (agreementRate >= this.consensusThreshold) {
        consensus = this.synthesizeConsensus(latestPositions);
        break;
      }
    }

    if (!consensus) {
      consensus = this.synthesizeConsensus(positions.filter(p => p.round === round));
    }

    return {
      consensus,
      agreementRate: this.calculateAgreement(positions.filter(p => p.round === round)),
      rounds: round,
      positions,
      critiques,
    };
  }

  private generateInitialPosition(agent: { perspective: string }, topic: string): string {
    return `[${agent.perspective}] Analysis of "${topic}": This perspective considers the implications from the ${agent.perspective.toLowerCase()} viewpoint.`;
  }

  private generateCritiques(positions: AgentPosition[]): Critique[] {
    const critiques: Critique[] = [];
    for (let i = 0; i < positions.length; i++) {
      for (let j = 0; j < positions.length; j++) {
        if (i !== j) {
          const severity = positions[i].confidence > 0.7 ? 'moderate' : 'minor';
          critiques.push({
            fromAgent: positions[i].agentId,
            toAgent: positions[j].agentId,
            critique: `From ${positions[i].agentName}'s perspective: ${positions[j].position.substring(0, 100)}... could benefit from considering ${positions[i].agentName.toLowerCase()} aspects.`,
            severity,
          });
        }
      }
    }
    return critiques;
  }

  private revisePosition(position: AgentPosition, critiques: Critique[], topic: string): string {
    const majorCritiques = critiques.filter(c => c.severity === 'major');
    if (majorCritiques.length > 0) {
      return `[Revised] ${position.position}\n\nAddressing critiques: ${majorCritiques.map(c => c.critique).join('; ')}`;
    }
    return position.position;
  }

  private calculateConfidence(position: AgentPosition, critiques: Critique[]): number {
    const majorCount = critiques.filter(c => c.severity === 'major').length;
    return Math.max(0.1, position.confidence - majorCount * 0.1);
  }

  private calculateAgreement(positions: AgentPosition[]): number {
    if (positions.length < 2) return 1;
    const avgConfidence = positions.reduce((sum, p) => sum + p.confidence, 0) / positions.length;
    return avgConfidence;
  }

  private synthesizeConsensus(positions: AgentPosition[]): string {
    const parts = positions.map(p => `## ${p.agentName}:\n${p.position}`);
    return `# Consensus Result\n\n${parts.join('\n\n---\n\n')}`;
  }
}

export default MultiAgentDebate;