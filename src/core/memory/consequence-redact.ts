/**
 * @file Consequence Memory — Redaction helper
 * @layer core
 * @owner core-memory
 *
 * Redact nhạy cảm trước khi lưu argsDigest / context vào ConsequenceRecord.
 * ADR-003 §4.3: strip token, api key, password, Authorization header, private paths.
 *
 * Không lưu secret/token/raw PII không cần thiết.
 */

// Các key nhạy cảm — nếu xuất hiện trong args, thay value bằng [REDACTED]
const SENSITIVE_KEYS = [
  'password',
  'passwd',
  'token',
  'api_key',
  'apikey',
  'apiKey',
  'secret',
  'credential',
  'authorization',
  'auth',
  'cookie',
  'session_token',
  'access_token',
  'refresh_token',
  'private_key',
  'client_secret',
  'bearer',
];

// Các pattern nhạy cảm trong chuỗi (Authorization header, bearer token, key=...)
const SENSITIVE_PATTERNS: RegExp[] = [
  // Authorization: Bearer <token> — toàn bộ sau dấu ':' bị redact
  /(authorization\s*[:=]\s*)([^\s,;]+)(?:\s+[^\s,;]+)?/gi,
  // Bearer <token> đứng độc lập
  /(bearer\s+)[a-zA-Z0-9._\-]+/gi,
  // key=value với key nhạy cảm
  /(api[_-]?key\s*[:=]\s*)([^\s,;]+)/gi,
  /(password\s*[:=]\s*)([^\s,;]+)/gi,
  /(secret\s*[:=]\s*)([^\s,;]+)/gi,
  /(token\s*[:=]\s*)([^\s,;]+)/gi,
];

const REDACTED = '[REDACTED]';

/**
 * Check if a key is sensitive (case-insensitive substring match on known names).
 */
function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((k) => lower.includes(k.toLowerCase()));
}

/**
 * Redact sensitive values inside a string (headers, tokens, key=value pairs).
 */
export function redactString(input: string): string {
  let out = input;
  for (const pattern of SENSITIVE_PATTERNS) {
    out = out.replace(pattern, (_match, prefix?: string) => {
      return prefix ? `${prefix}${REDACTED}` : REDACTED;
    });
  }
  return out;
}

/**
 * Redact a value recursively. Strings are scanned for sensitive patterns;
 * object keys matching sensitive names are replaced with [REDACTED].
 * Non-string primitives pass through (numbers/booleans are not secrets).
 */
export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[DEPTH_LIMIT]';

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((v) => redactValue(v, depth + 1));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (isSensitiveKey(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = redactValue(val, depth + 1);
      }
    }
    return out;
  }

  return value;
}

/**
 * Build a short argsDigest from tool args — chỉ giữ shape/key quan trọng,
 * không giữ value nhạy cảm. Dùng cho ConsequenceRecord.action.argsDigest.
 */
export function buildArgsDigest(args: Record<string, unknown> | undefined): string | undefined {
  if (!args || typeof args !== 'object') return undefined;
  const keys = Object.keys(args);
  if (keys.length === 0) return undefined;

  // Chỉ giữ key names (shape), không value — tránh lưu secret/PII.
  const redactedKeys = keys.map((k) => (isSensitiveKey(k) ? `${k}=[REDACTED]` : k));
  return redactedKeys.join(',');
}