/**
 * Tool Registry — Verify plugin discovery and tool availability.
 */
import { describe, it, expect } from 'vitest';
import { getDefaultRegistry } from '../src/core/tools/tool-registry.js';

describe('ToolRegistry', () => {
  it('loads archive tools into the default registry', async () => {
    const registry = await getDefaultRegistry();
    const toolNames = registry.listTools();
    expect(toolNames).toContain('search_archived_md');
    expect(toolNames).toContain('quote_from_source');
  });
});
