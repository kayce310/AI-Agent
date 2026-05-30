/**
 * @file network — Tool plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts, src/core/tools/_shared.ts
 * @imported-by src/core/tools/tool-registry.ts
 * @owner core-tools
 */

/**
 * Network Tools Plugin
 * Provides: fetch_url (Phase 2c — Jina AI Reader)
 * Uses Jina AI Reader (https://r.jina.ai/) for clean Markdown extraction.
 * No API key required for basic usage. Optional JINA_API_KEY for higher rate limits.
 */
import type { ToolPlugin } from './tool-registry.js';

const JINA_READER_PREFIX = 'https://r.jina.ai/';

const plugin: ToolPlugin = {
  name: 'network',
  tools: [
    {
      name: 'fetch_url',
      description: 'Fetch content from a URL. Uses Jina AI Reader to extract clean Markdown from web pages. Returns structured content with title, text, and links. No API key required.',
      schema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to fetch' },
          timeout: { type: 'number', description: 'Timeout (ms), default 30000' }
        },
        required: ['url']
      },
      async execute(args: Record<string, any>) {
        const urlStr = args.url;
        const timeout = args.timeout || 30000;

        // Skip Jina for local/internal URLs
        const isExternal = urlStr.startsWith('http://') || urlStr.startsWith('https://');
        const isAlreadyJina = urlStr.includes('r.jina.ai');
        const isLocalhost = urlStr.includes('localhost') || urlStr.includes('127.0.0.1');

        const targetUrl = (isExternal && !isAlreadyJina && !isLocalhost)
          ? `${JINA_READER_PREFIX}${urlStr}`
          : urlStr;

        const headers: Record<string, string> = {
          'Accept': 'text/plain, application/json',
          'X-Return-Format': 'markdown',
        };

        // Optional: use API key if available (higher rate limits)
        if (process.env.JINA_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
        }

        try {
          const response = await fetch(targetUrl, {
            headers,
            signal: AbortSignal.timeout(timeout),
          });

          const text = await response.text();

          return {
            statusCode: response.status,
            contentType: 'text/markdown',
            content: text,
            sourceUrl: urlStr,
            fetchedVia: (isExternal && !isAlreadyJina && !isLocalhost) ? 'jina' : 'direct',
          };
        } catch (err: any) {
          return { error: `Fetch failed: ${err.message}` };
        }
      }
    }
  ]
};

export default plugin;