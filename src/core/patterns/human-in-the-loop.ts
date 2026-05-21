/**
 * @file human-in-the-loop — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Human-in-the-Loop Pattern
 * Requires human approval before executing critical actions.
 * 
 * Flow:
 * 1. Agent proposes an action
 * 2. Action is classified by risk level
 * 3. High-risk actions require human approval
 * 4. Approved actions are executed
 * 5. Rejected actions are logged and agent revises
 */

export interface ProposedAction {
  id: string;
  description: string;
  tool: string;
  args: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
}

export interface ApprovalResult {
  approved: boolean;
  actionId: string;
  feedback?: string;
  timestamp: number;
}

export class HumanInTheLoop {
  private pendingApprovals: Map<string, ProposedAction> = new Map();
  private approvalHistory: ApprovalResult[] = [];
  private autoApproveLevels: Set<string>;

  constructor(autoApprove: string[] = ['low']) {
    this.autoApproveLevels = new Set(autoApprove);
  }

  /**
   * Submit an action for approval.
   */
  submitAction(action: ProposedAction): { status: 'auto_approved' | 'pending'; actionId: string } {
    if (this.autoApproveLevels.has(action.riskLevel)) {
      this.approvalHistory.push({
        approved: true,
        actionId: action.id,
        feedback: 'Auto-approved based on risk level',
        timestamp: Date.now(),
      });
      return { status: 'auto_approved', actionId: action.id };
    }

    this.pendingApprovals.set(action.id, action);
    return { status: 'pending', actionId: action.id };
  }

  /**
   * Approve or reject a pending action.
   */
  approve(actionId: string, approved: boolean, feedback?: string): ApprovalResult {
    const result: ApprovalResult = {
      approved,
      actionId,
      feedback,
      timestamp: Date.now(),
    };

    this.approvalHistory.push(result);
    if (approved) {
      this.pendingApprovals.delete(actionId);
    }

    return result;
  }

  /**
   * Get all pending approvals.
   */
  getPending(): ProposedAction[] {
    return Array.from(this.pendingApprovals.values());
  }

  /**
   * Classify risk level based on action type.
   */
  classifyRisk(tool: string, args: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    const criticalTools = ['delete', 'remove', 'drop', 'truncate', 'rm'];
    const highTools = ['write', 'create', 'update', 'send', 'post', 'put'];
    const mediumTools = ['read', 'list', 'search', 'get'];

    if (criticalTools.some(t => tool.toLowerCase().includes(t))) return 'critical';
    if (highTools.some(t => tool.toLowerCase().includes(t))) return 'high';
    if (mediumTools.some(t => tool.toLowerCase().includes(t))) return 'medium';
    return 'low';
  }
}

export default HumanInTheLoop;