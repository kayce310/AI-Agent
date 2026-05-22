/**
 * @file code-parser — Agent module
 * @layer core
 * @depends-on src/core/types.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-agents
 */

/**
 * CodeParser — Parse & validate LLM-generated code
 * Phase 5.2a: extract functions, imports, detect syntax errors
 */

export interface ParsedFunction {
  name: string;
  params: string[];
  body: string;
  async: boolean;
  exported: boolean;
}

export interface ParsedImport {
  source: string;
  specifiers: string[];
  type: 'named' | 'default' | 'namespace';
}

export interface CodeParseResult {
  language: string | null;
  functions: ParsedFunction[];
  imports: ParsedImport[];
  hasSyntaxError: boolean;
  syntaxError?: string;
  raw: string;
}

export class CodeParser {
  /**
   * Detect language from code block markers or extension hint.
   */
  detectLanguage(code: string): string | null {
    const match = code.match(/^```(\w+)/m);
    return match ? match[1] : null;
  }

  /**
   * Strip markdown code fences.
   */
  stripFences(code: string): string {
    return code.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();
  }

  /**
   * Parse JavaScript/TypeScript functions from code.
   */
  parseFunctions(code: string): ParsedFunction[] {
    const functions: ParsedFunction[] = [];
    const lang = this.detectLanguage(code) || 'unknown';
    const clean = this.stripFences(code);

    if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
      // Match async/regular function declarations and arrow functions
      const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*?)\n\}/g;
      let m: RegExpExecArray | null;
      while ((m = funcRegex.exec(clean)) !== null) {
        functions.push({
          name: m[1],
          params: m[2].split(',').map(p => p.trim()).filter(Boolean),
          body: m[3].trim(),
          async: m[0].includes('async'),
          exported: m[0].startsWith('export'),
        });
      }

      // Match arrow functions assigned to const/let
      const arrowRegex = /(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?\(?([^)]*)\)?\s*=>\s*\{?([\s\S]*?)\n\};?/g;
      while ((m = arrowRegex.exec(clean)) !== null) {
        functions.push({
          name: m[1],
          params: m[2].split(',').map(p => p.trim()).filter(Boolean),
          body: m[3].trim(),
          async: m[0].includes('async'),
          exported: m[0].startsWith('export'),
        });
      }
    }

    return functions;
  }

  /**
   * Parse imports from JavaScript/TypeScript code.
   */
  parseImports(code: string): ParsedImport[] {
    const imports: ParsedImport[] = [];
    const clean = this.stripFences(code);
    const lang = this.detectLanguage(code) || 'unknown';

    if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
      // Named imports: import { x, y } from 'z'
      const namedRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = namedRegex.exec(clean)) !== null) {
        imports.push({
          source: m[2],
          specifiers: m[1].split(',').map(s => s.trim()).filter(Boolean),
          type: 'named',
        });
      }

      // Default imports: import x from 'y'
      const defaultRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
      while ((m = defaultRegex.exec(clean)) !== null) {
        imports.push({
          source: m[2],
          specifiers: [m[1]],
          type: 'default',
        });
      }

      // Namespace imports: import * as x from 'y'
      const nsRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
      while ((m = nsRegex.exec(clean)) !== null) {
        imports.push({
          source: m[2],
          specifiers: [m[1]],
          type: 'namespace',
        });
      }
    }

    return imports;
  }

  /**
   * Basic syntax validation — check for common issues.
   */
  checkSyntax(code: string): { hasError: boolean; error?: string } {
    const clean = this.stripFences(code);
    const lang = this.detectLanguage(code) || 'unknown';

    // JavaScript: check unmatched braces
    if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
      let depth = 0;
      for (let i = 0; i < clean.length; i++) {
        if (clean[i] === '{') depth++;
        if (clean[i] === '}') depth--;
        if (depth < 0) {
          return { hasError: true, error: `Unmatched closing brace at position ${i}` };
        }
      }
      if (depth > 0) {
        return { hasError: true, error: `${depth} unclosed brace(s)` };
      }
    }

    return { hasError: false };
  }

  /**
   * Full parse pipeline.
   */
  parse(code: string): CodeParseResult {
    const language = this.detectLanguage(code);
    const syntaxCheck = this.checkSyntax(code);

    return {
      language,
      functions: this.parseFunctions(code),
      imports: this.parseImports(code),
      hasSyntaxError: syntaxCheck.hasError,
      syntaxError: syntaxCheck.error,
      raw: code,
    };
  }
}

export default CodeParser;