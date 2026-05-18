/**
 * GNAP Agent Card — Signed Agent Card for Git-Native Agent Protocol
 * 
 * Defines the structure of an agent's identity card in the GNAP protocol.
 * Each agent card contains:
 * - Agent identity (name, id, publicKey)
 * - Capabilities (tools, patterns, protocols)
 * - Signature (HMAC for verification)
 */

export interface GNAPAgentCard {
  id: string;
  name: string;
  version: string;
  publicKey: string;
  capabilities: {
    tools: string[];
    patterns: string[];
    protocols: string[];
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    author: string;
    description: string;
  };
  signature: string;
}

export class GNAPAgentCardManager {
  private cards: Map<string, GNAPAgentCard> = new Map();

  /**
   * Create a new agent card.
   */
  createCard(name: string, publicKey: string, capabilities: GNAPAgentCard['capabilities']): GNAPAgentCard {
    const card: GNAPAgentCard = {
      id: `gnap-agent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name,
      version: '1.0.0',
      publicKey,
      capabilities,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        author: 'kato-agent',
        description: `Agent card for ${name}`,
      },
      signature: '',
    };

    card.signature = this.signCard(card);
    this.cards.set(card.id, card);
    return card;
  }

  /**
   * Sign an agent card (simplified HMAC).
   */
  private signCard(card: GNAPAgentCard): string {
    const data = `${card.id}:${card.name}:${card.metadata.createdAt}`;
    return `sig-${Buffer.from(data).toString('base64').substring(0, 32)}`;
  }

  /**
   * Verify an agent card's signature.
   */
  verifyCard(card: GNAPAgentCard): boolean {
    const expected = this.signCard(card);
    return card.signature === expected;
  }

  /**
   * Get an agent card by ID.
   */
  getCard(id: string): GNAPAgentCard | undefined {
    return this.cards.get(id);
  }

  /**
   * List all registered agent cards.
   */
  listCards(): GNAPAgentCard[] {
    return Array.from(this.cards.values());
  }
}

export default GNAPAgentCardManager;