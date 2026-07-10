/**
 * Streaming ReAct Loop — Multi-step execution with progress streaming
 * 
 * Phase 2: Direct ReAct loop with:
 * - Streaming progress callbacks
 * - Timeout per iteration (30s)
 * - Circuit breaker (3 consecutive failures = stop)
 * - Error budget (max 3 total failures)
 * - Max iterations (15, matching agent.ts)
 * 
 * Architecture:
 *   execute(request)
 *     │
 *     ▼
 *   Loop (max 15 iters)
 *     ├─ stream("🔍 Đang xử lý yêu cầu...")
 *     ├─ LLM call (timeout: 30s)
 *     ├─ Extract tool call (or final text)
 *     ├─ stream("✅ Đã phân tích: [summary]")
 *     ├─ If tool call: execute tool
 *     │    ├─ stream("🛠 Đang thực thi: [tool]...")
 *     │    ├─ tool() {timeout: 30s}
 *     │    └─ stream("✅ [tool] hoàn thành")
 *     ├─ If error: 
 *     │    ├─ stream("⚠️ Lỗi: [msg]")
 *     │    ├─ retry or skip
 *     │    └─ circuit break if >3 consec failures
 *     └─ If final text: break and return
 */

import { Logger } from '../logger.js';

export type StreamEventType = 
  | 'decompose'     // Đang phân tích
  | 'step_start'    // Bắt đầu bước
  | 'step_complete' // Hoàn thành bước
  | 'step_skip'     // Bỏ qua bước
  | 'tool_call'     // Gọi tool
  | 'tool_result'   // Kết quả tool
  | 'synthesis'     // Đang tổng hợp
  | 'error'         // Lỗi
  | 'complete';     // Hoàn thành

export interface StreamEvent {
  type: StreamEventType;
  message: string;
  step?: number;
  totalSteps?: number;
  timestamp: number;
}

export type StreamCallback = (event: StreamEvent) => Promise<void> | void;

export interface ReActLoopConfig {
  maxIterations?: number;
  timeoutPerIterationMs?: number;
  timeoutPerToolMs?: number;
  errorBudget?: number;
  circuitBreakerThreshold?: number;
  stepDelimiter?: string;
}

export interface StepResult {
  description: string;
  result: string;
  success: boolean;
  durationMs: number;
}

export interface ReActResult {
  success: boolean;
  result: string;
  steps: StepResult[];
  totalDurationMs: number;
  iterationsUsed: number;
  errorsEncountered: number;
  circuitBroken: boolean;
  timedOut: boolean;
  error?: string;
}

/**
 * Enhanced ReAct loop with streaming + guardrails
 * 
 * Usage:
 *   const loop = new StreamingReActLoop(logger, taskRunner, streamCallback);
 *   const result = await loop.execute(userRequest, context);
 */
export class StreamingReActLoop {
  private logger: Logger;
  private taskRunner: TaskRunner;
  private streamCallback?: StreamCallback;
  private config: ReActLoopConfig;
  private abortController: AbortController | null = null;

  constructor(
    logger: Logger,
    taskRunner: TaskRunner,
    streamCallback?: StreamCallback,
    config: Partial<ReActLoopConfig> = {}
  ) {
    this.logger = logger;
    this.taskRunner = taskRunner;
    this.streamCallback = streamCallback;
    this.config = {
      maxIterations: 15,
      timeoutPerIterationMs: 30000,
      timeoutPerToolMs: 30000,
      errorBudget: 3,
      circuitBreakerThreshold: 3,
      stepDelimiter: '\n---\n',
      ...config
    };
  }

