/**
 * @file routing — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Routing Pattern — Route requests to appropriate handlers based on intent
 * Phase 7.2c: intent classification → handler dispatch
 */

export interface Route {
  name: string;
  match: (input: string) => boolean;
  handler: (input: string) => Promise<string>;
  description: string;
}

export interface RoutingResult {
  matchedRoute: string | null;
  output: string;
  confidence: number;
}

export async function executeRouting(
  input: string,
  routes: Route[],
): Promise<RoutingResult> {
  // Score each route by how well input matches
  const scored = routes.map(route => ({
    route,
    matches: route.match(input),
  }));

  const matched = scored.find(s => s.matches);
  if (!matched) {
    return {
      matchedRoute: null,
      output: `No matching route found for: ${input.substring(0, 100)}`,
      confidence: 0,
    };
  }

  const output = await matched.route.handler(input);
  return {
    matchedRoute: matched.route.name,
    output,
    confidence: 1,
  };
}

/**
 * Create a keyword-based route matcher.
 */
export function keywordMatch(keywords: string[]): (input: string) => boolean {
  const lower = keywords.map(k => k.toLowerCase());
  return (input: string): boolean => {
    const inputLower = input.toLowerCase();
    return lower.some(k => inputLower.includes(k));
  };
}

/**
 * Create a regex-based route matcher.
 */
export function regexMatch(pattern: RegExp): (input: string) => boolean {
  return (input: string): boolean => pattern.test(input);
}