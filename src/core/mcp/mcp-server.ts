/**
 * @file mcp-server — MCP module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-mcp
 */

/**
 * MCP Server — Expose Kato internal tools as an MCP server
 * Phase 4.1b: Start an MCP server so external MCP clients can call Kato tools
 *
 * Transport: stdio (for now), could add SSE/WebSocket later
 *
 * Usage:
 *   import { startMCPServer } from './core/mcp-server.js';
 *   const stop = await startMCPServer(toolRegistry);
 *   // ... later ...
 *   await stop();
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { ToolRegistry } from '../tools/tool-registry.js';

/**
 * Start an MCP server over stdio that exposes all tools from the given registry.
 * Returns a stop function to close the server.
 */
export async function startMCPServer(registry: ToolRegistry): Promise<() => Promise<void>> {
  const server = new McpServer(
    { name: 'KatoAgent-MCP', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ── Register each Kato tool as an MCp tool ──
  const tools = registry.getAllTools();
  for (const tool of tools) {
    server.tool(
      tool.name,
      tool.description ?? '',
      tool.schema?.properties ?? {},
      async (args: any) => {
        try {
          const result = await registry.execute(tool.name, args);
          if (result?.error) {
            return {
              content: [{ type: 'text' as const, text: result.error }],
              isError: true,
            };
          }
          // Format result as text content
          const text = typeof result === 'string'
            ? result
            : JSON.stringify(result, null, 2);
          return {
            content: [{ type: 'text' as const, text }],
          };
        } catch (err: any) {
          return {
            content: [{ type: 'text' as const, text: `Error: ${err.message}` }],
            isError: true,
          };
        }
      },
    );
  }

  // ── Connect transport ──
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log(`🖥️  MCP Server started (stdio transport) — ${tools.length} tools exposed`);

  return async () => {
    await server.close();
    console.log('🖥️  MCP Server stopped');
  };
}

export default startMCPServer;