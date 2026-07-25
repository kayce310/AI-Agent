/**
 * @file cron — Tool plugin
 * @layer core
 * @owner core-tools
 *
 * Cron job management: create, list, remove scheduled tasks.
 * Wraps CronScheduler from core/cron.
 */
import type { ToolPlugin } from './tool-registry.js';

// Singleton cron scheduler — lazy init
let _cronScheduler: any = null;
async function getCronScheduler(): Promise<any> {
  if (_cronScheduler) return _cronScheduler;
  try {
    const { CronScheduler } = await import('../cron/cron-scheduler.js');
    _cronScheduler = new CronScheduler();
    return _cronScheduler;
  } catch {
    return null;
  }
}

const plugin: ToolPlugin = {
  name: 'cron',
  tools: [
    {
      name: 'cron_list',
      description: 'List all registered cron jobs with their status.',
      schema: { type: 'object', properties: {}, required: [] },
      async execute() {
        const scheduler = await getCronScheduler();
        if (!scheduler) return { error: 'Cron scheduler not available' };
        const jobs = scheduler.listJobs();
        return { jobs, total: jobs.length };
      }
    },
    {
      name: 'cron_status',
      description: 'Show status of a specific cron job.',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Job name' }
        },
        required: ['name']
      },
      async execute(args: Record<string, any>) {
        const scheduler = await getCronScheduler();
        if (!scheduler) return { error: 'Cron scheduler not available' };
        const jobs = scheduler.listJobs();
        const job = jobs.find((j: any) => j.name === args.name);
        if (!job) return { error: `Job "${args.name}" not found` };
        return job;
      }
    },
    {
      name: 'cron_run',
      description: 'Manually trigger a cron job.',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Job name to run' }
        },
        required: ['name']
      },
      async execute(args: Record<string, any>) {
        const scheduler = await getCronScheduler();
        if (!scheduler) return { error: 'Cron scheduler not available' };
        const result = await scheduler.runJob(args.name, true);
        return { job: args.name, result };
      }
    },
    {
      name: 'cron_enable',
      description: 'Enable a cron job.',
      schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      async execute(args: Record<string, any>) {
        const scheduler = await getCronScheduler();
        if (!scheduler) return { error: 'Cron scheduler not available' };
        scheduler.enableJob(args.name);
        return { success: true, job: args.name, action: 'enabled' };
      }
    },
    {
      name: 'cron_disable',
      description: 'Disable a cron job.',
      schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
      async execute(args: Record<string, any>) {
        const scheduler = await getCronScheduler();
        if (!scheduler) return { error: 'Cron scheduler not available' };
        scheduler.disableJob(args.name);
        return { success: true, job: args.name, action: 'disabled' };
      }
    }
  ]
};

export default plugin;
