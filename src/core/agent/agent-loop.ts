/**
 * Coral Agent Loop — Multi-step task orchestration
 * 
 * Phase 1: Task decomposition + sequential execution through Coral's engine
 * 
 * When a complex request arrives (e.g., "Research IoT + evaluate + recommend"),
 * CoralAgentLoop breaks it into sub-steps and executes each one through
 * Coral's existing ReAct loop, passing context between steps.
 * 
 * Architecture:
 *   User Request
 *       │
 *       ▼
 *   ┌────────────────────────────────┐
 *   │ CoralAgentLoop                 │
 *   │  ├─ Decompose task → steps     │
 *   │  ├─ Execute Step 1 (engine)    │
 *   │  ├─ Execute Step 2 (engine)    │
 *   │  ├─ ...                        │
 *   │  └─ Synthesize results         │
 *   └────────────────────────────────┘
 *       │
 *       ▼
 *   Response to user
 */

import { Logger } from '../logger';

export interface AgentLoopConfig {
  maxSteps?: number;
  timeoutPerStepMs?: number;
  contextWindowLimit?: number;
  stepDelimiter?: string;
}

export interface TaskStep {
  id: number;
  description: string;
  prompt: string;
  result?: string;
}

export interface TaskExecutionResult {
  success: boolean;
  result: string;
  steps: string[];
  stepCount: number;
  executionTimeMs?: number;
  error?: string;
}

/** Callback for executing a single step through Coral's engine */
export type TaskRunner = (
  prompt: string,
  context: string,
  stepLabel: string
) => Promise<string>;

/**
 * Default step delimiter for decomposition
 */
const DEFAULT_DELIMITER = '\n---\n';

/**
 * CoralAgentLoop: Orchestrates multi-step task execution
 * 
 * Usage:
 *   const loop = new CoralAgentLoop(logger, engine.process.bind(engine));
 *   const result = await loop.execute(userRequest);
 */
export class CoralAgentLoop {
  private logger: Logger;
  private taskRunner: TaskRunner;
  private config: AgentLoopConfig;

  constructor(
    logger: Logger,
    taskRunner: TaskRunner,
    config: Partial<AgentLoopConfig> = {}
  ) {
    this.logger = logger;
    this.taskRunner = taskRunner;
    this.config = {
      maxSteps: 5,
      timeoutPerStepMs: 60000,
      contextWindowLimit: 30000,
      stepDelimiter: DEFAULT_DELIMITER,
      ...config
    };
  }

