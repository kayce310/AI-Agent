/**
 * @file audit-logger.ts — Comprehensive audit logging for security compliance
 * @layer core
 * @security CRITICAL — Logs all agent actions for forensic analysis
 * 
 * Logs:
 * - All tool executions (who, what, when, why)
 * - All LLM calls (model, tokens, cost)
 * - All memory operations (read/write/delete)
 * - Security events (auth failures, injections blocked)
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AuditEvent {
  timestamp: string;
  eventType: 'tool_call' | 'llm_call' | 'memory_op' | 'security_event' | 'session_event';
  userId: string;
  sessionId?: string;
  action: string;
  resource?: string;
  result: 'success' | 'failure' | 'blocked';
  details?: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  duration?: number;
  errorMessage?: string;
}

export class AuditLogger {
  private logFile: string;
  private enabled: boolean = true;
  
  constructor(logPath?: string) {
    this.logFile = logPath || path.join(process.cwd(), 'logs', 'audit.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Log a tool execution
   */
  logToolCall(
    userId: string,
    toolName: string,
    args: Record<string, any>,
    result: 'success' | 'failure' | 'blocked',
    options: {
      sessionId?: string;
      duration?: number;
      errorMessage?: string;
      riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    } = {}
  ): void {
    // Sanitize sensitive args
    const sanitizedArgs = this.sanitizeArgs(args);
    
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'tool_call',
      userId,
      sessionId: options.sessionId,
      action: `tool:${toolName}`,
      resource: sanitizedArgs.path || sanitizedArgs.url || sanitizedArgs.command,
      result,
      details: { args: sanitizedArgs },
      riskLevel: options.riskLevel || this.assessToolRisk(toolName, sanitizedArgs),
      duration: options.duration,
      errorMessage: options.errorMessage,
    };
    
    this.writeEvent(event);
  }

  /**
   * Log an LLM API call
   */
  logLLMCall(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    result: 'success' | 'failure',
    options: {
      sessionId?: string;
      duration?: number;
      cost?: number;
      errorMessage?: string;
    } = {}
  ): void {
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'llm_call',
      userId,
      sessionId: options.sessionId,
      action: `llm:${model}`,
      resource: model,
      result,
      details: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        cost: options.cost || this.estimateCost(model, inputTokens, outputTokens),
      },
      riskLevel: 'low',
      duration: options.duration,
      errorMessage: options.errorMessage,
    };
    
    this.writeEvent(event);
  }

  /**
   * Log a memory operation
   */
  logMemoryOp(
    userId: string,
    operation: 'read' | 'write' | 'delete' | 'query',
    resource: string,
    result: 'success' | 'failure',
    options: {
      sessionId?: string;
      duration?: number;
      errorMessage?: string;
    } = {}
  ): void {
    const event: AuditEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'memory_op',
      userId,
      sessionId: options.sessionId,
      action: `memory:${operation}`,
      resource,
      result,
      riskLevel: operation === 'delete' ? 'medium' : 'low',
      duration: options.duration,
      errorMessage: options.errorMessage,
    };
    
    this.writeEvent(event);
  }

  /**
   * Log a security event
   */
  logSecurityEvent(
    userId: string,
    event: string,
    details: Record<string, any>,
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  ): void {
    const auditEvent: AuditEvent = {
      timestamp: new Date().toISOString(),
      eventType: 'security_event',
      userId,
      action: `security:${event}`,
      result: 'blocked',
      details: this.sanitizeArgs(details),
      riskLevel,
    };
    
    this.writeEvent(auditEvent);
  }

  /**
   * Sanitize sensitive arguments before logging
   */
  private sanitizeArgs(args: Record<string, any>): Record<string, any> {
    const sanitized = { ...args };
    
    // Mask sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'credential', 'auth'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    // Truncate long values
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '...[TRUNCATED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Assess risk level for tool calls
   */
  private assessToolRisk(toolName: string, args: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Commands that can modify system state
    if (toolName === 'execute_command') {
      const cmd = args.command?.toLowerCase() || '';
      if (cmd.includes('rm') || cmd.includes('delete') || cmd.includes('format')) {
        return 'critical';
      }
      if (cmd.includes('sudo') || cmd.includes('chmod') || cmd.includes('chown')) {
        return 'high';
      }
      return 'medium';
    }
    
    // High: File modifications
    if (toolName === 'write_file' || toolName === 'delete_file') {
      return 'high';
    }
    
    // Medium: Network calls
    if (toolName === 'fetch_url' || toolName === 'network_post') {
      return 'medium';
    }
    
    // Low: Read operations
    return 'low';
  }

  /**
   * Estimate cost based on model and tokens
   */
  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Rough estimates (check actual pricing for accuracy)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'claude-3-opus': { input: 0.015, output: 0.075 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 },
      'deepseek': { input: 0.0001, output: 0.0002 },
    };
    
    const modelKey = Object.keys(pricing).find(k => model.toLowerCase().includes(k));
    if (!modelKey) return 0;
    
    const rates = pricing[modelKey];
    return (inputTokens * rates.input + outputTokens * rates.output) / 1000;
  }

  /**
   * Write event to log file
   */
  private writeEvent(event: AuditEvent): void {
    if (!this.enabled) return;
    
    try {
      const logLine = JSON.stringify(event) + '\n';
      fs.appendFileSync(this.logFile, logLine);
    } catch (error) {
      console.error('[AuditLogger] Failed to write event:', error);
    }
  }

  /**
   * Query audit log for specific events
   */
  queryEvents(filter: {
    userId?: string;
    eventType?: string;
    startDate?: Date;
    endDate?: Date;
    riskLevel?: string;
  }): AuditEvent[] {
    try {
      const content = fs.readFileSync(this.logFile, 'utf8');
      const lines = content.trim().split('\n');
      
      return lines
        .map(line => JSON.parse(line) as AuditEvent)
        .filter(event => {
          if (filter.userId && event.userId !== filter.userId) return false;
          if (filter.eventType && event.eventType !== filter.eventType) return false;
          if (filter.riskLevel && event.riskLevel !== filter.riskLevel) return false;
          if (filter.startDate && new Date(event.timestamp) < filter.startDate) return false;
          if (filter.endDate && new Date(event.timestamp) > filter.endDate) return false;
          return true;
        });
    } catch (error) {
      return [];
    }
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
