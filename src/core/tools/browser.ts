/**
 * @file Browser Tools Plugin — Puppeteer-based web browsing
 * @layer core
 * @ponytail: singleton browser (launched once). No multi-tab, no incognito.
 *   Add when multi-session browsing needed.
 * @depends-on puppeteer
 */

import type { ToolPlugin, Tool } from './tool-registry.js';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as path from 'path';

// ── Singleton Browser ──

let _browser: Browser | null = null;
let _page: Page | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function getPage(): Promise<Page> {
  if (!_browser) {
    _browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  if (!_page) {
    _page = await _browser.newPage();
    await _page.setViewport({ width: 1280, height: 720 });
    // Capture console output
    _consoleLogs = [];
    _page.on('console', (msg: any) => {
      _consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    _page.on('pageerror', (err: any) => {
      _consoleLogs.push(`[error] ${err.message || String(err)}`);
    });
  }
  return _page;
}

// ── Snapshot Helpers ──

interface InteractiveEl {
  ref: string;
  tag: string;
  text: string;
  type: string;
  role: string;
  selector: string;
}

let _refCounter = 0;
let _currentRefs: InteractiveEl[] = [];
let _consoleLogs: string[] = [];

function cssSelector(el: Element): string {
  if (el.id) return el.tagName.toLowerCase() + '#' + CSS.escape(el.id);
  const cls = Array.from(el.classList).map(c => CSS.escape(c)).join('.');
  if (cls) return el.tagName.toLowerCase() + '.' + cls;
  return el.tagName.toLowerCase();
}

async function generateSnapshot(page: Page): Promise<string> {
  _refCounter = 0;
  // keep _currentRefs for backward compat but rebuild
  const newRefs: InteractiveEl[] = [];

  const rawEls: { tag: string; text: string; type: string; role: string; selector: string }[] = await page.evaluate(() => {
    const interactiveSelector = 'a, button, input, textarea, select, details, summary, [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="combobox"]';
    const nodes = document.querySelectorAll(interactiveSelector);
    const results: { tag: string; text: string; type: string; role: string; selector: string }[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i] as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const text = (el.innerText || (el as HTMLInputElement).value || '').trim().slice(0, 120);
      const type = (el as HTMLInputElement).type || '';
      const role = el.getAttribute('role') || '';
      let sel = tag;
      if (el.id) sel += '#' + CSS.escape(el.id);
      else {
        const cls = Array.from(el.classList).map((c: string) => CSS.escape(c)).join('.');
        if (cls) sel += '.' + cls;
      }
      results.push({ tag, text, type, role, selector: sel });
    }
    return results;
  });

  for (const el of rawEls) {
    _refCounter++;
    const ref = `@e${_refCounter}`;
    newRefs.push({ ...el, ref });
  }
  _currentRefs = newRefs;

  // Build snapshot text
  const lines: string[] = [];
  lines.push(`# ${await page.title()}`);
  lines.push(`URL: ${page.url()}`);
  lines.push('');

  const bodyText = await page.evaluate(() => {
    const body = document.body;
    if (!body) return '';
    const clone = body.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('script, style, nav, footer, header, iframe, svg, noscript').forEach(e => e.remove());
    return (clone.innerText || '').slice(0, 3000);
  });
  lines.push(bodyText);
  lines.push('');

  if (_currentRefs.length > 0) {
    lines.push('--- Interactive Elements ---');
    for (const el of _currentRefs) {
      const label = el.text ? ` "${el.text}"` : '';
      const extra = el.type ? ` type=${el.type}` : '';
      const roleStr = el.role ? ` role=${el.role}` : '';
      lines.push(`[${el.ref}] <${el.tag}>${label}${extra}${roleStr}`);
    }
  }

  return lines.join('\n');
}

function findSelector(ref: string): string | null {
  const el = _currentRefs.find(e => e.ref === ref);
  return el ? el.selector : null;
}

// ── Tools ──

const browserNavigate: Tool = {
  name: 'browser_navigate',
  description: 'Navigate to a URL. Initializes the browser session and loads the page. Returns an interactive snapshot with ref IDs for browser_click and browser_type.',
  schema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to navigate to (e.g. https://example.com)' }
    },
    required: ['url']
  },
  execute: async (args: Record<string, any>) => {
    const url = String(args.url || '');
    if (!url) return { error: 'URL is required' };
    try {
      const page = await getPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const snapshot = await generateSnapshot(page);
      return { url, title: await page.title(), snapshot };
    } catch (err: any) {
      return { error: `Navigation failed: ${err.message}` };
    }
  },
};

const browserSnapshot: Tool = {
  name: 'browser_snapshot',
  description: 'Get the current page content with interactive element ref IDs. Use after navigating or after any interaction to see the updated page state.',
  schema: { type: 'object', properties: {} },
  execute: async () => {
    try {
      const page = await getPage();
      const snapshot = await generateSnapshot(page);
      return { snapshot };
    } catch (err: any) {
      return { error: `Snapshot failed: ${err.message}` };
    }
  },
};

const browserClick: Tool = {
  name: 'browser_click',
  description: 'Click an interactive element by its ref ID (e.g. @e1, @e5). Ref IDs are shown in square brackets in the browser_snapshot output.',
  schema: {
    type: 'object',
    properties: {
      ref: { type: 'string', description: 'Element ref ID from snapshot (e.g. @e1, @e12)' }
    },
    required: ['ref']
  },
  execute: async (args: Record<string, any>) => {
    const ref = String(args.ref || '');
    if (!ref) return { error: 'ref is required (e.g. @e1)' };
    try {
      const sel = findSelector(ref);
      if (!sel) return { error: `Element ${ref} not found in current page state. Call browser_snapshot first.` };
      const page = await getPage();
      await page.click(sel);
      await sleep(500);
      const snapshot = await generateSnapshot(page);
      return { clicked: ref, snapshot };
    } catch (err: any) {
      return { error: `Click failed: ${err.message}` };
    }
  },
};

const browserType: Tool = {
  name: 'browser_type',
  description: 'Type text into an input field identified by its ref ID. Clears the field first, then types the new text.',
  schema: {
    type: 'object',
    properties: {
      ref: { type: 'string', description: 'Element ref ID from snapshot (e.g. @e3)' },
      text: { type: 'string', description: 'Text to type into the field' }
    },
    required: ['ref', 'text']
  },
  execute: async (args: Record<string, any>) => {
    const ref = String(args.ref || '');
    const text = String(args.text || '');
    if (!ref) return { error: 'ref is required' };
    try {
      const sel = findSelector(ref);
      if (!sel) return { error: `Element ${ref} not found in current page state. Call browser_snapshot first.` };
      const page = await getPage();
      await page.click(sel);
      await page.evaluate((s: string) => { (document.querySelector(s) as HTMLInputElement)!.value = ''; }, sel);
      await page.type(sel, text);
      const snapshot = await generateSnapshot(page);
      return { typed: ref, text, snapshot };
    } catch (err: any) {
      return { error: `Type failed: ${err.message}` };
    }
  },
};

const browserScroll: Tool = {
  name: 'browser_scroll',
  description: 'Scroll the page in a direction. Use to reveal more content below or above the viewport.',
  schema: {
    type: 'object',
    properties: {
      direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' }
    },
    required: ['direction']
  },
  execute: async (args: Record<string, any>) => {
    const direction = args.direction === 'up' ? -600 : 600;
    try {
      const page = await getPage();
      await page.evaluate((y: number) => window.scrollBy(0, y), direction);
      await sleep(300);
      const snapshot = await generateSnapshot(page);
      return { direction: args.direction, snapshot };
    } catch (err: any) {
      return { error: `Scroll failed: ${err.message}` };
    }
  },
};

const browserEvaluate: Tool = {
  name: 'browser_evaluate',
  description: 'Run JavaScript in the browser page context. Use to read DOM state, extract data, or trigger actions. Returns the serialized result.',
  schema: {
    type: 'object',
    properties: {
      expression: { type: 'string', description: 'JavaScript expression to evaluate (e.g. document.title, document.querySelectorAll("a").length)' }
    },
    required: ['expression']
  },
  execute: async (args: Record<string, any>) => {
    const expr = String(args.expression || '');
    if (!expr) return { error: 'expression is required' };
    try {
      const page = await getPage();
      const result = await page.evaluate((e: string) => {
        try { return { ok: true, value: eval(e) }; }
        catch (err: any) { return { ok: false, error: err.message }; }
      }, expr);
      return result;
    } catch (err: any) {
      return { error: `Evaluate failed: ${err.message}` };
    }
  },
};

const browserBack: Tool = {
  name: 'browser_back',
  description: 'Navigate back to the previous page in browser history.',
  schema: { type: 'object', properties: {} },
  execute: async () => {
    try {
      const page = await getPage();
      await page.goBack({ waitUntil: 'networkidle2', timeout: 15000 });
      const snapshot = await generateSnapshot(page);
      return { url: page.url(), snapshot };
    } catch (err: any) {
      return { error: `Go back failed: ${err.message}` };
    }
  },
};

const browserConsole: Tool = {
  name: 'browser_console',
  description: 'Get browser console output (console.log/warn/error messages) and JavaScript errors since the last navigation. Use to detect silent JS errors, failed API calls, and application warnings.',
  schema: {
    type: 'object',
    properties: {
      clear: { type: 'boolean', description: 'Clear the message buffer after reading', default: false }
    },
  },
  execute: async (args: Record<string, any>) => {
    const logs = _consoleLogs.slice();
    if (args.clear) _consoleLogs = [];
    return { entries: logs.slice(-100), count: logs.length };
  },
};

const browserGetImages: Tool = {
  name: 'browser_get_images',
  description: 'Get a list of all images on the current page with their URLs and alt text.',
  schema: { type: 'object', properties: {} },
  execute: async () => {
    try {
      const page = await getPage();
      const images = await page.evaluate(() => {
        return Array.from(document.images).map(img => ({
          src: img.src,
          alt: img.alt || '',
          width: img.naturalWidth,
          height: img.naturalHeight,
        })).slice(0, 100);
      });
      return { count: images.length, images };
    } catch (err: any) {
      return { error: `Get images failed: ${err.message}` };
    }
  },
};

// ── Vision Analyze — take screenshot or read image, return base64 + file path ──

const browserVision: Tool = {
  name: 'vision_analyze',
  description: 'Take a screenshot of the current browser page or analyze an image at a URL/file path. Returns image metadata + base64 data URL for LLM vision models. Saves to temp file for use as media attachment.',
  schema: {
    type: 'object',
    properties: {
      image_url: { type: 'string', description: 'Optional: URL or absolute file path to an image. If omitted, takes screenshot of current browser page.' },
      question: { type: 'string', description: 'Optional: what to look for or describe in the image' },
    },
  },
  execute: async (args: Record<string, any>) => {
    const imageUrl = String(args.image_url || '');
    const question = String(args.question || '');
    const tmpDir = path.join(process.cwd(), 'tmp');

    try {
      let buffer: Buffer;
      let format = 'png';
      let width = 0;
      let height = 0;

      if (imageUrl) {
        // External URL or file path
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
          if (!resp.ok) return { error: `Failed to fetch image: ${resp.status}` };
          buffer = Buffer.from(await resp.arrayBuffer());
          const ct = resp.headers.get('content-type') || '';
          if (ct.includes('jpeg') || ct.includes('jpg')) format = 'jpeg';
          else if (ct.includes('gif')) format = 'gif';
          else if (ct.includes('webp')) format = 'webp';
        } else {
          // Local file
          const fs = await import('fs/promises');
          buffer = await fs.readFile(imageUrl);
          const ext = imageUrl.split('.').pop()?.toLowerCase() || 'png';
          format = ext === 'jpg' ? 'jpeg' : ext;
        }
      } else {
        // Screenshot via Puppeteer
        const page = await getPage();
        const rawBuffer = await page.screenshot({ type: 'png', fullPage: false });
        buffer = Buffer.from(rawBuffer as any);
        const vp = page.viewport();
        width = vp?.width || 1280;
        height = vp?.height || 720;
      }

      // Save to temp file for media attachment
      const fs = await import('fs/promises');
      const timestamp = Date.now();
      const fileName = `vision_${timestamp}.${format}`;
      const filePath = path.join(tmpDir, fileName);
      await fs.mkdir(tmpDir, { recursive: true });
      await fs.writeFile(filePath, buffer);

      const base64 = buffer.toString('base64');
      const dataUrl = `data:image/${format};base64,${base64}`;

      return {
        file_path: filePath,
        format,
        width,
        height,
        bytes: buffer.length,
        image_data: dataUrl,
        question,
      };
    } catch (err: any) {
      return { error: `Vision capture failed: ${err.message}` };
    }
  },
};

// ── Plugin Export ──

const plugin: ToolPlugin = {
  name: 'browser',
  tools: [
    browserNavigate,
    browserSnapshot,
    browserClick,
    browserType,
    browserScroll,
    browserEvaluate,
    browserBack,
    browserConsole,
    browserGetImages,
    browserVision,
  ],
};

export default plugin;
