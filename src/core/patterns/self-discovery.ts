/**
 * Self-Discovery Pattern
 * Agent explores and discovers its own capabilities through self-reflection.
 * 
 * The agent:
 * 1. Analyzes its available tools and skills
 * 2. Tests capabilities through self-directed experiments
 * 3. Builds a capability map
 * 4. Identifies gaps and improvement areas
 */

export interface Capability {
  name: string;
  description: string;
  confidence: number;
  lastTested: number;
  testResults: { passed: boolean; details: string }[];
}

export interface DiscoveryReport {
  capabilities: Capability[];
  gaps: string[];
  recommendations: string[];
  overallReadiness: number;
}

export class SelfDiscovery {
  private capabilities: Map<string, Capability> = new Map();

  /**
   * Register a capability for tracking.
   */
  registerCapability(name: string, description: string): void {
    this.capabilities.set(name, {
      name,
      description,
      confidence: 0.5,
      lastTested: 0,
      testResults: [],
    });
  }

  /**
   * Run a self-test on a specific capability.
   */
  async testCapability(name: string, testFn: () => Promise<boolean>): Promise<{ passed: boolean; confidence: number }> {
    const cap = this.capabilities.get(name);
    if (!cap) return { passed: false, confidence: 0 };

    try {
      const passed = await testFn();
      cap.testResults.push({ passed, details: `Self-test at ${new Date().toISOString()}` });
      cap.lastTested = Date.now();

      // Update confidence based on recent results
      const recent = cap.testResults.slice(-5);
      const passRate = recent.filter(r => r.passed).length / recent.length;
      cap.confidence = passRate;

      return { passed, confidence: cap.confidence };
    } catch {
      cap.testResults.push({ passed: false, details: 'Test threw an exception' });
      cap.confidence = Math.max(0, cap.confidence - 0.1);
      return { passed: false, confidence: cap.confidence };
    }
  }

  /**
   * Generate a discovery report.
   */
  generateReport(): DiscoveryReport {
    const capabilities = Array.from(this.capabilities.values());
    const gaps = capabilities
      .filter(c => c.confidence < 0.5 || c.testResults.length === 0)
      .map(c => c.name);

    const recommendations: string[] = [];
    for (const cap of capabilities) {
      if (cap.testResults.length === 0) {
        recommendations.push(`Test capability "${cap.name}" — no test results yet`);
      } else if (cap.confidence < 0.5) {
        recommendations.push(`Improve capability "${cap.name}" — confidence is ${(cap.confidence * 100).toFixed(0)}%`);
      }
    }

    const overallReadiness = capabilities.length > 0
      ? capabilities.reduce((sum, c) => sum + c.confidence, 0) / capabilities.length
      : 0;

    return { capabilities, gaps, recommendations, overallReadiness };
  }
}

export default SelfDiscovery;