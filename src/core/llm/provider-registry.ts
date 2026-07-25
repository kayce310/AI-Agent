/**
 * @file Coral Agent â€” Provider Registry
 * @layer core
 * @depends-on config/providers.json, .env (NINE_ROUTER_API_BASE)
 * @imported-by src/core/llm/llm.ts, src/core/engine/engine.ts
 * @owner core-llm
 *
 * Quáº£n lÃ½ danh sÃ¡ch LLM Provider. HoÃ n toÃ n "mÃ¹" vá» platform.
 * Load config tá»« file, cung cáº¥p interface tÃ¬m model theo ID.
 * Há»— trá»£ external 9Router thÃ´ng qua biáº¿n mÃ´i trÆ°á»ng NINE_ROUTER_API_BASE.
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { LLMProviderConfig, ProviderConfigFile, ModelSpec } from '../types.js';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'ProviderRegistry' });

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
  stream?: boolean;
}

/** Má»™t provider Ä‘Ã£ Ä‘Æ°á»£c khá»Ÿi táº¡o (cÃ³ OpenAI client sáºµn) */
class OpenAIBackedProvider implements IProviderClient {
  public baseUrl: string;
  public models: string[];
  private client: OpenAI;

  constructor(config: LLMProviderConfig) {
    this.baseUrl = config.baseUrl;
    // Normalize: support cáº£ string[] vÃ  ModelSpec[]
    this.models = config.models.map((m: any) => typeof m === 'string' ? m : m.id);
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout ?? 120000,
      maxRetries: 2,
    });
  }

  async invoke(params: ProviderInvokeParams): Promise<any> {
    const createParams: any = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? 1024,
      tools: params.tools,
      tool_choice: params.tool_choice ?? 'auto',
    };
    // ponytail: stream param was silently ignored — OpenAI SDK needs explicit stream:true
    if (params.stream) {
      createParams.stream = true;
    }
    return await this.client.chat.completions.create(createParams);
  }

  /** Expose raw client cho tool calling loop */
  getRawClient(): OpenAI {
    return this.client;
  }
}

export class ProviderRegistry {
  private providers: Map<string, OpenAIBackedProvider> = new Map();
  private modelToProvider: Map<string, string> = new Map(); // modelId -> providerName
  private modelSpecs: Map<string, ModelSpec> = new Map();    // modelId -> full ModelSpec (maxTokens, tier, label)
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath ?? path.join(process.cwd(), 'config', 'providers.json');
  }

  /** Load providers tá»« file YAML */
  loadFromConfig(): void {
    if (!fs.existsSync(this.configPath)) {
      log.info(`Config not found at ${this.configPath}, using defaults`);
      this.registerDefaultProviders();
      return;
    }

    const raw = fs.readFileSync(this.configPath, 'utf8');
    const parsed: ProviderConfigFile = JSON.parse(raw);

    if (!parsed?.providers || !Array.isArray(parsed.providers)) {
      log.info('Invalid providers.json, using defaults');
      this.registerDefaultProviders();
      return;
    }

    for (const cfg of parsed.providers) {
      // If 9router config has hardcoded baseUrl but env var exists, override
      if (cfg.name === '9router' && process.env.NINE_ROUTER_API_BASE) {
        log.info(`Overriding 9router baseUrl to ${process.env.NINE_ROUTER_API_BASE}`);
        cfg.baseUrl = process.env.NINE_ROUTER_API_BASE;
      }
      this.register(cfg);
    }

    log.info(`Loaded ${this.providers.size} provider(s) with ${this.modelToProvider.size} model(s)`);
  }

  /** ÄÄƒng kÃ½ má»™t provider */
  register(config: LLMProviderConfig): void {
    const provider = new OpenAIBackedProvider(config);
    this.providers.set(config.name, provider);

    // Normalize models: support cáº£ string[] vÃ  ModelSpec[]
    // LÆ°u ModelSpec Ä‘áº§y Ä‘á»§ (maxTokens, tier, label) cho resolve()
    for (const m of config.models) {
      if (typeof m === 'string') {
        this.modelToProvider.set(m, config.name);
        // string khÃ´ng cÃ³ maxTokens â†’ khÃ´ng set vÃ o modelSpecs (Ä‘á»ƒ fallback 2048)
      } else {
        this.modelToProvider.set(m.id, config.name);
        this.modelSpecs.set(m.id, { ...m, tier: m.tier || config.tier || 3 });
      }
    }
  }

  /** Resolve provider cho má»™t model ID, kÃ¨m maxTokens tá»« config */
  resolve(modelId: string): { provider: IProviderClient; providerName: string; maxTokens?: number } | null {
    const providerName = this.modelToProvider.get(modelId);
    if (!providerName) return null;

    const provider = this.providers.get(providerName);
    if (!provider) return null;

    const spec = this.modelSpecs.get(modelId);

    return { provider, providerName, maxTokens: spec?.maxTokens };
  }

  /** Kiá»ƒm tra model cÃ³ tá»“n táº¡i khÃ´ng */
  hasModel(modelId: string): boolean {
    return this.modelToProvider.has(modelId);
  }

  /** Danh sÃ¡ch táº¥t cáº£ model cÃ³ sáºµn */
  listModels(): string[] {
    return Array.from(this.modelToProvider.keys());
  }

  /** Láº¥y danh sÃ¡ch ModelSpec Ä‘áº§y Ä‘á»§ */
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

  /** Register default providers tá»« env vars (fallback khi khÃ´ng cÃ³ config) */
  private registerDefaultProviders(): void {
    // 9Router external service takes priority if configured
    const nineRouterBase = process.env.NINE_ROUTER_API_BASE;
    if (nineRouterBase) {
      log.info("Registering 9router provider from NINE_ROUTER_API_BASE");
      this.register({
        name: '9router',
        baseUrl: nineRouterBase,
        apiKey: process.env.NINE_ROUTER_API_KEY || 'local-proxy-key',
        models: [
          'openrouter/openrouter/owl-alpha',
          'anthropic/claude-3-haiku',
          'meta-llama/llama-3-8b-instruct',
          'mistralai/mistral-7b-instruct-v0.3',
          'google/gemma-2-9b-it',
          'openai/gpt-3.5-turbo',
        ],
      });
      return;
    }

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
