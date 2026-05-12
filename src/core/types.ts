/**
 * Kato Agent — Core Types
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
