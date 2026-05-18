/**
 * CodeParser — Phase 5.2a Test Suite
 *
 * Covers:
 * - Language detection from fence markers
 * - Function extraction (regular, async, arrow, exported)
 * - Import extraction (named, default, namespace)
 * - Syntax validation (brace balance)
 * - Full parse pipeline
 * - Edge cases (no code, empty code, non-JS)
 */

import { describe, it, expect } from 'vitest';

describe('CodeParser', () => {
  it('detects language from markdown fences', async () => {
    const { CodeParser } = await import('../src/core/agents/code-parser.js');
    const parser = new CodeParser();

    expect(parser.detectLanguage('```typescript\nconst x = 1;\n```')).toBe('typescript');
    expect(parser.detectLanguage('```js\nlet y = 2;\n```')).toBe('js');
    expect(parser.detectLanguage('```python\nx = 1\n```')).toBe('python');
    expect(parser.detectLanguage('no fence here')).toBeNull();
  });

  it('strips markdown fences', async () => {
    const { CodeParser } = await import('../src/core/agents/code-parser.js');
    const parser = new CodeParser();

    const stripped = parser.stripFences('```typescript\nconst x = 1;\n```');
    expect(stripped).toBe('const x = 1;');
    expect(stripped).not.toContain('```');
  });

  it('strips fences without language tag', async () => {
    const { CodeParser } = await import('../src/core/agents/code-parser.js');
    const parser = new CodeParser();

    const stripped = parser.stripFences('```\nconst x = 1;\n```');
    expect(stripped).toBe('const x = 1;');
  });

  it('returns empty string for empty fences', async () => {
    const { CodeParser } = await import('../src/core/agents/code-parser.js');
    const parser = new CodeParser();

    expect(parser.stripFences('')).toBe('');
    expect(parser.stripFences('```\n```')).toBe('');
  });

  describe('parseFunctions', () => {
    it('extracts regular function declarations', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const funcs = parser.parseFunctions('```ts\nfunction hello(a: string, b: number) {\n  return a;\n}\n```');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('hello');
      expect(funcs[0].params).toEqual(['a: string', 'b: number']);
      expect(funcs[0].async).toBe(false);
      expect(funcs[0].exported).toBe(false);
    });

    it('extracts async functions', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const funcs = parser.parseFunctions('```ts\nasync function fetchData(url: string) {\n  const res = await fetch(url);\n  return res.json();\n}\n```');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('fetchData');
      expect(funcs[0].async).toBe(true);
    });

    it('extracts exported functions', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const funcs = parser.parseFunctions('```ts\nexport function add(a: number, b: number) {\n  return a + b;\n}\n```');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('add');
      expect(funcs[0].exported).toBe(true);
    });

    it('extracts arrow functions assigned to const', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const funcs = parser.parseFunctions('```ts\nconst multiply = (a: number, b: number) => {\n  return a * b;\n};\n```');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('multiply');
    });

    it('handles non-JS code gracefully', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const funcs = parser.parseFunctions('```python\ndef hello():\n    print("hi")\n```');
      expect(funcs).toHaveLength(0);
    });

    it('handles code with no functions', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const funcs = parser.parseFunctions('```ts\nconst x = 1;\nconst y = 2;\n```');
      expect(funcs).toHaveLength(0);
    });
  });

  describe('parseImports', () => {
    it('extracts named imports', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const imports = parser.parseImports('```ts\nimport { useState, useEffect } from "react";\n```');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('react');
      expect(imports[0].specifiers).toEqual(['useState', 'useEffect']);
      expect(imports[0].type).toBe('named');
    });

    it('extracts default imports', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const imports = parser.parseImports('```ts\nimport React from "react";\n```');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('react');
      expect(imports[0].specifiers).toEqual(['React']);
      expect(imports[0].type).toBe('default');
    });

    it('extracts namespace imports', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const imports = parser.parseImports('```ts\nimport * as fs from "fs";\n```');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('fs');
      expect(imports[0].specifiers).toEqual(['fs']);
      expect(imports[0].type).toBe('namespace');
    });

    it('extracts multiple import types', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const imports = parser.parseImports('```ts\nimport React from "react";\nimport { useState } from "react";\nimport * as lodash from "lodash";\n```');
      expect(imports).toHaveLength(3);
    });

    it('handles code with no imports', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const imports = parser.parseImports('```ts\nconst x = 5;\n```');
      expect(imports).toHaveLength(0);
    });
  });

  describe('checkSyntax', () => {
    it('passes valid JS code', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const result = parser.checkSyntax('```ts\nfunction foo() { return 1; }\n```');
      expect(result.hasError).toBe(false);
    });

    it('detects unmatched closing brace', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const result = parser.checkSyntax('```ts\nfunction foo() { return 1; } }\n```');
      expect(result.hasError).toBe(true);
      expect(result.error).toContain('Unmatched closing brace');
    });

    it('detects unclosed brace', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const result = parser.checkSyntax('```ts\nfunction foo() {\n  return 1;\n```');
      expect(result.hasError).toBe(true);
      expect(result.error).toContain('unclosed brace');
    });

    it('skips syntax check for non-JS', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const result = parser.checkSyntax('```python\nprint("hello")\n```');
      expect(result.hasError).toBe(false);
    });
  });

  describe('parse (full pipeline)', () => {
    it('returns complete parse result', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const code = '```ts\nimport { readFile } from "fs";\n\nfunction process(path: string) {\n  return readFile(path);\n}\n```';
      const result = parser.parse(code);

      expect(result.language).toBe('ts');
      expect(result.imports).toHaveLength(1);
      expect(result.functions).toHaveLength(1);
      expect(result.hasSyntaxError).toBe(false);
      expect(result.raw).toBe(code);
    });

    it('reports syntax errors in pipeline', async () => {
      const { CodeParser } = await import('../src/core/agents/code-parser.js');
      const parser = new CodeParser();

      const result = parser.parse('```ts\nfunction broken() { \n```');
      expect(result.hasSyntaxError).toBe(true);
    });
  });
});