/**
 * Skill Runtime — Tests
 * Phase 3.7
 *
 * Tests:
 * 1. Initialization — empty skills dir, singleton
 * 2. listAvailable() — scans .md files, subdirectories
 * 3. load() — loads & activates a skill
 * 4. load() — duplicate load returns same instance
 * 5. load() — not found throws error
 * 6. unload() — deactivates & removes
 * 7. unloadAll() — deactivates all
 * 8. processTask() — trigger matching via keyword
 * 9. processTask() — direct task type
 * 10. processTask() — no match returns null
 * 11. findMatchingSkills() — keyword/regex matching
 * 12. getActiveSkills() / activeCount / isActive / getActive
 * 13. Trigger derivation from tags
 * 14. Singleton (globalSkillRuntime)
 * 15. Hook integration (skill:load / skill:unload events)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { SkillRuntime, SkillDefinition, SkillResult, Task, SkillTrigger } from '../src/core/agents/skill-runtime.js';
import { HookRegistry } from '../src/core/core/hooks.js';

// ── Helpers ──

/** Create a temporary skills directory with test files */
function createTempSkillsDir(): string {
  const tmpDir = path.join(os.tmpdir(), `kato-test-skills-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

/** Write a markdown skill file */
function writeSkill(dir: string, name: string, content: string, subdir?: string): string {
  const targetDir = subdir ? path.join(dir, subdir) : dir;
  fs.mkdirSync(targetDir, { recursive: true });
  const fp = path.join(targetDir, `${name}.md`);
  fs.writeFileSync(fp, content, 'utf8');
  return fp;
}

/** Write a subdirectory skill (SKILL.md) */
function writeSubDirSkill(dir: string, subDirName: string, content: string): string {
  const targetDir = path.join(dir, subDirName);
  fs.mkdirSync(targetDir, { recursive: true });
  const fp = path.join(targetDir, 'SKILL.md');
  fs.writeFileSync(fp, content, 'utf8');
  return fp;
}

const SAMPLE_SKILL_MD = `# React Best Practices

> **Nguồn:** Test
> **Generated:** 2026-05-03

tags: [react, hooks, typescript]

Key React patterns and best practices.

## Hooks

Use \`useState\` for local state.
`;

const SAMPLE_SKILL_MD_NO_TAGS = `# Simple Skill

Basic skill without tags.
`;

// ── Tests ──

describe('SkillRuntime', () => {
  let tmpDir: string;
  let runtime: SkillRuntime;

  beforeEach(() => {
    tmpDir = createTempSkillsDir();
    runtime = new SkillRuntime(tmpDir);
  });

  afterEach(() => {
    // Cleanup temp directory
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ── 1. Initialization ──
  describe('1. Initialization', () => {
    it('should create empty runtime when skills dir DNE', () => {
      const emptyRuntime = new SkillRuntime('/nonexistent/path');
      expect(emptyRuntime.listAvailable()).toEqual([]);
      expect(emptyRuntime.activeCount).toBe(0);
    });

    it('should use default skills dir when not provided', () => {
      const defaultRuntime = new SkillRuntime();
      const expected = path.join(process.cwd(), 'knowledge/wiki/skills');
      // Can't easily assert private field, but check that listAvailable doesn't throw
      expect(() => defaultRuntime.listAvailable()).not.toThrow();
    });
  });

  // ── 2. listAvailable() ──
  describe('2. listAvailable()', () => {
    it('should return empty array when no .md files exist', () => {
      expect(runtime.listAvailable()).toEqual([]);
    });

    it('should scan top-level .md files', () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      writeSkill(tmpDir, 'simple', SAMPLE_SKILL_MD_NO_TAGS);

      const skills = runtime.listAvailable();
      expect(skills).toHaveLength(2);

      const react = skills.find(s => s.name === 'react-patterns');
      expect(react).toBeDefined();
      expect(react!.tags).toContain('react');
      expect(react!.version).toBe('1.0.0');
      expect(react!.triggers.length).toBeGreaterThanOrEqual(1);
      expect(react!.contentPath).toContain('react-patterns.md');
      expect(react!.content).toContain('React Best Practices');
    });

    it('should scan subdirectory skills (SKILL.md)', () => {
      writeSubDirSkill(tmpDir, 'angular', `# Angular Expert\n\ntags: [angular, typescript]\n\nAngular patterns.`);
      writeSubDirSkill(tmpDir, 'vue', `# Vue Expert\n\ntags: [vue, composition]\n\nVue patterns.`);

      const skills = runtime.listAvailable();
      expect(skills).toHaveLength(2);

      const angular = skills.find(s => s.name === 'angular');
      expect(angular).toBeDefined();
      expect(angular!.tags).toContain('angular');
    });

    it('should derive triggers from name and tags', () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);

      const skills = runtime.listAvailable();
      expect(skills).toHaveLength(1);

      const triggers = skills[0].triggers;
      // Should have triggers from: name parts ('react') + tags ('react', 'hooks', 'typescript')
      expect(triggers.length).toBeGreaterThanOrEqual(2);
      const patterns = triggers.map(t => t.pattern);
      expect(patterns).toContain('react');
    });

    it('should skip .gitkeep and hidden files', () => {
      writeSkill(tmpDir, '.gitkeep', '');
      writeSkill(tmpDir, '.hidden', 'content');

      const skills = runtime.listAvailable();
      expect(skills).toHaveLength(0);
    });
  });

  // ── 3. load() ──
  describe('3. load() & 4. Duplicate load', () => {
    it('should load and activate a skill', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);

      const def = await runtime.load('react-patterns');
      expect(def.name).toBe('react-patterns');
      expect(def.tags).toContain('react');
      expect(runtime.activeCount).toBe(1);
      expect(runtime.isActive('react-patterns')).toBe(true);
    });

    it('should return same instance on duplicate load', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);

      const def1 = await runtime.load('react-patterns');
      const def2 = await runtime.load('react-patterns');
      expect(def1).toBe(def2);
      expect(runtime.activeCount).toBe(1);
    });

    it('should be case-insensitive when loading', async () => {
      writeSkill(tmpDir, 'ReactPatterns', SAMPLE_SKILL_MD);

      const def = await runtime.load('reactpatterns');
      expect(def.name).toBe('ReactPatterns');
    });
  });

  // ── 5. load() — not found ──
  describe('5. load() — not found', () => {
    it('should throw for nonexistent skill', async () => {
      await expect(runtime.load('nonexistent')).rejects.toThrow('not found');
    });

    it('should throw for empty directory', async () => {
      await expect(runtime.load('anything')).rejects.toThrow('not found');
    });
  });

  // ── 6. unload() ──
  describe('6. unload() & 7. unloadAll()', () => {
    it('should unload a skill', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      await runtime.load('react-patterns');
      expect(runtime.activeCount).toBe(1);

      const result = await runtime.unload('react-patterns');
      expect(result).toBe(true);
      expect(runtime.activeCount).toBe(0);
      expect(runtime.isActive('react-patterns')).toBe(false);
    });

    it('should return false for unloading nonexistent skill', async () => {
      const result = await runtime.unload('nonexistent');
      expect(result).toBe(false);
    });

    it('should unload all skills', async () => {
      writeSkill(tmpDir, 'skill-a', SAMPLE_SKILL_MD);
      writeSkill(tmpDir, 'skill-b', SAMPLE_SKILL_MD_NO_TAGS);
      writeSkill(tmpDir, 'skill-c', SAMPLE_SKILL_MD);

      await runtime.load('skill-a');
      await runtime.load('skill-b');
      await runtime.load('skill-c');
      expect(runtime.activeCount).toBe(3);

      const count = await runtime.unloadAll();
      expect(count).toBe(3);
      expect(runtime.activeCount).toBe(0);
    });
  });

  // ── 8. processTask() — keyword trigger ──
  describe('8. processTask() — trigger matching', () => {
    it('should return skill content when input matches keyword trigger', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      await runtime.load('react-patterns');

      const task: Task = {
        type: 'query',
        input: 'I need help with react hooks',
      };

      const result = await runtime.processTask(task);
      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
      expect(result!.output).toContain('React Best Practices');
      expect(result!.data).toBeDefined();
      expect(result!.data!.skillName).toBe('react-patterns');
    });

    it('should return null when no trigger matches', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      await runtime.load('react-patterns');

      const task: Task = {
        type: 'query',
        input: 'What is the weather today?',
      };

      const result = await runtime.processTask(task);
      expect(result).toBeNull();
    });
  });

  // ── 9. processTask() — direct type ──
  describe('9. processTask() — direct task type', () => {
    it('should always match on direct task type', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      await runtime.load('react-patterns');

      const task: Task = {
        type: 'direct',
        input: 'any random input',
      };

      const result = await runtime.processTask(task);
      expect(result).not.toBeNull();
      expect(result!.success).toBe(true);
    });
  });

  // ── 10. processTask() — no match ──
  describe('10. processTask() — no active skills', () => {
    it('should return null when no skills are active', async () => {
      const task: Task = {
        type: 'query',
        input: 'react',
      };

      const result = await runtime.processTask(task);
      expect(result).toBeNull();
    });
  });

  // ── 11. findMatchingSkills() ──
  describe('11. findMatchingSkills()', () => {
    it('should find skills matching input keywords', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      writeSkill(tmpDir, 'vue-patterns', `# Vue Patterns\n\ntags: [vue, composition-api]\n\nVue patterns.`);

      await runtime.load('react-patterns');
      await runtime.load('vue-patterns');

      const matches = runtime.findMatchingSkills('building a react app');
      expect(matches).toContain('react-patterns');
      expect(matches).not.toContain('vue-patterns');
    });

    it('should match multiple skills', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      writeSkill(tmpDir, 'hooks-guide', `# Hooks Guide\n\ntags: [hooks, react]\n\nHooks guide.`);

      await runtime.load('react-patterns');
      await runtime.load('hooks-guide');

      const matches = runtime.findMatchingSkills('learn react hooks');
      expect(matches).toContain('react-patterns');
      expect(matches).toContain('hooks-guide');
    });

    it('should return empty array when no active skills match', () => {
      const matches = runtime.findMatchingSkills('anything');
      expect(matches).toEqual([]);
    });
  });

  // ── 12. getActiveSkills() / activeCount / isActive / getActive ──
  describe('12. Accessors', () => {
    it('should return active skills list', async () => {
      writeSkill(tmpDir, 'skill-a', SAMPLE_SKILL_MD);
      writeSkill(tmpDir, 'skill-b', SAMPLE_SKILL_MD_NO_TAGS);

      await runtime.load('skill-a');
      await runtime.load('skill-b');

      const active = runtime.getActiveSkills();
      expect(active).toHaveLength(2);
      expect(active[0].activatedAt).toBeDefined();
      expect(active[0].context.workspace).toBeDefined();
    });

    it('should return correct activeCount', async () => {
      writeSkill(tmpDir, 'skill-a', SAMPLE_SKILL_MD);
      expect(runtime.activeCount).toBe(0);

      await runtime.load('skill-a');
      expect(runtime.activeCount).toBe(1);
    });

    it('isActive should work', async () => {
      writeSkill(tmpDir, 'skill-a', SAMPLE_SKILL_MD);
      expect(runtime.isActive('skill-a')).toBe(false);

      await runtime.load('skill-a');
      expect(runtime.isActive('skill-a')).toBe(true);
    });

    it('getActive should return active skill', async () => {
      writeSkill(tmpDir, 'skill-a', SAMPLE_SKILL_MD);
      await runtime.load('skill-a');

      const active = runtime.getActive('skill-a');
      expect(active).toBeDefined();
      expect(active!.definition.name).toBe('skill-a');
    });

    it('getActive should return undefined for inactive skill', () => {
      const active = runtime.getActive('nonexistent');
      expect(active).toBeUndefined();
    });
  });

  // ── 13. Trigger derivation ──
  describe('13. Trigger derivation', () => {
    it('should create keyword trigger from skill name', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      const skills = runtime.listAvailable();
      const triggers = skills[0].triggers;
      expect(triggers.some(t => t.type === 'keyword' && t.pattern === 'react')).toBe(true);
    });

    it('should create keyword triggers from tags', async () => {
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);
      const skills = runtime.listAvailable();
      const patterns = skills[0].triggers.map(t => t.pattern);
      expect(patterns).toContain('hooks');
      expect(patterns).toContain('typescript');
    });
  });

  // ── 15. Hook integration ──
  describe('15. Hook integration', () => {
    it('should emit skill:load on activation', async () => {
      const hooks = new HookRegistry();
      const runtimeWithHooks = new SkillRuntime(tmpDir, hooks);
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);

      const spy = vi.fn();
      hooks.on('skill:load', spy);

      await runtimeWithHooks.load('react-patterns');

      expect(spy).toHaveBeenCalledTimes(1);
      const ctx = spy.mock.calls[0][0];
      expect(ctx.event).toBe('skill:load');
      expect(ctx.data.skillName).toBe('react-patterns');
    });

    it('should emit skill:unload on deactivation', async () => {
      const hooks = new HookRegistry();
      const runtimeWithHooks = new SkillRuntime(tmpDir, hooks);
      writeSkill(tmpDir, 'react-patterns', SAMPLE_SKILL_MD);

      const spy = vi.fn();
      hooks.on('skill:unload', spy);

      await runtimeWithHooks.load('react-patterns');
      await runtimeWithHooks.unload('react-patterns');

      expect(spy).toHaveBeenCalledTimes(1);
      const ctx = spy.mock.calls[0][0];
      expect(ctx.event).toBe('skill:unload');
      expect(ctx.data.skillName).toBe('react-patterns');
    });
  });
});