/**
 * @file memory — Tool plugin
 * @layer core
 * @owner core-tools
 *
 * Persistent memory: add/search/list memories.
 * Wraps globalMemoryStore from core/memory.
 */
import type { ToolPlugin } from './tool-registry.js';
import { globalMemoryStore } from '../memory/memory-store.js';

const plugin: ToolPlugin = {
  name: 'memory',
  tools: [
    {
      name: 'memory_add',
      description: 'Save a memory (fact, preference, correction, environment detail). Target: "user" (who the user is) or "memory" (your notes about env/projects/tools).',
      schema: {
        type: 'object',
        properties: {
          target: { type: 'string', enum: ['user', 'memory'], description: 'Which store: "user" or "memory"' },
          content: { type: 'string', description: 'The memory content (declarative fact, not imperative)' },
          action: { type: 'string', enum: ['add', 'replace', 'remove'], default: 'add' },
          old_text: { type: 'string', description: 'For replace/remove: unique substring identifying the entry' }
        },
        required: ['target', 'content']
      },
      async execute(args: Record<string, any>) {
        const { target, content, action = 'add', old_text } = args;
        if (!content) return { error: 'content is required' };

        if (action === 'add') {
          const tag = target === 'user' ? 'user-profile' : 'agent-memory';
          await globalMemoryStore.add('session', content, { tags: [tag], sessionId: `memory-${target}` });
          return { success: true, action: 'add', target };
        }

        if (action === 'replace' || action === 'remove') {
          if (!old_text) return { error: 'old_text is required for replace/remove' };
          const tag = target === 'user' ? 'user-profile' : 'agent-memory';
          const blocks = globalMemoryStore.getBlocksBySession(`memory-${target}`);
          const match = blocks.find(b => b.content.includes(old_text));
          if (!match) return { error: `No memory containing "${old_text}" found` };

          if (action === 'replace') {
            await globalMemoryStore.add('session', content, { tags: [tag], sessionId: `memory-${target}` });
          }
          // ADD-only store: we can't delete, but we can add a "REMOVED: old_text" marker
          if (action === 'remove') {
            await globalMemoryStore.add('session', `[REMOVED] ${old_text}`, { tags: [tag, 'removed'], sessionId: `memory-${target}` });
          }
          return { success: true, action, target };
        }

        return { error: `Unknown action: ${action}` };
      }
    },
    {
      name: 'memory_search',
      description: 'Search memories by keyword. Returns matching memory blocks.',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (keywords)' },
          target: { type: 'string', enum: ['user', 'memory', 'both'], default: 'both' },
          limit: { type: 'number', description: 'Max results', default: 10 }
        },
        required: ['query']
      },
      execute(args: Record<string, any>) {
        const { query, target = 'both', limit = 10 } = args;
        const sessions: string[] = [];
        if (target === 'user' || target === 'both') sessions.push('memory-user');
        if (target === 'memory' || target === 'both') sessions.push('memory-memory');

        const results: any[] = [];
        for (const sessionId of sessions) {
          const blocks = globalMemoryStore.getBlocksBySession(sessionId);
          for (const b of blocks) {
            if (b.content.toLowerCase().includes(query.toLowerCase())) {
              results.push({ content: b.content, type: b.type, timestamp: b.timestamp, sessionId });
            }
          }
        }
        return { results: results.slice(-limit), total: results.length };
      }
    },
    {
      name: 'memory_list',
      description: 'List all stored memories (optionally filtered by target).',
      schema: {
        type: 'object',
        properties: {
          target: { type: 'string', enum: ['user', 'memory', 'both'], default: 'both' }
        },
        required: []
      },
      execute(args: Record<string, any>) {
        const { target = 'both' } = args;
        const sessions: string[] = [];
        if (target === 'user' || target === 'both') sessions.push('memory-user');
        if (target === 'memory' || target === 'both') sessions.push('memory-memory');

        const results: any[] = [];
        for (const sessionId of sessions) {
          const blocks = globalMemoryStore.getBlocksBySession(sessionId);
          for (const b of blocks) {
            if (!b.tags?.includes('removed')) {
              results.push({ content: b.content, type: b.type, timestamp: b.timestamp, target: sessionId.includes('user') ? 'user' : 'memory' });
            }
          }
        }
        return { memories: results, total: results.length };
      }
    }
  ]
};

export default plugin;
