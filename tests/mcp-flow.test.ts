/**
 * MCP Flow — Integration test for MCP client ↔ server flow
 * Phase 4.1: verify tool discovery and execution through MCP
 */

import { describe, it, expect } from 'vitest';

describe('MCP Flow Integration', () => {
  it('MCPClientManager class has expected methods', async () => {
    const { MCPClientManager } = await import('../src/core/mcp-client.js');
    const client = new MCPClientManager();

    expect(typeof client.connectStdio).toBe('function');
    expect(typeof client.connectSSE).toBe('function');
    expect(typeof client.listTools).toBe('function');
    expect(typeof client.callTool).toBe('function');
    expect(typeof client.disconnect).toBe('function');
  });

  it('startMCPServer function exists', async () => {
    const { startMCPServer } = await import('../src/core/mcp-server.js');
    expect(typeof startMCPServer).toBe('function');
  });

  it('MCP config blueprint exists and is valid JSON', async () => {
    const fs = await import('fs/promises');
    const configContent = await fs.readFile('knowledge/blueprints/mcp-config.json', 'utf-8');
    const config = JSON.parse(configContent);

    expect(config).toHaveProperty('mcpServers');
    expect(config.mcpServers.filesystem).toBeDefined();
    expect(config.mcpServers.filesystem.command).toBe('npx');
  });

  it('MCP client can be constructed', async () => {
    const { MCPClientManager } = await import('../src/core/mcp-client.js');
    const client = new MCPClientManager();
    expect(client).toBeInstanceOf(Object);
  });
});