  /**
   * Execute a complex task with streaming + guardrails
   */
  async execute(
    userRequest: string,
    context: string = ''
  ): Promise<ReActResult> {
    const startTime = Date.now();
    const steps: StepResult[] = [];
    let errorsEncountered = 0;
    let consecutiveErrors = 0;
    let iterationsUsed = 0;
    let circuitBroken = false;
    let timedOut = false;

    this.abortController = new AbortController();

    // Validate input
    if (!userRequest || userRequest.trim().length === 0) {
      await this.emit({
        type: 'error',
        message: '⚠️ Yêu cầu trống',
        timestamp: Date.now()
      });
      return {
        success: false,
        result: '',
        steps,
        totalDurationMs: Date.now() - startTime,
        iterationsUsed: 0,
        errorsEncountered: 0,
        circuitBroken: false,
        timedOut: false,
        error: 'User request cannot be empty'
      };
    }

    try {
      await this.emit({
        type: 'decompose',
        message: '🔍 Đang phân tích yêu cầu...',
        timestamp: Date.now()
      });

      // ── Phase 1: Decompose task into steps ──
      const taskSteps = await this.decomposeTask(userRequest, context);

      if (taskSteps.length === 0) {
        // No decomposition — run as single full task
        await this.emit({
          type: 'step_start',
          message: '⚡ Đang xử lý yêu cầu...',
          timestamp: Date.now()
        });

        const singleResult = await this.executeWithTimeout(
          () => this.taskRunner(userRequest, context, 'single'),
          this.config.timeoutPerIterationMs || 30000
        );

        steps.push({
          description: 'Direct execution',
          result: singleResult,
          success: true,
          durationMs: Date.now() - startTime
        });

        await this.emit({
          type: 'complete',
          message: '✅ Hoàn thành!',
          timestamp: Date.now()
        });

        return {
          success: true,
          result: singleResult,
          steps,
          totalDurationMs: Date.now() - startTime,
          iterationsUsed: 1,
          errorsEncountered: 0,
          circuitBroken: false,
          timedOut: false
        };
      }

      const maxSteps = this.config.maxIterations || 15;
      const executeSteps = taskSteps.slice(0, maxSteps);

      await this.emit({
        type: 'decompose',
        message: `✅ Đã phân tích thành ${executeSteps.length} bước`,
        totalSteps: executeSteps.length,
        timestamp: Date.now()
      });

      // ── Phase 2: Execute each step with guardrails ──
      let accumulatedContext = '';

      for (let i = 0; i < executeSteps.length; i++) {
        const step = executeSteps[i];

        // Check abort
        if (this.abortController.signal.aborted) {
          await this.emit({
            type: 'error',
            message: '⚠️ Yêu cầu đã bị hủy',
            step: i + 1,
            totalSteps: executeSteps.length,
            timestamp: Date.now()
          });
          circuitBroken = true;
          break;
        }

        // Check circuit breaker
        if (consecutiveErrors >= (this.config.circuitBreakerThreshold || 3)) {
          await this.emit({
            type: 'error',
            message: `⚠️ Circuit breaker: dừng sau ${consecutiveErrors} lỗi liên tiếp`,
            step: i + 1,
            totalSteps: executeSteps.length,
            timestamp: Date.now()
          });
          circuitBroken = true;
          break;
        }

        // Check error budget
        if (errorsEncountered >= (this.config.errorBudget || 3)) {
          await this.emit({
            type: 'error',
            message: `⚠️ Đã vượt quá giới hạn lỗi (${errorsEncountered}), dừng lại`,
            step: i + 1,
            totalSteps: executeSteps.length,
            timestamp: Date.now()
          });
          circuitBroken = true;
          break;
        }

        const stepStartTime = Date.now();

        await this.emit({
          type: 'step_start',
          message: `🔄 Bước ${i + 1}/${executeSteps.length}: ${step.description}...`,
          step: i + 1,
          totalSteps: executeSteps.length,
          timestamp: Date.now()
        });

        const stepPrompt = this.buildStepPrompt(step, userRequest, accumulatedContext);

        try {
          const stepResult = await this.executeWithTimeout(
            () => this.taskRunner(stepPrompt, context, `step-${i + 1}`),
            this.config.timeoutPerIterationMs || 30000
          );

          steps.push({
            description: step.description,
            result: stepResult,
            success: true,
            durationMs: Date.now() - stepStartTime
          });

          consecutiveErrors = 0; // Reset consecutive errors on success
          accumulatedContext += 
            `\n\n### Kết quả bước ${i + 1}: ${step.description}\n${stepResult}`;

          await this.emit({
            type: 'step_complete',
            message: `✅ Bước ${i + 1}: ${step.description}`,
            step: i + 1,
            totalSteps: executeSteps.length,
            timestamp: Date.now()
          });

        } catch (stepError) {
          const errorMsg = stepError instanceof Error ? stepError.message : String(stepError);
          errorsEncountered++;
          consecutiveErrors++;

          // Check if it was a timeout
          if (stepError instanceof TimeoutError || 
              (typeof errorMsg === 'string' && errorMsg.includes('timeout'))) {
            timedOut = true;
          }

          steps.push({
            description: step.description,
            result: '',
            success: false,
            durationMs: Date.now() - stepStartTime
          });

          await this.emit({
            type: 'step_skip',
            message: `⚠️ Bước ${i + 1} thất bại: ${errorMsg.substring(0, 100)}. Tiếp tục bước tiếp theo.`,
            step: i + 1,
            totalSteps: executeSteps.length,
            timestamp: Date.now()
          });

          accumulatedContext += 
            `\n\n### Bước ${i + 1} thất bại: ${step.description}\nLỗi: ${errorMsg}`;
        }

        iterationsUsed = i + 1;
      }

      await this.emit({
        type: 'synthesis',
        message: '📝 Đang tổng hợp kết quả...',
        timestamp: Date.now()
      });
      const finalResult = await this.synthesizeFinal(
        userRequest,
        steps,
        accumulatedContext
      );

      await this.emit({
        type: 'complete',
        message: '✅ Hoàn thành!',
        timestamp: Date.now()
      });

      return {
        success: steps.some(s => s.success) || steps.length === 0,
        result: finalResult,
        steps,
        totalDurationMs: Date.now() - startTime,
        iterationsUsed,
        errorsEncountered,
        circuitBroken,
        timedOut,
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('StreamingReActLoop.execute failed', { error: errorMsg });

      await this.emit({
        type: 'error',
        message: `❌ Lỗi: ${errorMsg.substring(0, 200)}`,
        timestamp: Date.now()
      });

      return {
        success: false,
        result: '',
        steps,
        totalDurationMs: Date.now() - startTime,
        iterationsUsed,
        errorsEncountered,
        circuitBroken,
        timedOut,
        error: errorMsg
      };
    }
  }

  /**
   * Cancel execution
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Decompose a complex request into steps (same as Phase 1)
   */
  private async decomposeTask(
    userRequest: string,
    context: string
  ): Promise<{ id: number; description: string; prompt: string }[]> {
    const decompositionPrompt =
`Bạn là chuyên gia phân tích task. Hãy phân tích yêu cầu sau và chia thành các bước nhỏ, tuần tự.

YÊU CẦU:
${userRequest}

${context ? `BỐI CẢNH:\n${context}\n` : ''}

HƯỚNG DẪN:
1. Xác định các công việc độc lập cần thực hiện
2. Mỗi bước chỉ nên có 1 mục tiêu cụ thể
3. Tối đa 5 bước
4. CHỈ PHÂN TÍCH NẾU yêu cầu chứa nhiều nhiệm vụ con, cần lập kế hoạch rõ ràng để giải quyết. Nếu yêu cầu đơn giản, chỉ là tìm kiếm thông tin, hoặc có thể giải quyết trong 1-2 bước trực tiếp, hãy trả về "---KHÔNG THỂ PHÂN TÍCH---"

ĐỊNH DẠNG ĐẦU RA (chỉ trả về danh sách, không giải thích thêm):
---BẮT ĐẦU KẾ HOẠCH---
[1] Mô tả bước 1
[2] Mô tả bước 2
---KẾT THÚC KẾ HOẠCH---`;

    try {
      const result = await this.taskRunner(
        decompositionPrompt,
        'Task decomposition - no prior context',
        'decomposition'
      );
      return this.parseDecomposition(result);
    } catch {
      return [{
        id: 1,
        description: `Thực thi: ${userRequest.substring(0, 100)}`,
        prompt: userRequest
      }];
    }
  }

  private parseDecomposition(raw: string): { id: number; description: string; prompt: string }[] {
    const steps: { id: number; description: string; prompt: string }[] = [];

    const planMatch = raw.match(/---BẮT ĐẦU KẾ HOẠCH---\n([\s\S]*?)\n---KẾT THÚC KẾ HOẠCH---/);
    if (!planMatch) {
      if (raw.includes('KHÔNG THỂ PHÂN TÍCH')) return [];
      const numberedSteps = raw.match(/\[(\d+)\]\s*(.+)/g);
      if (numberedSteps) {
        for (const line of numberedSteps) {
          const m = line.match(/\[(\d+)\]\s*(.+)/);
          if (m) {
            steps.push({ id: parseInt(m[1]), description: m[2].trim(), prompt: m[2].trim() });
          }
        }
      }
      return steps;
    }

    const stepLines = planMatch[1].match(/\[(\d+)\]\s*(.+)/g);
    if (stepLines) {
      for (const line of stepLines) {
        const m = line.match(/\[(\d+)\]\s*(.+)/);
        if (m) {
          steps.push({ id: parseInt(m[1]), description: m[2].trim(), prompt: m[2].trim() });
        }
      }
    }
    return steps;
  }

  private buildStepPrompt(
    step: { description: string; prompt: string },
    originalRequest: string,
    accumulatedContext: string
  ): string {
    let prompt = `YÊU CẦU GỐC: ${originalRequest}\n\n`;
    if (accumulatedContext) {
      prompt += `KẾT QUẢ CÁC BƯỚC TRƯỚC:\n${accumulatedContext}\n\n`;
    }
    prompt += `NHIỆM VỤ HIỆN TẠI:\n${step.prompt || step.description}\n\nHãy hoàn thành nhiệm vụ này và trả về kết quả chi tiết.`;
    return prompt;
  }

  private async synthesizeFinal(
    originalRequest: string,
    steps: StepResult[],
    accumulatedContext: string
  ): Promise<string> {
    const successfulSteps = steps.filter(s => s.success);
    if (successfulSteps.length === 0) return 'Không có kết quả nào.';
    if (successfulSteps.length === 1) return successfulSteps[0].result;

    const synthesisPrompt = `Tổng hợp kết quả từ nhiều bước thành câu trả lời hoàn chỉnh.\n\nYÊU CẦU GỐC:\n${originalRequest}\n\n${accumulatedContext}\n\nHãy tổng hợp thành một câu trả lời mạch lạc, đầy đủ thông tin. Sử dụng tiếng Việt tự nhiên.`;

    try {
      return await this.taskRunner(synthesisPrompt, 'Synthesis step', 'synthesis');
    } catch {
      const delimiter = this.config.stepDelimiter || '\n---\n';
      return steps
        .filter(s => s.success)
        .map(s => `## ${s.description}\n${s.result}`)
        .join(`\n${delimiter}\n`);
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      fn().then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        }
      );
    });
  }

  /**
   * Emit a stream event
   */
  private async emit(event: StreamEvent): Promise<void> {
    if (this.streamCallback) {
      try {
        await this.streamCallback(event);
      } catch (cbError) {
        this.logger.warn('Stream callback failed', { error: String(cbError) });
      }
    }
  }
}

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export type TaskRunner = (
  prompt: string,
  context: string,
  label: string
) => Promise<string>;

