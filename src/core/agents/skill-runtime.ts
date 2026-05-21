/**
 * @file skill-runtime — Agent module
 * @layer core
 * @depends-on src/core/types.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-agents
 */

/**
 * Kato Agent — SkillRuntime (Executable Skill System)
 * Phase 3.7 — Skill Runtime
 *
 * Skills are no longer just markdown context. They are executable modules with:
 * - Lifecycle hooks (load → activate → handle → deactivate)
 * - Trigger patterns (keyword/regex matching for automatic activation)
 * - Lazy-loading from knowledge/wiki/skills/
 * - Integration with HookRegistry (skill:load / skill:unload events)
 *
 * Architecture:
 *   SkillRuntime ──load()──> SkillInstance (active)
 *         │                       │
 *         ├── load(skill)         ├── onActivate()
 *         ├── unload(name)        ├── onTask(task) → SkillResult | null
 *         └── getActiveSkills()   └── onDeactivate()
 */

import * as fs from 'fs';
import * as path from 'path';
import { HookRegistry } from '../hooks.js';

// ── Types ──

export interface SkillTrigger {
  type: 'keyword' | 'regex' | 'event';
  pattern: string;
  description?: string;
}

export interface SkillContext {
  workspace: string;
  sessionId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface Task {
  type: string;
  input: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
}

export interface SkillResult {
  success: boolean;
  output: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
  error?: string;
}

export interface SkillDefinition {
  name: string;
  version: string;
  description: string;
  triggers: SkillTrigger[];
  tags: string[];
  contentPath: string;       // Path to the .md file
  content?: string;          // Cached markdown content

