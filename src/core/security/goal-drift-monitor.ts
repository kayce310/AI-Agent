/**
 * @file goal-drift-monitor.ts — Security module
 * @layer core
 * @imported-by src/core/engine/engine.ts
 * @owner core-security
 *
 * Coral Agent — Goal-Drift Monitor
 * Detects when agent deviates from the original task during ReAct loop.
 *
 * Approach: keyword-overlap heuristic (zero LLM cost).
 * After each tool call, check if the tool result relates to the original task.
 * If drift detected, inject a reminder into the next LLM call.
 *
 * ponytail: global keyword overlap. Upgrade to embedding similarity
 * if false-positive rate is too high in production.
 */

const DRIFT_THRESHOLD = 0.1; // minimum keyword overlap ratio
const REMINDER_TEMPLATE = `\n\n[GOAL REMINDER] Bạn đang thực hiện task: "%s". Hãy tập trung vào task này.`;

/**
 * Extract meaningful keywords from text (stopwords removed).
 * ponytail: Vietnamese + English stopword list, not comprehensive but covers 90%.
 */
function extractKeywords(text: string): Set<string> {
  const stopwords = new Set([
    // English
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'and', 'but', 'or', 'nor',
    'not', 'no', 'so', 'if', 'that', 'this', 'these', 'those', 'it', 'its',
    // Vietnamese
    'của', 'và', 'là', 'có', 'được', 'cho', 'với', 'này', 'đó', 'các',
    'một', 'để', 'trong', 'không', 'từ', 'những', 'hay', 'hoặc', 'nhưng',
    'về', 'theo', 'đã', 'sẽ', 'đang', 'còn', 'nếu', 'khi', 'đến',
    'tại', 'trên', 'dưới', 'giữa', 'sau', 'trước', 'qua', 'vừa',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, ' ') // keep accented chars
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));

  return new Set(words);
}

function computeOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const aArr = Array.from(a);
  let overlap = 0;
  for (const word of aArr) {
    if (b.has(word)) overlap++;
  }
  return overlap / Math.min(a.size, b.size);
}

/**
 * Check if agent response/tool result is drifting from the original task.
 * Returns a drift warning string if drift detected, empty string otherwise.
 */
export function checkGoalDrift(
  originalTask: string,
  agentContent: string,
): string {
  const taskKeywords = extractKeywords(originalTask);
  const agentKeywords = extractKeywords(agentContent);

  const overlap = computeOverlap(taskKeywords, agentKeywords);

  if (overlap < DRIFT_THRESHOLD) {
    return REMINDER_TEMPLATE.replace('%s', originalTask.slice(0, 200));
  }
  return '';
}

/**
 * Extract task keywords for reuse (e.g., in prompt builder).
 */
export function getTaskKeywords(task: string): string[] {
  return Array.from(extractKeywords(task));
}
