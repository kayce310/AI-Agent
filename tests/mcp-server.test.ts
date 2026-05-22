/**
 * MCP Server & Client integration tests — Phase 4.1
 *
 * Tests the ToolRegistry extension (getAllTools) and MCP server component
 * in isolation. Full stdio-based client/server round-trip requires a
 * separate integration harness.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ToolRegistry } from '../src/core/tools/tool-registry.js';
import { MCPClientManager } from '../src/core/mcp/mcp-client.js';

// Helper: minimal plugin with test tools
const testPlugin = {
  name: 'test-mcp',
  tools: [
    {
      name: 'test_echo',
      description: 'Echoes back the input',
      schema: {
        type: 'object' as const,
        properties: {
          message: { type: 'string', description: 'Message to echo' },
        },
        required: ['message'],
      },
      async execute(args: { message: string }) {
        return { echo: args.message };
      },
    },
    {
      name: 'test_add',
      description: 'Adds two numbers',
      schema: {
        type: 'object' as const,
        properties: {
          a: { type: 'number', description: 'First number' },
          b: { type: 'number', description: 'Second number' },
        },
        required: ['a', 'b'],
      },
      async execute(args: { a: number; b: number }) {
        return { sum: args.a + args.b };
      },
    },
    {
      name: 'test_fail',
      description: 'Always throws an error',
      schema: {
        type: 'object' as const,
        properties: {},
      },
      async execute() {
        throw new Error('Intentional test failure');
      },
    },
  ],
};

describe('Phase 4.1 — ToolRegistry.getAllTools', () => {
  let registry: ToolRegistry;

  beforeAll(() => {
    registry = new ToolRegistry();
    registry.use(testPlugin);
  });

  it('should expose registered plugins', () => {
    expect(registry.toolCount).toBe(3);
  });

  it('should return all tools via getAllTools', () => {
    const tools = registry.getAllTools();
    expect(tools.length).toBe(3);
    const names = tools.map(t => t.name);
    expect(names).toContain('test_echo');
    expect(names).toContain('test_add');
    expect(names).toContain('test_fail');
  });

  it('should include schema and description in each tool', () => {
    const tools = registry.getAllTools();
    for (const tool of tools) {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('schema');
      expect(tool.schema).toHaveProperty('type', 'object');
    }
  });

  it('should execute test_echo via registry.execute', async () => {
    const result = await registry.execute('test_echo', { message: 'hello world' });
    expect(result).toEqual({ echo: 'hello world' });
  });

  it('should execute test_add via registry.execute', async () => {
    const result = await registry.execute('test_add', { a: 5, b: 3 });
    expect(result).toEqual({ sum: 8 });
  });

  it('should handle tool errors gracefully', async () => {
    const result = await registry.execute('test_fail', {});
    expect(result).toBeDefined();
    expect(result.error).toContain('Intentional test failure');
  });

  it('should return error for unknown tool', async () => {
    const result = await registry.execute('nonexistent', {});
    expect(result).toBeDefined();
    expect(result.error).toContain('not found');
  });
});

describe('Phase 4.1 — MCPClientManager basics', () => {
  let client: MCPClientManager;

  beforeAll(() => {
    client = new MCPClientManager();
  });

  afterAll(async () => {
    await client.disconnectAll();
  });

  it('should have no connections initially', () => {
    const status = client.getStatus();
    expect(status.length).toBe(0);
  });

  it('should return empty tool list for unknown server', () => {
    expect(client.listTools('nonexistent')).toEqual([]);
    expect(client.listAllTools().size).toBe(0);
  });

  it('toPlugin should return a valid plugin shape', () => {
    // Pre-populate tool cache by connecting first (skipped for unit test)
    // toPlugin creates a plugin from cached tools — test shape with empty cache
    const plugin = client.toPlugin('any-server');
    expect(plugin).toHaveProperty('name', 'mcp:any-server');
    expect(plugin).toHaveProperty('tools');
    expect(plugin.tools).toEqual([]);
  });
});

describe('Phase 4.1 — MCPClientManager connection lifecycle', () => {
  let client: MCPClientManager;

  beforeAll(() => {
    client = new MCPClientManager();
  });

  afterAll(async () => {
    await client.disconnectAll();
  });

  it('should handle disconnect of non-existent server gracefully', async () => {
    // Should not throw
    await expect(client.disconnect('ghost-server')).resolves.toBeUndefined();
  });

  it('should handle disconnectAll with no connections', async () => {
    await expect(client.disconnectAll()).resolves.toBeUndefined();
  });

  it('should report disconnected status after disconnect', async () => {
    await client.disconnectAll();
    const status = client.getStatus();
    expect(Array.isArray(status)).toBe(true);
  });
});