# Restructure Plan — Remaining Work
> Saved: 2026-05-17 18:52 | Context window hit limit during PHASE 4

## Status: PHASE 4 partially complete

### ✅ Done:
- 10 subdirectories created
- 39 files moved to correct locations
- 7 garbage files deleted
- gnap-agent-card.ts created
- WorldBlock interface added to types.ts
- architecture-gap-closure-plan.md → CLOSED
- kato-roadmap-phases-4-8.md → CLOSED
- fix-test-imports.ps1 ran (2 test files updated)

### ❌ Remaining:

#### 1. Fix source file imports
Files that still have old relative imports:

**src/core/llm/model-adapter.ts** (lines 11-12):
```typescript
// CURRENT (wrong):
import { LLMProviderConfig, ModelSpec, ChatMessage } from './types.js';
import { evolutionEngine } from './evolution.js';

// SHOULD BE:
import { LLMProviderConfig, ModelSpec, ChatMessage } from '../core/types.js';
import { evolutionEngine } from '../core/evolution.js';
```

**src/core/observability/tracer.ts** (line with hooks import):
```typescript
// CURRENT (wrong):
import { HookRegistry, globalHooks } from './hooks.js';

// SHOULD BE:
import { HookRegistry, globalHooks } from '../core/hooks.js';
```

**src/core/engine/engine.ts** — check all imports, many reference old flat paths like `./memory.js`, `./agent.js`, `./types.js` etc. These need to be updated to sibling directory paths.

#### 2. Fix test file imports
Run: `npm run test 2>&1 | Select-String -Pattern "Cannot find module"` to see remaining failures.

Common patterns to fix:
- `../src/core/eval-engine.js` → `../src/core/observability/eval-engine.js`
- `../src/core/hooks.js` → `../src/core/core/hooks.js`
- `../src/core/langfuse-client.js` → `../src/core/observability/langfuse-client.js`
- `../src/core/model-adapter.js` → `../src/core/llm/model-adapter.js`
- `../src/core/tool-registry.js` → `../src/core/tools/tool-registry.js`
- `../src/core/memory-log.js` → `../src/core/memory/memory-log.js`
- `../src/core/orchestrator.js` → `../src/core/engine/orchestrator.js`
- `../src/core/decomposer.js` → `../src/core/engine/decomposer.js`
- `../src/core/security-scanner.js` → `../src/core/security/security-scanner.js`
- `../src/core/skill-runtime.js` → `../src/core/agents/skill-runtime.js`
- `../src/core/sop-registry.js` → `../src/core/sop/sop-registry.js`
- `../src/core/sop-engine.js` → `../src/core/sop/sop-engine.js`
- `../src/core/tracer.js` → `../src/core/observability/tracer.js`
- `../src/core/response-cache.js` → `../src/core/security/response-cache.js`
- `../src/core/input-guard.js` → `../src/core/security/input-guard.js`
- `../src/core/output-guard.js` → `../src/core/security/output-guard.js`
- `../src/core/privilege-guard.js` → `../src/core/security/privilege-guard.js`
- `../src/core/rate-limiter.js` → `../src/core/security/rate-limiter.js`
- `../src/core/agent-manager.js` → `../src/core/agents/agent-manager.js`
- `../src/core/sub-agent.js` → `../src/core/agents/sub-agent.js`
- `../src/core/failure-classifier.js` → `../src/core/agents/failure-classifier.js`
- `../src/core/sandbox-executor.js` → `../src/core/agents/sandbox-executor.js`
- `../src/core/docker-sandbox.js` → `../src/core/agents/docker-sandbox.js`
- `../src/core/mcp-client.js` → `../src/core/mcp/mcp-client.js`
- `../src/core/mcp-server.js` → `../src/core/mcp/mcp-server.js`
- `../src/core/gnap-queue.js` → `../src/core/gnap/gnap-queue.js`
- `../src/core/memory-store.js` → `../src/core/memory/memory-store.js`
- `../src/core/memory-temporal.js` → `../src/core/memory/memory-temporal.js`
- `../src/core/memory-agentic.js` → `../src/core/memory/memory-agentic.js`
- `../src/core/state-manager.js` → `../src/core/memory/state-manager.js`
- `../src/core/prompt-builder.js` → `../src/core/llm/prompt-builder.js`
- `../src/core/provider-registry.js` → `../src/core/llm/provider-registry.js`
- `../src/core/ollama-adapter.js` → `../src/core/llm/ollama-adapter.js`
- `../src/core/cost-tracker.js` → `../src/core/observability/cost-tracker.js`
- `../src/core/promptfoo-client.js` → `../src/core/observability/promptfoo-client.js`
- `../src/core/pattern-selector.js` → `../src/core/sop/pattern-selector.js`
- `../src/core/pattern-registry.js` → `../src/core/sop/pattern-registry.js`
- `../src/core/evolution.js` → `../src/core/core/evolution.js`
- `../src/core/types.js` → `../src/core/core/types.js`
- `../src/core/index.js` → `../src/core/core/index.js`
- `../src/core/engine.js` → `../src/core/engine/engine.js`
- `../src/core/agent.js` → `../src/core/engine/agent.js`
- `../src/core/plan-executor.js` → `../src/core/engine/plan-executor.js`
- `../src/core/result-synthesizer.js` → `../src/core/engine/result-synthesizer.js`
- `../src/core/memory.js` → `../src/core/memory/memory.js`
- `../src/core/memory-compressor.js` → `../src/core/memory/memory-compressor.js`
- `../src/core/code-parser.js` → `../src/core/agents/code-parser.js`
- `../src/core/janitor.js` → `../src/core/agents/janitor.js`
- `../src/core/skills-index-manager.js` → `../src/core/agents/skills-index-manager.js`
- `../src/core/litellm-adapter.js` → `../src/core/llm/litellm-adapter.js`
- `../src/core/gnap-agent-card.js` → `../src/core/gnap/gnap-agent-card.js`

#### 3. Verify
```powershell
npx tsc --noEmit   # Should show 0 errors from src/core
npm run test       # Should pass
```

#### 4. Cleanup
```powershell
Remove-Item fix-test-imports.ps1