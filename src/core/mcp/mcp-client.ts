/**
 * @file mcp-client â€” MCP module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-mcp
 */

/**
 * MCP Client â€” Kato wrapper around the Model Context Protocol SDK
 * Phase 4.1a: Connect to external MCP servers, discover tools, integrate into ToolRegistry
 *
 * Supports transports:
 *   - stdio: spawn a local subprocess that speaks MCP over stdin/stdout
 *   - sse: connect to a remote MCP server via Server-Sent Events
 *   - websocket: connect via WebSocket
 *
 * Usage:
 *   const mcp = new MCPClientManager();
 *   await mcp.connectStdio('server-name', { command: 'node', args: ['server.js'] });
 *   const tools = await mcp.listTools('server-name');
 *   const result = await mcp.callTool('server-name', 'some_tool', { arg1: 'val' });
 *   await mcp.disconnect('server-name');
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { ToolPlugin, Tool } from '../tools/tool-registry.js';

// â”€â”€ Types â”€â”€

export interface MCPServerConfig {
  name: string;
  transport: 'stdio' | 'sse' | 'websocket';
  /** For stdio transport */
  command?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  /** For sse/websocket transport */
  url?: string;
  /** Connection options */
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
}

export interface MCPToolInfo {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, object>;
    required?: string[];
  };
}

export interface MCPConnectionStatus {
  connected: boolean;
  serverName: string;
  serverVersion?: string;
  toolCount: number;
  error?: string;
}

// â”€â”€ Constants â”€â”€

const DEFAULT_RECONNECT_DELAY = 5_000;
const DEFAULT_MAX_RECONNECT = 3;

// â”€â”€ MCP Client Manager â”€â”€

export class MCPClientManager {
  private clients = new Map<string, Client>();
  private transports = new Map<string, any>();
  private configs = new Map<string, MCPServerConfig>();
  private toolCache = new Map<string, MCPToolInfo[]>();
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private reconnectAttempts = new Map<string, number>();

  /**
   * Connect to an MCP server via stdio transport.
   * Spawns a subprocess and communicates over stdin/stdout.
   */
  async connectStdio(config: MCPServerConfig): Promise<void> {
    if (!config.command) throw new Error('command is required for stdio transport');
    this.configs.set(config.name, config);

    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args ?? [],
      cwd: config.cwd,
      env: config.env ? { ...config.env } : undefined,
    });

    await this._connect(config.name, transport);
  }

  /**
   * Connect to an MCP server via SSE transport.
   */
  async connectSSE(config: MCPServerConfig): Promise<void> {
    if (!config.url) throw new Error('url is required for sse transport');
    this.configs.set(config.name, config);

    const transport = new SSEClientTransport(new URL(config.url));

    await this._connect(config.name, transport);
  }

  /**
   * Connect to an MCP server via WebSocket transport.
   * Uses SSE transport with ws: protocol.
   */
  async connectWebSocket(config: MCPServerConfig): Promise<void> {
    if (!config.url) throw new Error('url is required for websocket transport');
    this.configs.set(config.name, config);

    // WebSocket uses the same SSE transport with ws:// URL
    const transport = new SSEClientTransport(new URL(config.url));

    await this._connect(config.name, transport);
  }

  /**
   * Internal: create client, connect, and discover tools.
   */
  private async _connect(name: string, transport: any): Promise<void> {
    // Disconnect existing if any
    await this.disconnect(name);

    const client = new Client(
      { name: 'KatoAgent', version: '1.0.0' },
      { capabilities: {} },
    );

    await client.connect(transport);

    this.clients.set(name, client);
    this.transports.set(name, transport);
    this.reconnectAttempts.set(name, 0);

    // Pre-cache tool list
    await this.refreshTools(name);
  }

  /**
   * Refresh tool cache for a connected server.
   */
  async refreshTools(serverName: string): Promise<MCPToolInfo[]> {
    const client = this.clients.get(serverName);
    if (!client) throw new Error(`MCP server "${serverName}" not connected`);

    const result = await client.listTools();
    const tools = (result.tools ?? []).map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as MCPToolInfo['inputSchema'],
    }));

    this.toolCache.set(serverName, tools);
    return tools;
  }

  /**
   * List all tools from a connected server.
   */
  listTools(serverName: string): MCPToolInfo[] {
    return this.toolCache.get(serverName) ?? [];
  }

  /**
   * Get all tools from all connected servers, keyed by server name.
   */
  listAllTools(): Map<string, MCPToolInfo[]> {
    return new Map(this.toolCache);
  }

  /**
   * Call a tool on a connected MCP server.
   */
  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<any> {
    const client = this.clients.get(serverName);
    if (!client) {
      return { error: `MCP server "${serverName}" not connected` };
    }

    try {
      const result: any = await client.callTool({
        name: toolName,
        arguments: args,
      });

      // Format response
      if (result.isError) {
        const textContent = (result.content ?? []).find((c: any) => c.type === 'text');
        return { error: textContent?.text ?? 'Tool returned error' };
      }

      // Extract text content
      const textParts = (result.content ?? [])
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text);

      return {
        content: textParts.join('\n'),
        raw: result,
      };
    } catch (err: any) {
      return { error: `MCP tool call failed: ${err.message}` };
    }
  }

  /**
   * Get connection status of all servers.
   */
  getStatus(): MCPConnectionStatus[] {
    const statuses: MCPConnectionStatus[] = [];
    for (const [name, client] of this.clients) {
      const caps = client.getServerCapabilities();
      const ver = client.getServerVersion();
      statuses.push({
        connected: true,
        serverName: name,
        serverVersion: ver ? `${ver.name} v${ver.version}` : undefined,
        toolCount: this.toolCache.get(name)?.length ?? 0,
      });
    }
    // Add disconnected servers
    for (const [name] of this.configs) {
      if (!this.clients.has(name)) {
        statuses.push({
          connected: false,
          serverName: name,
          toolCount: 0,
        });
      }
    }
    return statuses;
  }

  /**
   * Disconnect from an MCP server.
   */
  async disconnect(serverName: string): Promise<void> {
    // Clear reconnect timer
    const timer = this.reconnectTimers.get(serverName);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(serverName);
    }

    const client = this.clients.get(serverName);
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore close errors
      }
      this.clients.delete(serverName);
      this.transports.delete(serverName);
      this.toolCache.delete(serverName);
      this.reconnectAttempts.delete(serverName);
      /* debug log removed */
    }
  }

  /**
   * Disconnect from all servers.
   */
  async disconnectAll(): Promise<void> {
    const names = Array.from(this.clients.keys());
    await Promise.all(names.map(n => this.disconnect(n)));
  }

  /**
   * Convert MCP tools to Kato ToolPlugin format for ToolRegistry.
   */
  toPlugin(serverName: string): ToolPlugin {
    const tools = this.toolCache.get(serverName) ?? [];

    return {
      name: `mcp:${serverName}`,
      tools: tools.map(toolInfo => ({
        name: `mcp_${serverName}_${toolInfo.name}`,
        description: `[MCP:${serverName}] ${toolInfo.description ?? toolInfo.name}`,
        schema: toolInfo.inputSchema,
        execute: async (args: Record<string, any>) => {
          return this.callTool(serverName, toolInfo.name, args);
        },
      } as Tool)),
    };
  }
}

// â”€â”€ Singleton â”€â”€
export const globalMCPClientManager = new MCPClientManager();
export default MCPClientManager;
