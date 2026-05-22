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
export { ModelRouter, ModelAdapter, buildDefaultRouter } from './llm/model-adapter.js';
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
export { default as EvalEngine } from './observability/eval-engine.js';
export { SecurityScanner } from './security/security-scanner.js';
export { LangfuseClient } from './observability/langfuse-client.js';
export { LiteLLMAdapter } from './llm/model-adapter.js';
export { HookRegistry, globalHooks } from './hooks.js';
export { evolutionEngine } from './evolution.js';
export { CodeParser, ParsedFunction, ParsedImport, CodeParseResult } from './agents/code-parser.js';
export { Janitor, JanitorConfig, JanitorResult } from './agents/janitor.js';
export { RateLimiter, RateLimiterGroup, RateLimiterConfig, RateLimitState } from './security/rate-limiter.js';
export { CostTracker, CostRecord, CostTrackerConfig } from './observability/cost-tracker.js';
export { executeChaining, ChainingStep } from './patterns/chaining.js';
export { executeRouting, Route, RoutingResult, keywordMatch, regexMatch } from './patterns/routing.js';
export { executeParallel, ParallelStep, ParallelResult } from './patterns/parallel.js';
export { executeCode, CodeExecRequest, CodeExecResult } from './patterns/code-exec.js';
export { executeReflection, ReflectionStep, ReflectionConfig } from './patterns/reflection.js';
export * from './patterns/adaptive-thinking.js';
export * from './patterns/agent-workforce.js';
export * from './patterns/chain-of-thought.js';
export * from './patterns/chaining.js';
export * from './patterns/code-exec.js';
export * from './patterns/context-compression.js';
export * from './patterns/dynamic-scaffolding.js';
export * from './patterns/evaluation.js';
export * from './patterns/human-in-the-loop.js';
export * from './patterns/index.js';
export * from './patterns/memory-augmented.js';
export * from './patterns/multi-agent.js';
export * from './patterns/orchestrator-workforce.js';
export * from './patterns/parallel.js';
export * from './patterns/reflection.js';
export * from './patterns/routing.js';
export * from './patterns/self-consistency.js';
export * from './patterns/self-discovery.js';
export * from './patterns/supervisor.js';
export * from './patterns/tool-arbiter.js';
export * from './patterns/tool-augmented.js';
export { SandboxExecutor, SandboxRequest, SandboxResult, SandboxConfig } from './agents/sandbox-executor.js';
export { AgentManager, AgentInstance, AgentManagerConfig } from './agents/agent-manager.js';
export { DockerSandbox, DockerSandboxConfig, ContainerInstance } from './agents/docker-sandbox.js';
export { PromptFooClient, PromptFooTestConfig, PromptFooResult, PromptFooClientConfig } from './observability/promptfoo-client.js';
export { SubAgent, SubAgentConfig, SubAgentResult } from './agents/sub-agent.js';
export { FailureClassifier, FailureCategory, ClassifiedFailure } from './agents/failure-classifier.js';
export * from './llm/model-adapter.js';
export * from './types.js';

console.log(`✅ Kato Agent System initialized`);
console.log(`📚 Knowledge base ready`);