  /** Lifecycle hooks */
  onActivate?(context: SkillContext): Promise<void>;
  onTask?(task: Task): Promise<SkillResult | null>;
  onDeactivate?(): Promise<void>;
}

export interface ActiveSkill {
  definition: SkillDefinition;
  activatedAt: string;
  context: SkillContext;
}

// ── Default Triggers from Frontmatter / Tags ──

/**
 * Derive default triggers from skill tags and name.
 * E.g., a skill tagged "react" → trigger keyword "react"
 */
function deriveTriggers(name: string, tags: string[]): SkillTrigger[] {
  const triggers: SkillTrigger[] = [];

  // Keyword trigger from the skill name (lowercased, without common suffixes)
  const baseName = name
    .replace(/^(best-practices|patterns|guide|expert)/i, '')
    .replace(/-(best-practices|patterns|guide|expert)$/i, '')
    .replace(/-/g, ' ').trim();
  if (baseName) {
    triggers.push({
      type: 'keyword',
      pattern: baseName.toLowerCase().split(' ')[0],
      description: `Auto-trigger from skill name "${name}"`,
    });
  }

  // Keyword triggers from tags
  for (const tag of tags) {
    if (tag.length > 2) {
      triggers.push({
        type: 'keyword',
        pattern: tag.toLowerCase(),
        description: `Auto-trigger from tag "${tag}"`,
      });
    }
  }

  return triggers;
}

// ── Skill Parser ──

/**
 * Parse frontmatter from a markdown skill file to extract metadata.
 * Supports:
 *   tags: [tag1, tag2]
 *   version: 1.0.0
 *   **Generated:** 2026-05-03
 */
function parseSkillMetadata(content: string): { tags: string[]; version: string } {
  const tags: string[] = [];
  let version = '1.0.0';

  // Extract tags from frontmatter-like lines
  const tagMatch = content.match(/tags:\s*\[([^\]]+)\]/i);
  if (tagMatch) {
    tags.push(...tagMatch[1].split(',').map(t => t.trim().replace(/['"]/g, '')));
  }

  // Also extract #hashtags
  const hashTags = content.match(/#([a-zA-Z0-9_\-]+)/g);
  if (hashTags) {
    for (const ht of hashTags) {
      const clean = ht.replace(/^#/, '');
      if (!tags.includes(clean)) tags.push(clean);
    }
  }

  // Extract version from first 20 lines (frontmatter area)
  const header = content.split('\n').slice(0, 20).join('\n');
  const verMatch = header.match(/version:\s*["']?([\d.]+)["']?/i);
  if (verMatch) version = verMatch[1];

  return { tags, version };
}

// ── SkillRuntime ──

export class SkillRuntime {
  private skillsDir: string;
  private active = new Map<string, ActiveSkill>();
  private hooks?: HookRegistry;

  constructor(skillsDir?: string, hooks?: HookRegistry) {
    this.skillsDir = skillsDir || path.join(process.cwd(), 'knowledge/wiki/skills');
    this.hooks = hooks;
  }

  /**
   * List all available skill definitions (from disk, not activated yet).
   * Scans the skills directory for .md files.
   */
  listAvailable(): SkillDefinition[] {
    const defs: SkillDefinition[] = [];

    if (!fs.existsSync(this.skillsDir)) {
      return defs;
    }

    const items = fs.readdirSync(this.skillsDir, { withFileTypes: true });

    for (const item of items) {
      if (item.isFile() && item.name.endsWith('.md') && !item.name.startsWith('.')) {
        const fp = path.join(this.skillsDir, item.name);
        const content = fs.readFileSync(fp, 'utf8');
        const { tags, version } = parseSkillMetadata(content);
        const name = item.name.replace(/\.md$/, '');
        const description = content.split('\n').slice(0, 5)
          .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>'))
          .join(' ').substring(0, 200);

        defs.push({
          name,
          version,
          description: description || name,
          triggers: deriveTriggers(name, tags),
          tags,
          contentPath: fp,
          content,
        });
      } else if (item.isDirectory()) {
        // Subdirectory: look for SKILL.md or README.md or <dir-name>.md
        const possibleFiles = ['SKILL.md', 'README.md', `${item.name}.md`, `skill.md`];
        for (const f of possibleFiles) {
          const fp = path.join(this.skillsDir, item.name, f);
          if (fs.existsSync(fp)) {
            const content = fs.readFileSync(fp, 'utf8');
            const { tags, version } = parseSkillMetadata(content);
            const name = item.name;
            const description = content.split('\n').slice(0, 5)
              .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>'))
              .join(' ').substring(0, 200);

            defs.push({
              name,
              version,
              description: description || name,
              triggers: deriveTriggers(name, tags),
              tags,
              contentPath: fp,
              content,
            });
            break;
          }
        }
      }
    }

    return defs;
  }

  /**
   * Load and activate a skill by name.
   * 1. Find the skill definition (from disk cache or re-scan).
   * 2. Call onActivate() if defined.
   * 3. Register in active skills map.
   * 4. Emit skill:load hook.
   */
  async load(name: string, context?: SkillContext): Promise<SkillDefinition> {
    // Check if already active
    if (this.active.has(name)) {
      return this.active.get(name)!.definition;
    }

    // Find the definition
    const available = this.listAvailable();
    const def = available.find(
      s => s.name.toLowerCase() === name.toLowerCase()
    );

    if (!def) {
      throw new Error(`Skill "${name}" not found in ${this.skillsDir}`);
    }

    // Attach lifecycle hooks
    const skillDef: SkillDefinition = {
      ...def,
      onActivate: async (ctx: SkillContext) => {
        if (this.hooks) {
          await this.hooks.emit('skill:load', {
            skillName: name,
            version: def.version,
            context: ctx,
          });
        }
        // Default: just log activation
        console.log(`[SKILL] Activated: ${name} v${def.version}`);
      },
      onTask: async (task: Task) => {
        // Default behavior: return the markdown content as context output
        if (def.content) {
          const triggered = def.triggers.some(t => {
            if (t.type === 'keyword') {
              return task.input.toLowerCase().includes(t.pattern.toLowerCase());
            }
            if (t.type === 'regex') {
              try {
                return new RegExp(t.pattern, 'i').test(task.input);
              } catch {
                return false;
              }
            }
            return false;
          });

          if (triggered || task.type === 'direct') {
            return {
              success: true,
              output: def.content,
              data: {
                skillName: name,
                version: def.version,
                tags: def.tags,
                triggers: def.triggers,
                contentLength: def.content.length,
              },
            };
          }
        }
        return null; // Not applicable
      },
      onDeactivate: async () => {
        if (this.hooks) {
          await this.hooks.emit('skill:unload', {
            skillName: name,
            version: def.version,
          });
        }
        console.log(`[SKILL] Deactivated: ${name} v${def.version}`);
      },
    };

    // Activate
    const skillContext: SkillContext = context ?? { workspace: process.cwd() };
    await skillDef.onActivate!(skillContext);

    this.active.set(name, {
      definition: skillDef,
      activatedAt: new Date().toISOString(),
      context: skillContext,
    });

    return skillDef;
  }

  /**
   * Unload (deactivate) a skill.
   * Calls onDeactivate() if defined, removes from active map.
   */
  async unload(name: string): Promise<boolean> {
    const active = this.active.get(name);
    if (!active) return false;

    if (active.definition.onDeactivate) {
      await active.definition.onDeactivate();
    }

    this.active.delete(name);
    return true;
  }

  /**
   * Unload all active skills.
   */
  async unloadAll(): Promise<number> {
    let count = 0;
    for (const [name] of this.active) {
      await this.unload(name);
      count++;
    }
    return count;
  }

  /**
   * Process a task through active skills.
   * Returns the first non-null result (priority-based).
   */
  async processTask(task: Task): Promise<SkillResult | null> {
    for (const [, active] of this.active) {
      if (active.definition.onTask) {
        const result = await active.definition.onTask(task);
        if (result !== null) {
          return result;
        }
      }
    }
    return null;
  }

  /**
   * Check if a task input matches any active skill's triggers.
   * Returns matching skill names.
   */
  findMatchingSkills(input: string): string[] {
    const matches: string[] = [];
    for (const [name, active] of this.active) {
      for (const trigger of active.definition.triggers) {
        if (trigger.type === 'keyword') {
          if (input.toLowerCase().includes(trigger.pattern.toLowerCase())) {
            matches.push(name);
            break;
          }
        }
        if (trigger.type === 'regex') {
          try {
            if (new RegExp(trigger.pattern, 'i').test(input)) {
              matches.push(name);
              break;
            }
          } catch {
            // Invalid regex — skip
          }
        }
      }
    }
    return matches;
  }

  /**
   * Get all currently active skills.
   */
  getActiveSkills(): ActiveSkill[] {
    return Array.from(this.active.values());
  }

  /**
   * Get active skill count.
   */
  get activeCount(): number {
    return this.active.size;
  }

  /**
   * Check if a specific skill is active.
   */
  isActive(name: string): boolean {
    return this.active.has(name);
  }

  /**
   * Get active skill by name.
   */
  getActive(name: string): ActiveSkill | undefined {
    return this.active.get(name);
  }
}

// ── Singleton ──
export const globalSkillRuntime = new SkillRuntime();

export default SkillRuntime;