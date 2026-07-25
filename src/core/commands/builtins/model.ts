/**
 * @file Built-in Model Command
 * @layer core
 *
 * Cross-platform model selection command.
 * - Returns list of available models as text (for CLI/Discord/etc.)
 * - Telegram adapter can enhance this with InlineKeyboard UI
 * - Model selection is stored per-user via the checkpoint
 */

import type { Command, CommandContext, CommandResult } from '../types.js';
import { ProviderRegistry } from '../../llm/provider-registry.js';

/**
 * Get model specs from ProviderRegistry.
 */
function getModelSpecs(): Array<{ id: string; label?: string; tier?: number; maxTokens?: number }> {
  const registry = new ProviderRegistry();
  registry.loadFromConfig();
  return registry.getModelSpecs();
}

/**
 * Parse model ID to get a short label.
 */
function shortLabel(modelId: string): string {
  const parts = modelId.split('/');
  return parts[parts.length - 1] || modelId;
}

/**
 * Group model specs by provider.
 */
function groupByProvider(
  specs: Array<{ id: string; label?: string; tier?: number; maxTokens?: number }>
): Map<string, Array<{ id: string; label?: string; tier?: number; maxTokens?: number }>> {
  const map = new Map<string, Array<{ id: string; label?: string; tier?: number; maxTokens?: number }>>();
  for (const spec of specs) {
    const parts = spec.id.split('/');
    const provider = parts.length >= 2 ? parts[0] : 'default';
    if (!map.has(provider)) map.set(provider, []);
    map.get(provider)!.push(spec);
  }
  return map;
}

export const modelCommand: Command = {
  name: 'model',
  description: 'Xem và chọn model AI — /model <tên model> để chọn, /model để xem danh sách',
  category: 'general',
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const specs = getModelSpecs();

    // ── /model <name> — set model ──
    if (ctx.args.length > 0) {
      const modelName = ctx.args[0];
      // Validate model exists
      const match = specs.find(s => s.id === modelName);
      if (!match) {
        return {
          text: `❌ Model \`${modelName}\` không tồn tại. Dùng \`/model\` để xem danh sách.`,
        };
      }
      // Model selection is stored by platform adapter (e.g., userSessions map)
      // Core just validates and returns confirmation
      return {
        text: `✅ Đã chọn model: \`${modelName}\`\n\nModel này sẽ được dùng cho tin nhắn tiếp theo.`,
      };
    }

    // ── /model — list models ──
    if (specs.length === 0) {
      return { text: '❌ Không có model nào khả dụng. Kiểm tra file cấu hình provider.' };
    }

    const grouped = groupByProvider(specs);
    const lines: string[] = [
      '🧠 **Model AI khả dụng**',
      '',
    ];

    for (const [provider, models] of grouped) {
      lines.push(`*${provider}:*`);
      for (const m of models) {
        const label = m.label || shortLabel(m.id);
        const tier = m.tier ? ` (Tier ${m.tier})` : '';
        lines.push(`• \`${m.id}\` — ${label}${tier}`);
      }
      lines.push('');
    }

    lines.push('Dùng \`/model <tên>\` để chọn model.');

    return { text: lines.join('\n') };
  },
};