  /**
   * Execute a complex task with multi-step orchestration
   * 
   * For complex requests (research + evaluate + recommend),
   * this decomposes the task into sequential steps and executes
   * each one through Coral's engine.
   * 
   * @param userRequest - The user's request
   * @param context - Additional context (session info, history excerpt)
   * @returns TaskExecutionResult with synthesized result
   */
  async execute(
    userRequest: string,
    context: string = ''
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    const steps: string[] = [];

    try {
      this.logger.info('AgentLoop.execute', {
        userRequest: userRequest.substring(0, 100),
        contextLength: context.length
      });

      // Validate input
      if (!userRequest || userRequest.trim().length === 0) {
        return this.fail('Empty request', 'User request cannot be empty');
      }

      // ── Phase 1: Decompose task into steps ──
      steps.push('📋 Phân tích yêu cầu và lập kế hoạch...');

      const taskSteps = await this.decomposeTask(userRequest, context);

      if (taskSteps.length === 0) {
        // Decomposition failed — fall back to direct execution
        this.logger.info('Task decomposition returned no steps, falling back to direct execution');
        steps.push('⚠️ Không thể phân tích, thực thi trực tiếp...');

        const directResult = await this.taskRunner(
          userRequest,
          context,
          'direct'
        );

        return {
          success: true,
          result: directResult,
          steps,
          stepCount: 1,
          executionTimeMs: Date.now() - startTime
        };
      }

      steps.push(`✅ Đã phân tích thành ${taskSteps.length} bước`);

      // Limit steps
      const maxSteps = this.config.maxSteps || 5;
      const executeSteps = taskSteps.slice(0, maxSteps);

      if (taskSteps.length > maxSteps) {
        steps.push(`⚠️ Giới hạn ${maxSteps} bước (yêu cầu ${taskSteps.length})`);
      }

      // ── Phase 2: Execute each step ──
      let accumulatedContext = '';
      const stepResults: string[] = [];

      for (let i = 0; i < executeSteps.length; i++) {
        const step = executeSteps[i];
        const stepLabel = `step-${i + 1}`;

        steps.push(`🔄 Bước ${i + 1}/${executeSteps.length}: ${step.description}...`);

        const stepPrompt = this.buildStepPrompt(step, userRequest, accumulatedContext);

        try {
          const stepResult = await this.taskRunner(
            stepPrompt,
            context,
            stepLabel
          );

          step.result = stepResult;
          stepResults.push(stepResult);
          accumulatedContext += `\n\n### Kết quả bước ${i + 1}: ${step.description}\n${stepResult}`;

          steps.push(`✅ Bước ${i + 1}: ${step.description} — hoàn thành`);
        } catch (stepError) {
          const errorMsg = stepError instanceof Error ? stepError.message : String(stepError);
          this.logger.warn(`Step ${i + 1} failed: ${errorMsg}`);
          steps.push(`⚠️ Bước ${i + 1}: ${step.description} — thất bại, bỏ qua`);
          accumulatedContext += `\n\n### Bước ${i + 1} thất bại: ${step.description}\nLỗi: ${errorMsg}`;
        }
      }

      // ── Phase 3: Synthesize final result ──
      steps.push('📝 Tổng hợp kết quả...');

      const finalResult = await this.synthesizeFinal(
        userRequest,
        executeSteps,
        stepResults
      );

      steps.push('✅ Hoàn thành!');

      return {
        success: true,
        result: finalResult,
        steps,
        stepCount: executeSteps.length,
        executionTimeMs: Date.now() - startTime
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      this.logger.error('AgentLoop.execute failed', {
        error: errorMsg,
        executionTimeMs,
        stepsCount: steps.length
      });

      return {
        success: false,
        result: '',
        steps,
        stepCount: 0,
        executionTimeMs,
        error: errorMsg
      };
    }
  }

  /**
   * Decompose a complex request into sequential steps
   * 
   * Uses the engine/taskRunner to analyze the request and generate
   * a structured execution plan.
   */
  private async decomposeTask(
    userRequest: string,
    context: string
  ): Promise<TaskStep[]> {
    const decompositionPrompt =
`Bạn là chuyên gia phân tích task. Hãy phân tích yêu cầu sau và chia thành các bước nhỏ, tuần tự.

YÊU CẦU:
${userRequest}

${context ? `BỐI CẢNH:\n${context}\n` : ''}

HƯỚNG DẪN:
1. Xác định các công việc độc lập cần thực hiện
2. Sắp xếp theo thứ tự logic (bước trước là input cho bước sau)
3. Mỗi bước chỉ nên có 1 mục tiêu cụ thể
4. Nếu yêu cầu đơn giản (chỉ cần 1 bước), trả về 1 bước duy nhất

ĐỊNH DẠNG ĐẦU RA (chỉ trả về danh sách, không giải thích thêm):

---BẮT ĐẦU KẾ HOẠCH---
[1] Mô tả bước 1
[2] Mô tả bước 2
[3] Mô tả bước 3
---KẾT THÚC KẾ HOẠCH---

Nếu không thể phân tích: trả về "---KHÔNG THỂ PHÂN TÍCH---"`;

    try {
      const result = await this.taskRunner(
        decompositionPrompt,
        'Task decomposition request - no prior context needed',
        'decomposition'
      );

      return this.parseDecomposition(result);
    } catch (error) {
      this.logger.warn('Task decomposition failed, returning single step', {
        error: String(error)
      });
      // Fallback: return the whole request as a single step
      return [{
        id: 1,
        description: `Thực thi: ${userRequest.substring(0, 100)}`,
        prompt: userRequest
      }];
    }
  }

  /**
   * Parse the LLM's decomposition output into a structured plan
   */
  private parseDecomposition(raw: string): TaskStep[] {
    const steps: TaskStep[] = [];

    // Try to extract steps between markers
    const planMatch = raw.match(/---BẮT ĐẦU KẾ HOẠCH---\n([\s\S]*?)\n---KẾT THÚC KẾ HOẠCH---/);
    if (!planMatch) {
      // Check for "cannot decompose" signal
      if (raw.includes('KHÔNG THỂ PHÂN TÍCH')) {
        return [];
      }
      // Try numbered list format as fallback
      const numberedSteps = raw.match(/\[(\d+)\]\s*(.+)/g);
      if (numberedSteps) {
        for (const line of numberedSteps) {
          const m = line.match(/\[(\d+)\]\s*(.+)/);
          if (m) {
            steps.push({
              id: parseInt(m[1]),
              description: m[2].trim(),
              prompt: m[2].trim()
            });
          }
        }
      }
      return steps;
    }

    const planContent = planMatch[1];
    const stepLines = planContent.match(/\[(\d+)\]\s*(.+)/g);

    if (stepLines) {
      for (const line of stepLines) {
        const m = line.match(/\[(\d+)\]\s*(.+)/);
        if (m) {
          const id = parseInt(m[1]);
          const description = m[2].trim();
          steps.push({
            id,
            description,
            prompt: `Thực hiện: ${description}. Bối cảnh: ${this.config.stepDelimiter || DEFAULT_DELIMITER}`
          });
        }
      }
    }

    return steps;
  }

  /**
   * Build the prompt for a specific step, including context from previous steps
   */
  private buildStepPrompt(
    step: TaskStep,
    originalRequest: string,
    accumulatedContext: string
  ): string {
    const delimiter = this.config.stepDelimiter || DEFAULT_DELIMITER;

    let prompt = `YÊU CẦU GỐC: ${originalRequest}\n\n`;

    if (accumulatedContext) {
      prompt += `KẾT QUẢ CÁC BƯỚC TRƯỚC:\n${accumulatedContext}\n\n`;
    }

    prompt += `NHIỆM VỤ HIỆN TẠI:\n${step.prompt || step.description}\n\n`;
    prompt += `Hãy hoàn thành nhiệm vụ này và trả về kết quả chi tiết.`;

    return prompt;
  }

  /**
   * Synthesize final result from all step results
   */
  private async synthesizeFinal(
    originalRequest: string,
    steps: TaskStep[],
    stepResults: string[]
  ): Promise<string> {
    if (stepResults.length === 0) {
      return 'Không có kết quả nào từ các bước thực thi.';
    }

    if (stepResults.length === 1) {
      return stepResults[0];
    }

    const synthesisPrompt =
`Tổng hợp kết quả từ nhiều bước thành câu trả lời hoàn chỉnh.

YÊU CẦU GỐC:
${originalRequest}

KẾT QUẢ TỪNG BƯỚC:
${steps.map((s, i) => `\nBước ${s.id}: ${s.description}\n${stepResults[i] || '(không có kết quả)'}`).join('\n')}

Hãy tổng hợp thành một câu trả lời mạch lạc, đầy đủ thông tin.
Sử dụng tiếng Việt tự nhiên.
Định dạng rõ ràng với các phần nếu cần.`;

    try {
      return await this.taskRunner(
        synthesisPrompt,
        'Synthesis step - combine all prior results',
        'synthesis'
      );
    } catch {
      // Fallback: concatenate results with separators
      const delimiter = this.config.stepDelimiter || DEFAULT_DELIMITER;
      return steps
        .map((s, i) => `## Bước ${s.id}: ${s.description}\n${stepResults[i] || ''}`)
        .join(`\n${delimiter}\n`);
    }
  }

  /**
   * Create a failed result
   */
  private fail(
    result: string,
    error: string,
    steps: string[] = []
  ): TaskExecutionResult {
    return {
      success: false,
      result,
      steps,
      stepCount: 0,
      error
    };
  }

  /**
   * Check if a request is "complex" enough to warrant multi-step orchestration
   * 
   * Heuristics:
   * - Multiple action verbs (research, analyze, evaluate, compare, etc.)
   * - Longer requests (>100 chars)
   * - Contains sequential indicators ("then", "and", "first", etc.)
   */
  isComplexTask(userRequest: string): boolean {
    const complexKeywords = [
      'research', 'analyze', 'evaluate', 'compare',
      'recommend', 'summarize', 'combine', 'synthesize',
      'review', 'assess'
    ];

    const sequentialIndicators = [
      ' then ', ' and ', ' next ', ' after ',
      ' first ', ' also ', ' followed by '
    ];

    const lowerRequest = userRequest.toLowerCase();

    const complexKeywordCount = complexKeywords.filter(kw =>
      lowerRequest.includes(kw)
    ).length;

    const hasSequentialIndicator = sequentialIndicators.some(ind =>
      lowerRequest.includes(ind)
    );

    const isLongerRequest = userRequest.length > 100;

    return (
      complexKeywordCount >= 2 || hasSequentialIndicator || isLongerRequest
    );
  }
}
