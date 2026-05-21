/**
 * @file formula-extractor — Peripheral adapter
 * @layer modules
 * @depends-on src/core/index.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner modules
 */

/**
 * Formula Extractor — Phase 2: Wiki & Knowledge Integration
 * 
 * Trích xuất công thức từ văn bản PDF/DOCX sang định dạng LaTeX.
 * Hỗ trợ phát hiện pattern LaTeX, OMML, và inline equations.
 */
import fs from 'fs';
import path from 'path';

/**
 * Các pattern công thức thường gặp trong văn bản
 */
const FORMULA_PATTERNS = [
  // LaTeX display math: $$...$$
  { regex: /\$\$([\s\S]*?)\$\$/g, type: 'display' },
  // LaTeX inline math: \(...\)
  { regex: /\\\(([\s\S]*?)\\\)/g, type: 'inline' },
  // LaTeX inline: $...$
  { regex: /\$([^\$]*?)\$/g, type: 'inline' },
  // Equation numbering: (1), (2.3), etc.
  { regex: /^(?:Equation|Phương trình|Pt\.?)\s*\(?(\d+(?:\.\d+)?)\)?\s*[:\.]/gim, type: 'label' },
  // Common math symbols indicating formulas
  { regex: /[∑∫∏∂∇∆√∞≈≠≤≥±×÷⊕⊗∈∉⊂⊃∩∪∀∃⇒⇔→↔]/g, type: 'symbol' },
  // Fraction patterns a/b with surrounding math context
  { regex: /\\frac\{[^}]+\}\{[^}]+\}/g, type: 'display' },
  // Greek letters
  { regex: /\\(?:alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/g, type: 'inline' },
  // Subscript/superscript
  { regex: /[_^]\{[^}]+\}/g, type: 'inline' },
  // Matrix
  { regex: /\\begin\{[vp]?matrix\}[\s\S]*?\\end\{[vp]?matrix\}/g, type: 'display' },
];

/**
 * Phát hiện và trích xuất công thức từ text
 * 
 * Input: raw text từ PDF/DOCX
 * Output: mảng các công thức tìm thấy
 */
export function extractFormulas(text: string): Array<{
  content: string;
  type: 'display' | 'inline' | 'symbol' | 'label';
  lineNumber: number;
  normalized: string;
}> {
  const lines = text.split('\n');
  const formulas: Array<{
    content: string;
    type: 'display' | 'inline' | 'symbol' | 'label';
    lineNumber: number;
    normalized: string;
  }> = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const pattern of FORMULA_PATTERNS) {
      // Reset lastIndex
      pattern.regex.lastIndex = 0;
      let match;

      while ((match = pattern.regex.exec(line)) !== null) {
        const content = match[0].trim();
        if (!content || seen.has(content)) continue;
        seen.add(content);

        // Normalize: chuẩn hóa LaTeX
        let normalized = content;
        if (pattern.type === 'display') {
          // Đảm bảo $$ bao bọc
          if (!normalized.startsWith('$$')) {
            normalized = `$$${normalized}$$`;
          }
        } else if (pattern.type === 'inline') {
          // Chuyển $ hoặc \( \) thành \(...\)
          if (normalized.startsWith('$') && !normalized.startsWith('$$')) {
            normalized = `\\(${normalized.slice(1, -1)}\\)`;
          }
        }

        formulas.push({
          content,
          type: pattern.type as 'display' | 'inline' | 'symbol' | 'label',
          lineNumber: i + 1,
          normalized,
        });
      }
    }
  }

  // Deduplicate và sắp xếp: display trước, inline sau
  return formulas.sort((a, b) => {
    if (a.type !== b.type) {
      const order = ['display', 'inline', 'symbol', 'label'];
      return order.indexOf(a.type) - order.indexOf(b.type);
    }
    return a.lineNumber - b.lineNumber;
  });
}

/**
 * Trích xuất công thức từ file markdown đã convert
 */
export function extractFormulasFromMd(mdPath: string): Array<{
  content: string;
  type: 'display' | 'inline' | 'symbol' | 'label';
  lineNumber: number;
  normalized: string;
}> {
  if (!fs.existsSync(mdPath)) {
    return [];
  }
  const content = fs.readFileSync(mdPath, 'utf8');
  return extractFormulas(content);
}

/**
 * Format formulas thành markdown section
 */
export function formatFormulasToMd(formulas: Array<{
  content: string;
  type: string;
  lineNumber: number;
  normalized: string;
}>): string {
  if (formulas.length === 0) {
    return '*Không tìm thấy công thức nào.*\n';
  }

  const sections: string[] = ['## 📐 Công thức\n'];

  const display = formulas.filter(f => f.type === 'display');
  const inline = formulas.filter(f => f.type === 'inline');
  const symbols = formulas.filter(f => f.type === 'symbol');
  const labels = formulas.filter(f => f.type === 'label');

  if (display.length > 0) {
    sections.push('### Display Math\n');
    display.forEach((f, i) => {
      sections.push(`${i + 1}. Line ${f.lineNumber}:\n`);
      sections.push(`\`\`\`latex\n${f.normalized}\n\`\`\`\n`);
    });
  }

  if (inline.length > 0) {
    sections.push('### Inline Math\n');
    inline.forEach((f, i) => {
      sections.push(`- Line ${f.lineNumber}: \`${f.normalized}\`\n`);
    });
    sections.push('\n');
  }

  if (symbols.length > 0) {
    sections.push('### Math Symbols\n');
    const unique = [...new Set(symbols.map(s => s.content))];
    sections.push(unique.map(s => `- \`${s}\``).join('\n') + '\n\n');
  }

  if (labels.length > 0) {
    sections.push('### Equation Labels\n');
    const unique = [...new Set(labels.map(l => l.content))];
    sections.push(unique.map(s => `- ${s}`).join('\n') + '\n\n');
  }

  return sections.join('');
}

export default {
  extractFormulas,
  extractFormulasFromMd,
  formatFormulasToMd,
};