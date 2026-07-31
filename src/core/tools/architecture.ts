/**
 * @file architecture.ts — Architecture Rules Tool Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * LỚP 2 (Progressive / Just-in-time): cung cấp cho LLM cách load ĐẦY ĐỦ
 * ADR-000 khi task liên quan state (plan, session, task, item, evidence,
 * checkpoint) — thay vì luôn inject full ADR vào mọi request (tốn token).
 *
 * Tuân thủ ADR-000:
 * - KHÔNG tạo nguồn sự thật thứ hai cho PlanState — chỉ đọc file gốc
 *   `docs/adr/ADR-000-state-principles.md` (và CORAL.md nếu cần).
 * - KHÔNG cache "đã load" dưới dạng boolean set-once trên instance dùng chung.
 * - Chỉ dùng readFile qua secureRuntime (zero-trust path safety).
 */

import * as path from 'path';
import type { ToolPlugin } from './tool-registry.js';
import { secureRuntime, WORKSPACE_ROOT } from './tool-gateway.js';

const ADR_000_PATH = path.join('docs/adr', 'ADR-000-state-principles.md');
const CORAL_MD_PATH = 'CORAL.md';

/**
 * Đọc nội dung file. Trả về null nếu không đọc được (không throw).
 */
function tryRead(relPath: string): string | null {
  try {
    const resolved = path.resolve(WORKSPACE_ROOT, relPath);
    if (!secureRuntime.safeExists(resolved)) return null;
    return secureRuntime.safeReadFile(resolved);
  } catch {
    return null;
  }
}

const plugin: ToolPlugin = {
  name: 'architecture',
  tools: [
    {
      name: 'load_architecture_rules',
      description:
        'Tải ĐẦY ĐỦ ADR-000 (state principles) và con trỏ tới CORAL.md. ' +
        'BẮT BUỘC gọi tool này TRƯỚC KHI sửa bất kỳ state nào: plan, session, task, item, evidence, checkpoint. ' +
        'Trả về nội dung gốc từ docs/adr/ADR-000-state-principles.md.',
      schema: {
        type: 'object',
        properties: {
          scope: {
            type: 'string',
            enum: ['full', 'state', 'coralmd'],
            description:
              "'full' = ADR-000 + pointer CORAL.md (mặc định). 'state' = chỉ ADR-000. 'coralmd' = chỉ pointer CORAL.md.",
          },
        },
        required: [],
      },
      execute(args: Record<string, any>) {
        const scope: string = args.scope ?? 'full';
        const parts: string[] = [];

        if (scope === 'full' || scope === 'state') {
          const adr = tryRead(ADR_000_PATH);
          if (adr) {
            parts.push(`# ADR-000 (nguồn gốc: ${ADR_000_PATH})\n\n${adr}`);
          } else {
            parts.push(`⚠️ Không đọc được ${ADR_000_PATH} — hãy thử read_file với đường dẫn tương đối.`);
          }
        }

        if (scope === 'full' || scope === 'coralmd') {
          parts.push(
            `# Con trỏ CORAL.md\nKiến trúc tổng thể: ${CORAL_MD_PATH} (root). ` +
              `Nếu cần chi tiết luồng request, module map, known issues — dùng read_file đọc file này.\n`
          );
        }

        return { content: parts.join('\n\n---\n\n') };
      },
    },
  ],
};

export default plugin;
