/**
 * Report Tools Plugin
 * Provides: generate_report (Phase 2c)
 */
import * as fs from 'fs';
import * as path from 'path';
import { ToolPlugin } from '../tool-registry.js';
import { BASE_PATH } from './_shared.js';

const plugin: ToolPlugin = {
  name: 'report',
  tools: [
    {
      name: 'generate_report',
      description: 'Tạo báo cáo tổng hợp từ template có sẵn',
      schema: {
        type: 'object',
        properties: {
          template: { type: 'string', description: 'Tên template (vd: daily, weekly, meeting)' },
          params: { type: 'string', description: 'Tham số JSON bổ sung cho template' }
        },
        required: ['template']
      },
      execute(args: Record<string, any>) {
        const template = args.template;
        let params: Record<string, any> = {};
        if (args.params) {
          try {
            params = JSON.parse(args.params);
          } catch {
            params = { raw: args.params };
          }
        }

        // Simple built-in templates
        if (template === 'daily') {
          const now = new Date().toISOString().split('T')[0];
          return `# Daily Report - ${now}\n\n## Overview\n${params.overview || 'No overview provided'}\n\n## Progress\n- TODO\n\n## Issues\n- None\n\n## Next Steps\n- None`;
        }
        if (template === 'weekly') {
          const now = new Date().toISOString().split('T')[0];
          return `# Weekly Report - ${now}\n\n## Summary\n${params.summary || 'No summary provided'}\n\n## Work Done\n- TODO\n\n## Next Week\n- None\n\n## Blockers\n- None`;
        }
        if (template === 'meeting') {
          const now = new Date().toISOString().split('T')[0];
          return `# Meeting Notes - ${now}\n\n## Attendees\n${params.attendees || 'N/A'}\n\n## Agenda\n${params.agenda || 'N/A'}\n\n## Decisions\n${params.decisions || 'N/A'}\n\n## Action Items\n- None`;
        }

        // Try template file
        const templatePath = path.join(BASE_PATH, 'knowledge/templates', `${template}.md`);
        if (fs.existsSync(templatePath)) {
          let content = fs.readFileSync(templatePath, 'utf8');
          // Simple variable substitution
          for (const [key, value] of Object.entries(params)) {
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
          }
          return { template, content };
        }

        return { error: `Template "${template}" không tồn tại. Các template có sẵn: daily, weekly, meeting.` };
      }
    }
  ]
};

export default plugin;