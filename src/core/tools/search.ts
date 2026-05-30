/**
 * @file search.ts — Web Search Tool Plugin
 * Uses Tavily Search API optimized for AI agents
 * Returns clean, structured results without HTML noise
 */

import type { ToolPlugin, Tool } from './tool-registry.js';

const TAVILY_API_URL = 'https://api.tavily.com/search';

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  answer?: string;
  results: TavilyResult[];
}

async function webSearch(query: string, options?: {
  maxResults?: number;
  includeAnswer?: boolean;
  searchDepth?: 'basic' | 'advanced';
}): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return JSON.stringify({ error: 'TAVILY_API_KEY not configured' });
  }

  const payload = {
    api_key: apiKey,
    query,
    max_results: options?.maxResults ?? 5,
    include_answer: options?.includeAnswer ?? true,
    search_depth: options?.searchDepth ?? 'basic',
  };

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return JSON.stringify({ error: `Tavily API error: ${response.status}` });
    }

    const data: TavilyResponse = await response.json();

    // Format output for agent consumption — clean, no HTML
    const lines: string[] = [];

    if (data.answer) {
      lines.push(`**Answer:** ${data.answer}\n`);
    }

    lines.push(`**Search Results for:** "${query}"\n`);

    data.results.forEach((r, i) => {
      lines.push(`${i + 1}. **${r.title}**`);
      lines.push(`   URL: ${r.url}`);
      lines.push(`   ${r.content.slice(0, 300)}...\n`);
    });

    return lines.join('\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `Search failed: ${msg}` });
  }
}

const searchTool: Tool = {
  name: 'web_search',
  description: [
    'Search the web for current information, news, prices, events, or any real-time data.',
    'Use this FIRST when you need information that may have changed recently.',
    'Returns a summary answer plus top search results with URLs.',
    'After getting URLs, use fetch_url to get full content if needed.',
  ].join(' '),
  schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query in the most natural language. Be specific.',
      },
      max_results: {
        type: 'number',
        description: 'Number of results to return (default: 5, max: 10)',
      },
      include_answer: {
        type: 'boolean',
        description: 'Whether to include AI-generated answer summary (default: true)',
      },
    },
    required: ['query'],
  },
  execute(args: Record<string, any>) {
    return webSearch(args.query, {
      maxResults: args.max_results,
      includeAnswer: args.include_answer,
    });
  },
};

export const searchPlugin: ToolPlugin = {
  name: 'search',
  tools: [searchTool],
};

export default searchPlugin;
