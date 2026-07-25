/**
 * @file todo — Tool plugin
 * @layer core
 * @owner core-tools
 *
 * Task management for tracking multi-step work.
 * In-memory store (ephemeral per session).
 */
import type { ToolPlugin } from './tool-registry.js';

interface Task { id: string; content: string; status: string; }

const tasks: Task[] = [];

const plugin: ToolPlugin = {
  name: 'todo',
  tools: [
    {
      name: 'todo_read',
      description: 'Read current task list. Returns all tasks with status.',
      schema: { type: 'object', properties: {}, required: [] },
      execute() {
        if (!tasks.length) return { tasks: [], summary: 'No tasks' };
        const counts = { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
        tasks.forEach(t => { counts[t.status as keyof typeof counts] = (counts[t.status as keyof typeof counts] || 0) + 1; });
        return { tasks, summary: `${tasks.length} total, ${counts.pending} pending, ${counts.in_progress} in progress, ${counts.completed} completed, ${counts.cancelled} cancelled` };
      }
    },
    {
      name: 'todo_write',
      description: 'Write task list. Creates/updates tasks. Each task: {id: string, content: string, status: "pending"|"in_progress"|"completed"|"cancelled"}. Pass merge=false (default) to replace all tasks, merge=true to update existing by id and add new ones.',
      schema: {
        type: 'object',
        properties: {
          todos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                content: { type: 'string' },
                status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] }
              },
              required: ['id', 'content', 'status']
            }
          },
          merge: { type: 'boolean', description: 'Merge into existing list (true) or replace (false)', default: false }
        },
        required: ['todos']
      },
      execute(args: Record<string, any>) {
        const incoming = args.todos as Task[];
        const doMerge = args.merge === true;
        if (doMerge) {
          const byId = new Map(tasks.map(t => [t.id, t]));
          for (const t of incoming) {
            if (byId.has(t.id)) Object.assign(byId.get(t.id)!, t);
            else { tasks.push(t); byId.set(t.id, t); }
          }
        } else {
          tasks.length = 0;
          tasks.push(...incoming);
        }
        return { success: true, total: tasks.length };
      }
    }
  ]
};

export default plugin;
