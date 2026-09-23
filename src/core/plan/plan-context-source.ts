import { randomUUID } from 'crypto';
import { ContextSource, ContextCandidate, RequestContext, SourceProvenance, DEFAULT_BUDGET_CLAIMS } from '../context-source.js';
import { Logger } from '../logger.js';
import type { CheckpointStore } from '../checkpoint.js';
import { derivePlanState, isGuardActive } from '../plan/plan-state.js';
import { ABSOLUTE_SAFETY_CEILING } from '../plan/types.js';

const log = new Logger({ module: 'PlanContextSource' });

export class PlanContextSource implements ContextSource {
  id = 'plan';
  provenance: SourceProvenance = { origin: 'system', identifier: 'plan-context' };
  budgetClaim = DEFAULT_BUDGET_CLAIMS.plan;

  constructor(private checkpointStore: CheckpointStore) {}

  isActive(sessionId: string, _taskId: string): boolean {
    return true; // Plan context is always active if plan exists
  }

  async getCandidates(request: RequestContext): Promise<ContextCandidate[]> {
    const { sessionId } = request;
    const plan = this.checkpointStore.getPlan(sessionId);

    if (!plan) {
      return [this.buildNoPlanCandidate()];
    }

    // Resume paused_limit automatically
    if (plan.status === 'paused_limit') {
      plan.status = 'running';
      this.checkpointStore.setPlan(sessionId, plan);
      log.info(`[PlanContextSource] Auto-resumed plan ${plan.id} from paused_limit → running`);
    }

    if (plan.status === 'stuck') {
      return [this.buildStuckCandidate(plan)];
    }

    return [this.buildActiveCandidate(plan)];
  }

  private buildNoPlanCandidate(): ContextCandidate {
    return {
      id: randomUUID(),
      content: `## 📋 QUYẾT ĐỊNH LẬP KẾ HOẠCH

Nếu có thể trả lời đầy đủ ngay từ thông tin hiện có (chào hỏi, hỏi đáp đơn giản), hãy trả lời trực tiếp và KHÔNG gọi \`update_plan\`.

Nếu task cần từ hai bước trở lên, cần dùng tool, hoặc có side-effect, hãy gọi \`update_plan(action='create', items=[...])\` trước khi thực thi.

Sau khi tạo plan:
1. KHÔNG mô tả lại plan bằng văn bản. Gọi NGAY tool thực thi item đầu tiên.
2. Dùng \`update_plan(action='complete_item', item_index=N, result_summary="...")\` sau mỗi bước có evidence hợp lệ.
3. Khi hết items → plan tự động completed.

VÍ DỤ ĐÚNG: gọi update_plan(create) → gọi ngay tool để thực thi item 0 → complete_item(0) → item 1 → ... → hết items thì plan tự completed.

LƯU Ý:
- items là mảng các string mô tả bước công việc.
- Không tạo plan sau khi đã có câu trả lời cuối cùng cho request này.
`,
      sourceId: 'plan',
      provenance: this.provenance,
      estimatedTokens: 300,
    };
  }

  private buildActiveCandidate(plan: any): ContextCandidate {
    const itemLines = plan.items.map((item: any) => {
      const check = item.status === 'completed' ? '[✅]' :
                    item.status === 'in_progress' ? '[🔄]' :
                    item.status === 'failed' ? '[❌]' :
                    item.status === 'skipped' ? '[⏭️]' :
                    item.status === 'pending' ? '[⬜]' : '[⬜]';
      const result = item.resultSummary ? ` — ${item.resultSummary}` : '';
      const err = item.error ? ` ⚠️ ${item.error}` : '';
      return `${check} Item ${item.index}: ${item.description}${result}${err}`;
    }).join('\\n');

    return {
      id: randomUUID(),
      content: `## 📋 KẾ HOẠCH HIỆN TẠI (Active Task Plan)
ID: ${plan.id}
Mục tiêu: ${plan.goal}
Trạng thái: ${plan.status}
Vị trí hiện tại: item ${plan.currentItemIndex}/${plan.items.length}

Các item:
${itemLines}

⚠️ QUY TẮC: Bạn ĐANG thực thi plan này.
- Item đang làm: ${plan.items[plan.currentItemIndex]?.description || 'N/A'}
- Item đã hoàn thành: GIỮ NGUYÊN, không làm lại.
- Để đánh dấu item hoàn thành: update_plan(action='complete_item', item_index=N, result_summary="...")
- Để bỏ qua item lỗi: update_plan(action='skip_item', item_index=N, reason="...")
- KHÔNG tạo plan mới. KHÔNG gọi update_plan(action='create') khi đã có plan active.
`,
      sourceId: 'plan',
      provenance: this.provenance,
      estimatedTokens: 500,
    };
  }

  private buildStuckCandidate(plan: any): ContextCandidate {
    const stuckItem = plan.items[plan.currentItemIndex];
    const completedItems = plan.items.filter((i: any) => i.status === 'completed');
    const completedStr = completedItems.length > 0
      ? completedItems.map((i: any) => `- ✅ Item ${i.index}: ${i.description}`).join('\\n')
      : '(chưa có)';
    const stuckLines = stuckItem
      ? `⚠️ Đang bị kẹt ở bước: ${stuckItem.description}
Đã thử ${stuckItem.consecutiveFailedAttempts || 0} lần liên tiếp không thành công.
Lỗi gần nhất: ${stuckItem.error || 'N/A'}

Để tiếp tục, bạn có thể:
- (a) Thử cách khác → gọi tool mới
- (b) Bỏ qua bước này → update_plan(action='skip_item', item_index=${stuckItem.index}, reason="...")
- (c) Dừng hẳn → update_plan(action='abort', reason="...")`
      : '';

    return {
      id: randomUUID(),
      content: `## 📋 PLAN BỊ KẸT (Stuck Task Plan)
ID: ${plan.id}
Mục tiêu: ${plan.goal}
Trạng thái: stuck (bị kẹt), cần bạn quyết định hướng đi khác.
Các bước trước đó đã hoàn thành:
${completedStr}

${stuckLines}
`,
      sourceId: 'plan',
      provenance: this.provenance,
      estimatedTokens: 400,
    };
  }
}