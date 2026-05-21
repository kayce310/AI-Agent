/**
 * @file network — Tool plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts, src/core/tools/_shared.ts
 * @imported-by src/core/tools/tool-registry.ts
 * @owner core-tools
 */

/**
 * Network Tools Plugin
 * Provides: fetch_url (Phase 2c)
 */
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { ToolPlugin } from './tool-registry.js';

const plugin: ToolPlugin = {
  name: 'network',
  tools: [
    {
      name: 'fetch_url',
      description: 'Tải nội dung từ URL (hỗ trợ HTTP/HTTPS)',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL cần fetch' },
          timeout: { type: 'number', description: 'Timeout (ms), mặc định 30000' }
        },
        required: ['url']
      },
      execute(args: Record<string, any>) {
        return new Promise((resolve) => {
          const urlStr = args.url;
          const timeout = args.timeout || 30000;
          const parsedUrl = new URL(urlStr);
          const mod = parsedUrl.protocol === 'https:' ? https : http;

          const req = mod.get(urlStr, {
            timeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            },
          }, (res) => {
            let data = '';
            res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
            res.on('end', () => {
              const headers: Record<string, string> = {};
              for (const [k, v] of Object.entries(res.headers)) {
                headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
              }
              resolve({
                statusCode: res.statusCode,
                statusMessage: res.statusMessage,
                headers,
                contentLength: data.length,
                content: data.length > 100000 ? data.substring(0, 100000) + '\n\n[... content truncated at 100000 chars]' : data,
              });
            });
          });

          req.on('error', (err) => {
            resolve({ error: `Network error: ${err.message}` });
          });

          req.on('timeout', () => {
            req.destroy();
            resolve({ error: `Request timed out after ${timeout}ms` });
          });
        });
      }
    }
  ]
};

export default plugin;