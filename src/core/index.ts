/**
 * @file index — Core barrel export
 * @layer core
 * @depends-on (all core modules)
 * @imported-by src/modules/*
 * @owner core
 */

/**
 * Kato Agent Core Entry Point
 * Framework 6 Layers Claude Code
 */

import 'dotenv/config';

export { Engine } from './engine/engine.js';
export { Agent, AgentConfig } from './engine/agent.js';
export { Orchestrator } from './engine/orchestrator.js';
export { Decomposer } from './engine/decomposer.js';
export { PlanExecutor } from './engine/plan-executor.js';
export { ResultSynthesizer } from './engine/result-synthesizer.js';
export { ToolRegistry, getDefaultRegistry } from './tools/tool-registry.js';
export { ModelRouter, ModelAdapter, buildDefaultRouter, LiteLLMAdapter } from './llm/model-adapter.js';
export { MemoryLog } from './memory/memory-log.js';
export { MemoryStore, globalMemoryStore } from './memory/memory-store.js';
export * from './memory/memory-temporal.js';
export * from './memory/memory-agentic.js';
export { default as MCPClient } from './mcp/mcp-client.js';
export { default as MCPServer } from './mcp/mcp-server.js';
export { SOPEngine } from './sop/sop-engine.js';
export { SOPRegistry as SOPRegistryClass } from './sop/sop-registry.js';
export { Tracer } from './observability/tracer.js';
export { InputGuard } from './security/input-guard.js';
export { OutputGuard } from './security/output-guard.js';
export { PrivilegeGuard, createDefaultAllowRules, createRestrictedAllowList } from './security/privilege-guard.js';
export { ResponseCache } from './security/response-cache.js';
export { SecurityScanner } from './security/security-scanner.js';
export { HookRegistry, globalHooks } from './hooks.js';
export { evolutionEngine } from './evolution.js';
export { CodeParser, ParsedFunction, ParsedImport, CodeParseResult } from './agents/code-parser.js';
export { Janitor, JanitorConfig, JanitorResult } from './agents/janitor.js';
export { RateLimiter, RateLimiterGroup, RateLimiterConfig, RateLimitState } from './security/rate-limiter.js';
export * from './patterns/index.js';
export { SandboxExecutor, SandboxRequest, SandboxResult, SandboxConfig } from './agents/sandbox-executor.js';
export * from './llm/model-adapter.js';
export * from './types.js';

/* Kato Agent System initialized */
