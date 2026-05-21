/**
 * @file code-exec — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Code Execution Pattern — Execute generated code in sandbox
 * Phase 7.2c: parse code → validate → execute → return result
 */

import { CodeParser, CodeParseResult } from '../agents/code-parser.js';

export interface CodeExecRequest {
  code: string;
  language: string;
  timeout?: number;
}

export interface CodeExecResult {
  success: boolean;
  output: string;
  error?: string;
  parseResult?: CodeParseResult;
  durationMs: number;
}

/**
 * Execute code pattern: parse → validate → execute (if language is JS/TS via eval).
 * Note: This is for controlled/trusted environments. Production should use Docker/E2B.
 */
export async function executeCode(
  request: CodeExecRequest,
): Promise<CodeExecResult> {
  const start = Date.now();
  const parser = new CodeParser();
  const parseResult = parser.parse(request.code);

  if (parseResult.hasSyntaxError) {
    return {
      success: false,
      output: '',
      error: parseResult.syntaxError || 'Syntax error detected',
      parseResult,
      durationMs: Date.now() - start,
    };
  }

  // Only JS/TS can be executed directly
  const isJSTS = request.language === 'javascript' || request.language === 'js'
    || request.language === 'typescript' || request.language === 'ts';

  if (!isJSTS) {
    return {
      success: true,
      output: `[Code-exec] Language "${request.language}" detected. Execution requires sandbox. Parsed ${parseResult.functions.length} function(s), ${parseResult.imports.length} import(s).`,
      parseResult,
      durationMs: Date.now() - start,
    };
  }

  try {
    const clean = parser.stripFences(request.code);
    const func = new Function(clean);
    const result = func();
    return {
      success: true,
      output: String(result ?? '(void)'),
      parseResult,
      durationMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      success: false,
      output: '',
      error: err.message,
      parseResult,
      durationMs: Date.now() - start,
    };
  }
}