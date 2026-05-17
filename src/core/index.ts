/**
 * Kato Agent Core Entry Point
 * Framework 6 Layers Claude Code
 */

import 'dotenv/config';

export { Engine } from './engine.js';
export { Agent, AgentConfig } from './agent.js';
export { Orchestrator } from './orchestrator.js';
export { Decomposer } from './decomposer.js';
export { PlanExecutor } from './plan-executor.js';
export { ResultSynthesizer } from './result-synthesizer.js';
export { ToolRegistry, getDefaultRegistry } from './tool-registry.js';
export { ModelRouter, ModelAdapter, buildDefaultRouter } from './model-adapter.js';
export { MemoryLog } from './memory-log.js';
export { MemoryStore, globalMemoryStore } from './memory-store.js';
export { default as MCPClient } from './mcp-client.js';
export { default as MCPServer } from './mcp-server.js';
export { SOPEngine } from './sop-engine.js';
export { PatternRegistry } from './pattern-registry.js';
export { PatternSelector } from './pattern-selector.js';
export { SOPRegistry as SOPRegistryClass } from './sop-registry.js';
export { Tracer } from './tracer.js';
export { InputGuard } from './input-guard.js';
export { OutputGuard } from './output-guard.js';
export { PrivilegeGuard, createDefaultRules, createRestrictedAllowList } from './privilege-guard.js';
export { ResponseCache } from './response-cache.js';
export { default as EvalEngine } from './eval-engine.js';
export { SecurityScanner } from './security-scanner.js';
export { LangfuseClient } from './langfuse-client.js';
export { LiteLLMAdapter } from './model-adapter.js';
export { HookRegistry, globalHooks } from './hooks.js';
export { evolutionEngine } from './evolution.js';
export { CodeParser, ParsedFunction, ParsedImport, CodeParseResult } from './code-parser.js';
export { Janitor, JanitorConfig, JanitorResult } from './janitor.js';
export { RateLimiter, RateLimiterGroup, RateLimiterConfig, RateLimitState } from './rate-limiter.js';
export { CostTracker, CostRecord, CostTrackerConfig } from './cost-tracker.js';
export { executeChaining, ChainingStep } from './patterns/chaining.js';
export { executeRouting, Route, RoutingResult, keywordMatch, regexMatch } from './patterns/routing.js';
export { executeParallel, ParallelStep, ParallelResult } from './patterns/parallel.js';
export { executeCode, CodeExecRequest, CodeExecResult } from './patterns/code-exec.js';
export { executeReflection, ReflectionStep, ReflectionConfig } from './patterns/reflection.js';
export { SandboxExecutor, SandboxRequest, SandboxResult, SandboxConfig } from './sandbox-executor.js';
export { AgentManager, AgentInstance, AgentManagerConfig } from './agent-manager.js';
export { DockerSandbox, DockerSandboxConfig, ContainerInstance } from './docker-sandbox.js';
export { PromptFooClient, PromptFooTestConfig, PromptFooResult, PromptFooClientConfig } from './promptfoo-client.js';
export * from './types.js';

console.log(`✅ Kato Agent System initialized`);
console.log(`📚 Knowledge base ready`);