/**
 * @file types — Core type definitions
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by (all core modules)
 * @owner core-types
 */

/**
 * Coral Agent — Core Types
 * Framework 6 Layers — Lớp Lõi (Core Domain)
 * 
 * Định nghĩa các interface độc lập, không phụ thuộc vào platform.
 * LLMProvider, Engine, Adapter đều dùng chung các type này.
 */

/** Định nghĩa một Provider (nhà cung cấp model) */
export interface LLMProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  models: string[] | ModelSpec[];
  timeout?: number;
  type?: 'proxy' | 'direct';
  tier?: number;
  label?: string;
  maxRetries?: number;
}

/** Model với metadata cho cascade */
export interface ModelSpec {
  id: string;
  maxTokens: number;
  tier?: number;
  label?: string;
}

/** Constraint cho request (Tầng 4: Brief) */
export interface RequestConstraints {
  maxOutputLength?: number;
  forbiddenPatterns?: string[];
  requiredFormat?: 'markdown' | 'json' | 'text' | 'code';
  mustInclude?: string[];
  mustNotInclude?: string[];
}

/** Reference example (Tầng 3: Reference) */
export interface RequestReference {
  description: string;
  example: string;
}

/** Đầu vào chuẩn cho Engine — platform-agnostic */
export interface EngineRequest {
  sessionId: string;
  messages: ChatMessage[];
  modelId: string;
  agentName: string;
  protocol: string;
  mentionPrefix: string;
  /** Tầng 1: Task — nhiệm vụ cụ thể của request này */
  task?: string;
  /** Tầng 3: Reference — ví dụ output mong muốn */
  references?: RequestReference[];
  /** Tầng 4: Brief — ràng buộc cụ thể */
  constraints?: RequestConstraints;
  /** Tầng 2: Context Files — file bắt buộc phải đọc trước */
  requiredContextFiles?: string[];
  /** System prompt override — nếu không cung cấp, Engine sẽ build tự động */
  systemPrompt?: string;
  /** Fast mode flag — bypass Orchestrator for simple queries */
  fastMode?: boolean;
  /** Platform metadata — max message length, PII safety, formatting hints */
  platformMeta?: {
    maxMessageLength?: number;
    piiSafe?: boolean;
    platformHint?: string;
    supportsMarkdown?: boolean;
  };
}

/** Đầu ra chuẩn của Engine */
export interface EngineResponse {
  content: string;
  modelUsed: string;
  providerUsed: string;
}

/** Message trong history — độc lập với OpenAI format */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  timestamp?: number;
}

/** Hệ thống cấu hình providers — load từ config/providers.json */
export interface ProviderConfigFile {
  providers: LLMProviderConfig[];
}

/** Event emitted trong quá trình cascade */
export interface CascadeEvent {
  sessionId: string;
  type: 'trying' | 'fallback' | 'success' | 'exhausted' | 'failed';
  step: number;
  modelId: string;
  modelLabel?: string;
  providerName?: string;
  errorMessage?: string;
  tier?: number;
}

// ── Phase 6.2: Eval Engine Types (PromptFoo-inspired) ──

export type AssertionType = 'exact' | 'contains' | 'regex' | 'llm-graded' | 'similarity' | 'custom';

export interface EvalAssertion {
  type: AssertionType;
  value: string;
  threshold?: number;       // for similarity (0-1)
  provider?: string;        // for llm-graded (model to use as judge)
}

export interface EvalTestCase {
  name: string;
  input: string;            // prompt to test
  expected: string;         // expected output
  assertions: EvalAssertion[];
  vars?: Record<string, string>; // template variables
}

export interface EvalSuite {
  name: string;
  prompts: string[];        // prompt variants
  models: string[];         // models to test against
  tests: EvalTestCase[];
  description?: string;
}

export interface EvalTestResult {
  testName: string;
  passed: boolean;
  assertionType: AssertionType;
  expected: string;
  actual: string;
  error?: string;
  durationMs: number;
}

export interface EvalResult {
  suiteName: string;
  prompt: string;
  model: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  durationMs: number;
  testResults: EvalTestResult[];
  timestamp: string;
}

// ── Phase 6.2: Security Scanner Types ──

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityPattern {
  name: string;
  description: string;
  severity: SecuritySeverity;
  category: 'prompt-injection' | 'jailbreak' | 'data-leakage' | 'tool-abuse' | 'path-traversal';
  detect(input: string): SecurityFinding | null;
}

export interface SecurityFinding {
  patternName: string;
  severity: SecuritySeverity;
  category: string;
  matchedText: string;
  description: string;
  position?: { start: number; end: number };
}

export interface SecurityScanResult {
  passed: boolean;
  findings: SecurityFinding[];
  inputLength: number;
  scannedAt: string;
}

// ── Block types for MemoryStore ──

export type MemoryBlockType = 'task' | 'persona' | 'session' | 'context' | 'world';