/**
 * Check if a request is "complex" enough for multi-step orchestration
 */
export function isComplexTask(userRequest: string): boolean {
  const complexKeywords = [
    'research', 'analyze', 'evaluate', 'compare',
    'recommend', 'summarize', 'combine', 'synthesize',
    'review', 'assess',
    'nghiên cứu', 'phân tích', 'đánh giá', 'so sánh',
    'đề xuất', 'tổng hợp', 'kiểm tra', 'khảo sát'
  ];
  const sequentialIndicators = [
    ' and ', ' then ', ' next ', ' after ',
    ' first ', ' also ', ' followed by ',
    ' sau đó ', ' tiếp theo ', ' và '
  ];

  const lower = userRequest.toLowerCase();
  // Normalize Vietnamese diacritics for matching
  const normalizeVn = (s: string) => s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd');
  const normalized = normalizeVn(lower);
  const normalizedKeywords = complexKeywords.map(kw => normalizeVn(kw));
  const normalizedSequential = sequentialIndicators.map(ind => normalizeVn(ind));
  
  const keywordCount = normalizedKeywords.filter(kw => normalized.includes(kw)).length;
  const hasSequential = normalizedSequential.some(ind => normalized.includes(ind));
  const isLong = userRequest.length > 100;
  const hasMultipleKeywords = keywordCount >= 2;

  // Complex task if:
  // - Has 2+ keywords (multi-action task), OR
  // - Has keyword + sequential indicator (ordered steps), OR
  // - Very long request (>100 chars)
  return (hasMultipleKeywords) || (keywordCount >= 1 && hasSequential) || isLong;
}
