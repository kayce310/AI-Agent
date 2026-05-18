/**
 * Tool-Augmented Pattern
 * Dynamic tool use — agent selects and uses tools based on task requirements.
 * 
 * The agent:
 * 1. Analyzes the task to determine required tools
 * 2. Selects appropriate tools from available set
 * 3. Executes tools with proper parameters
 * 4. Integrates tool outputs into final response
 */

export interface Tool {
  name: string;
  description: string;
  parameters: { name: string; type: string; description: string; required: boolean }[];
  execute: (args: Record<string, any>) => Promise<string>;
}

export interface ToolCall {
  tool: string;
  args: Record<string, any>;
  result?: string;
  error?: string;
}

export class ToolAugmented {
  private tools: Map<string, Tool> = new Map();
  private callHistory: ToolCall[] = [];

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Select tools relevant to the task.
   */
  selectTools(task: string): Tool[] {
    const lowerTask = task.toLowerCase();
    return Array.from(this.tools.values()).filter(tool => {
      const keywords = tool.description.toLowerCase().split(/\s+/);
      return keywords.some(k => lowerTask.includes(k));
    });
  }

  /**
   * Execute a tool call.
   */
  async executeCall(toolName: string, args: Record<string, any>): Promise<ToolCall> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { tool: toolName, args, error: `Tool "${toolName}" not found` };
    }

    try {
      const result = await tool.execute(args);
      const call: ToolCall = { tool: toolName, args, result };
      this.callHistory.push(call);
      return call;
    } catch (err: any) {
      const call: ToolCall = { tool: toolName, args, error: err.message };
      this.callHistory.push(call);
      return call;
    }
  }

  /**
   * Build a prompt with tool descriptions.
   */
  buildToolPrompt(task: string, selectedTools: Tool[]): string {
    const toolDescs = selectedTools.map(t =>
      `- ${t.name}: ${t.description}\n  Parameters: ${t.parameters.map(p => `${p.name} (${p.type})${p.required ? ' [required]' : ''}`).join(', ')}`
    ).join('\n');

    return `Task: ${task}

Available tools:
${toolDescs}

Select the appropriate tool(s) and provide arguments in JSON format:
{
  "tool": "<tool_name>",
  "args": { "<param>": "<value>" }
}`;
  }

  getHistory(): ToolCall[] {
    return [...this.callHistory];
  }
}

export default ToolAugmented;