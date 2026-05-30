/**
 * @file content-extractor — Tool plugin
 * @layer core
 * @depends-on
 * @owner core-tools
 */

/**
 * Kato Agent — Content Extractor
 *
 * Extracts plain text, title, and links from HTML content.
 * Uses regex-based stripping (no cheerio dependency) to avoid bloat.
 * Designed to wrap fetch_url output to reduce token usage.
 *
 * Security: Rejects binary content types to prevent token overflow from
 * non-text responses.
 */

export interface ExtractedContent {
  title: string;
  text: string;    // plain text, max 3000 chars
  links: string[]; // max 10 links
  wordCount: number;
}

/** Binary content patterns that should not be extracted */
const BINARY_CONTENT_PATTERNS = [
  /^image\//,
  /^application\/octet/,
  /^application\/pdf/,
  /^application\/zip/,
  /^application\/x-(zip|gzip|bzip|tar)/,
  /^audio\//,
  /^video\//,
];

/** URL extensions that indicate binary content */
const BINARY_URL_EXTENSIONS = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|pdf|zip|gz|tar|bz2|7z|rar|bin|exe|dll|dmg|iso|mp3|mp4|avi|mov|mkv)$/i;

/** Maximum length for extracted text before truncation */
const MAX_EXTRACTED_CHARS = 5000;

/**
 * Check if content should be rejected as binary.
 * Returns true if binary heuristics match.
 */
export function isBinaryContent(contentType: string, url: string): boolean {
  const ct = (contentType || '').toLowerCase();
  for (const pattern of BINARY_CONTENT_PATTERNS) {
    if (pattern.test(ct)) return true;
  }
  if (BINARY_URL_EXTENSIONS.test(url)) return true;
  return false;
}

/**
 * Strip HTML tags and extract meaningful text content.
 * Limit output to maxChars (default 3000) for token efficiency.
 */
function stripHtml(html: string, maxChars: number = 3000): { text: string; wordCount: number } {
  // Remove script and style blocks
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode common entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&/g, '&');
  cleaned = cleaned.replace(/</g, '<');
  cleaned = cleaned.replace(/>/g, '>');
  cleaned = cleaned.replace(/"/g, '"');
  cleaned = cleaned.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));

  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Count words (non-whitespace sequences)
  const wordCount = cleaned ? cleaned.split(/\s+/).length : 0;

  // Truncate to MAX_EXTRACTED_CHARS with warning
  if (cleaned.length > maxChars) {
    console.warn(`⚠️ ContentExtractor: extracted text (${cleaned.length} chars) exceeds limit ${maxChars}, truncating`);
    cleaned = cleaned.substring(0, maxChars) + '...';
  }

  return { text: cleaned, wordCount };
}

/**
 * Extract <title> from HTML.
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (match && match[1]) {
    return match[1].trim().substring(0, 200);
  }
  return '';
}

/**
 * Extract <a href> links from HTML, deduplicated, max 10.
 */
function extractLinks(html: string, baseUrl: string, maxLinks: number = 10): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const regex = /<a\s[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = regex.exec(html)) !== null && links.length < maxLinks) {
    let href = match[1].trim();

    // Resolve relative URLs
    if (href.startsWith('/')) {
      try {
        const base = new URL(baseUrl);
        href = `${base.protocol}//${base.host}${href}`;
      } catch {
        continue;
      }
    } else if (href.startsWith('#')) {
      continue; // skip anchors
    } else if (!href.startsWith('http://') && !href.startsWith('https://')) {
      continue; // skip non-http links
    }

    if (!seen.has(href)) {
      seen.add(href);
      links.push(href);
    }
  }

  return links;
}

/**
 * Extract structured content from raw HTML.
 * Designed to be called by fetch_url to wrap raw HTML into a compact format.
 *
 * @param html - Raw HTML string
 * @param url  - Source URL (for resolving relative links)
 * @param contentType - Optional Content-Type header for binary rejection
 * @returns ExtractedContent with title, plain text (max 3000 chars), links (max 10), wordCount
 */
export function extractContent(html: string, url: string, contentType?: string): ExtractedContent {
  // Reject binary content early
  if (contentType && isBinaryContent(contentType, url)) {
    console.warn(`⚠️ ContentExtractor: skipping binary content (type: ${contentType}, url: ${url})`);
    return { title: '', text: '[Binary content — không thể trích xuất]', links: [], wordCount: 0 };
  }

  const title = extractTitle(html);
  const { text, wordCount } = stripHtml(html, MAX_EXTRACTED_CHARS);
  const links = extractLinks(html, url, 10);

  // Log if text exceeds threshold for monitoring
  if (wordCount > 1000) {
    console.log(`📏 ContentExtractor: ${url} → ${text.length} chars, ${wordCount} words, ${links.length} links`);
  }

  return { title, text, links, wordCount };
}
