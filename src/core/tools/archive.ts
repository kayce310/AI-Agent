/**
 * Network Tools Plugin
 * Provides: fetch_url
 */
import { execSync } from 'child_process';
import { ToolPlugin } from './tool-registry.js';
import { BASE_PATH } from './_shared.js';

const plugin: ToolPlugin = {
  name: 'network',
  tools: [
    {
      name: 'fetch_url',
      description: 'Truy cập internet để lấy nội dung từ một URL',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL cần truy cập (http/https)' }
        },
        required: ['url']
      },
      execute(args: Record<string, any>) {
        const url = args.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          return { error: 'URL phải bắt đầu bằng http:// hoặc https://' };
        }

        const script = `
const fetch = globalThis.fetch;
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
fetch('${url.replace(/'/g, "\\'")}', {
  signal: controller.signal,
  headers: { 'User-Agent': 'Kato-Agent/1.0' }
}).then(async r => {
  clearTimeout(timeout);
  if (!r.ok) { process.exit(1); }
  const txt = await r.text();
  process.stdout.write(txt);
}).catch(() => process.exit(1));
`;

        try {
          const output = execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
            cwd: BASE_PATH,
            encoding: 'utf8',
            timeout: 15000,
            maxBuffer: 1024 * 1024,
            windowsHide: true
          });

          if (!output || output.trim().length === 0) {
            return `❌ Không thể truy cập ${url} (HTTP error hoặc timeout)`;
          }

          return `📄 Nội dung từ ${url}:\n\n${output.substring(0, 102400)}` + (output.length > 102400 ? '\n\n[... trang quá dài, đã cắt ở 100KB]' : '');
        } catch (err: any) {
          return { error: `Lỗi fetch ${url}: ${err.message}` };
        }
      }
    }
  ]
};

export default plugin;