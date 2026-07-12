/**
 * @file memory-extractor — Extract knowledge from conversations → Obsidian .md
 * @layer core
 * @ponytail: no LLM extraction, simple heuristic-based
 *   Upgrade to LLM-based summarization when content quality becomes limiting.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface KnowledgeEntry {
  type: 'concept' | 'fact' | 'decision';
  content: string;
  tags: string[];
  source: string;
}

/**
 * Extract knowledge entries from conversation messages.
 * ponytail: simple heuristic — assistant messages > 100 chars = concept.
 * Tags from word frequency (capped at 5 per entry).
 */
export function extractKnowledge(
  messages: { role: string; content: string }[],
  topic?: string,
): KnowledgeEntry[] {
  const entries: KnowledgeEntry[] = [];
  for (const msg of messages) {
    if (msg.role !== 'assistant' || msg.content.length < 100) continue;
    entries.push({
      type: 'concept',
      content: msg.content,
      tags: extractTags(msg.content),
      source: topic || 'conversation',
    });
  }
  return entries;
}

const STOPWORDS = new Set([
  'và','của','là','có','được','một','trong','cho','với','không',
  'các','bạn','tôi','này','khi','sẽ','để','về','từ','như','cũng',
  'nếu','thì','ở','đã','đang','sau','trước','the','and','for','that',
  'this','with','from','which','are','was','were','been','have','has',
]);

function extractTags(content: string): string[] {
  const words = content.toLowerCase().split(/[\s,.;:!?()]+/);
  const freq = new Map<string, number>();
  for (const w of words) {
    const clean = w.replace(/[^a-z0-9_\-àáạãăâậấẫầđéẹẽèêệếềểỡởợỡớờúùủũụưứừửữựíìỉĩịóòỏõọôốồổỗộơớờởỡợấầẩẫậ]/g, '');
    if (clean.length > 3 && !STOPWORDS.has(clean)) {
      freq.set(clean, (freq.get(clean) || 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Save knowledge entries as Obsidian .md files with YAML frontmatter.
 * Creates wiki-style tags: [[tag]] for each extracted tag.
 */
export async function saveToObsidian(
  entries: KnowledgeEntry[],
  vaultPath: string,
): Promise<string[]> {
  const created: string[] = [];
  for (const entry of entries) {
    const slug = entry.content
      .slice(0, 60)
      .replace(/[^a-zA-Z0-9_\-àáạãăâậấẫầđéẹẽèêệếềểỡởợỡớờúùủũụưứừửữựíìỉĩịóòỏõọôốồổỗộơớờởỡợấầẩẫậ\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toLowerCase();
    const filename = `${slug || 'untitled'}.md`;
    const filepath = path.join(vaultPath, 'coral', filename);
    await fs.mkdir(path.dirname(filepath), { recursive: true });

    const wikilinks = entry.tags.map(t => `[[${t}]]`).join(' ');

    const md = [
      '---',
      `type: ${entry.type}`,
      `tags: [${entry.tags.map(t => `"${t}"`).join(', ')}]`,
      `created: ${new Date().toISOString()}`,
      `source: ${entry.source}`,
      '---',
      '',
      entry.content,
      '',
      `---`,
      `Related: ${wikilinks}`,
    ].join('\n');

    await fs.writeFile(filepath, md, 'utf-8');
    created.push(filepath);
  }
  return created;
}
