/**
 * Kato Agent — Provider Registry
 * Framework 6 Layers — Lớp Lõi (Core Domain)
 * 
 * Quản lý danh sách LLM Provider. Hoàn toàn "mù" về platform.
 * Load config từ file, cung cấp interface tìm model theo ID.
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { LLMProviderConfig, ProviderConfigFile, ModelSpec } from '../core/types.js';

export interface IProviderClient {
  baseUrl: string;
  models: string[];
  invoke(params: ProviderInvokeParams): Promise<any>;
}

export interface ProviderInvokeParams {
  model: string;
  messages: any[];
  tools?: any[];
  temperature?: number;
  max_tokens?: number;
  tool_choice?: 'auto' | 'none';
}

/** Một provider đã được khởi tạo (có OpenAI client sẵn) */
class OpenAIBackedProvider implements IProviderClient {
  public baseUrl: string;
  public models: string[];
  private client: OpenAI;

  constructor(config: LLMProviderConfig) {
    this.baseUrl = config.baseUrl;
    // Normalize: support cả string[] và ModelSpec[]
    this.models = config.models.map((m: any) => typeof m === 'string' ? m : m.id);
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout ?? 120000,
      maxRetries: 2,
    });
  }

  async invoke(params: ProviderInvokeParams): Promise<any> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 1024,
      tools: params.tools,
      tool_choice: params.tool_choice ?? 'auto',
    });

    return response;
  }

  /** Expose raw client cho tool calling loop */
  getRawClient(): OpenAI {
    return this.client;
  }
}

export class ProviderRegistry {
  private providers: Map<string, OpenAIBackedProvider> = new Map();
  private modelToProvider: Map<string, string> = new Map(); // modelId -> providerName
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath ?? path.join(process.cwd(), 'config', 'providers.json');
  }

  /** Load providers từ file YAML */
  loadFromConfig(): void {
    if (!fs.existsSync(this.configPath)) {
      console.warn(`⚠️ Provider config not found at ${this.configPath}, using defaults`);
      this.registerDefaultProviders();
      return;
    }

    const raw = fs.readFileSync(this.configPath, 'utf8');
    const parsed: ProviderConfigFile = JSON.parse(raw);

    if (!parsed?.providers || !Array.isArray(parsed.providers)) {
      console.warn(`⚠️ Invalid provider config format, using defaults`);
      this.registerDefaultProviders();
      return;
    }

    for (const cfg of parsed.providers) {
      this.register(cfg);
    }

    console.log(`✅ ProviderRegistry: loaded ${parsed.providers.length} providers, ${this.modelToProvider.size} models`);
  }

  /** Đăng ký một provider */
  register(config: LLMProviderConfig): void {
    const provider = new OpenAIBackedProvider(config);
    this.providers.set(config.name, provider);

    // Normalize models: support cả string[] và ModelSpec[]
    const modelIds = config.models.map((m: any) => typeof m === 'string' ? m : m.id);
    for (const modelId of modelIds) {
      this.modelToProvider.set(modelId, config.name);
    }
  }

  /** Resolve provider cho một model ID */
  resolve(modelId: string): { provider: IProviderClient; providerName: string } | null {
    const providerName = this.modelToProvider.get(modelId);
    if (!providerName) return null;

    const provider = this.providers.get(providerName);
    if (!provider) return null;

    return { provider, providerName };
  }

  /** Kiểm tra model có tồn tại không */
  hasModel(modelId: string): boolean {
    return this.modelToProvider.has(modelId);
  }

  /** Danh sách tất cả model có sẵn */
  listModels(): string[] {
    return Array.from(this.modelToProvider.keys());
  }

  /** Lấy danh sách ModelSpec đầy đủ */
  getModelSpecs(): ModelSpec[] {
    const specs: ModelSpec[] = [];
    if (!fs.existsSync(this.configPath)) return [];
    
    const raw = fs.readFileSync(this.configPath, 'utf8');
    const parsed: ProviderConfigFile = JSON.parse(raw);
    
    for (const p of parsed.providers) {
      for (const m of p.models) {
        if (typeof m === 'string') {
          specs.push({ id: m, maxTokens: 4096, tier: p.tier || 3, label: m });
        } else {
          specs.push({ ...m, tier: m.tier || p.tier || 3 });
        }
      }
    }
    return specs;
  }

  /** Get raw client (cho tool calling loop) */
  getRawClient(providerName: string): OpenAI | null {
    const provider = this.providers.get(providerName);
    if (!provider) return null;
    return provider.getRawClient();
  }

  /** Register default providers từ env vars (fallback khi không có config) */
  private registerDefaultProviders(): void {
    const baseURL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:8000/v1';
    const apiKey = process.env.OPENAI_API_KEY || 'dummy';

    this.register({
      name: 'default',
      baseUrl: baseURL,
      apiKey,
      models: [
        'anthropic/claude-3-haiku',
        'meta-llama/llama-3-8b-instruct',
        'mistralai/mistral-7b-instruct-v0.3',
        'google/gemma-2-9b-it',
        'openai/gpt-3.5-turbo',
      ],
    });
  }
}

export default ProviderRegistry;