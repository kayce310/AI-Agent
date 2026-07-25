# PHASE 4E-B: LIVE COGNITIVE STATE
**Date:** 2026-06-21 05:03 UTC  
**Status:** Architecture Proposal (No Implementation)  
**Scope:** Real-time reasoning streaming in FOCUS tab

---

## Executive Summary

**Current State:**
- Reasoning captured only at decision_made event
- One-time snapshot per decision
- No intermediate reasoning visibility
- Agent appears passive until decision

**Proposed State:**
- Reasoning streamed as it develops
- Live updates visible in FOCUS tab
- Agent appears cognitively active in real-time
- Full reasoning lifecycle tracked

**Goal:** Make the agent appear alive before building Three.js hologram.

---

## Part 1: Current Reasoning Lifecycle Audit

### Where reasoningContent is Created

**Source: Model Adapter**
- File: `src/core/llm/model-adapter.ts` (implicit via provider)
- Models supporting intermediate reasoning:
  - ✅ DeepSeek V3 (thinking mode)
  - ✅ OpenAI o1 (reasoning mode)
  - ✅ Anthropic Claude (extended thinking, future)
  - ⚠️ Others: no streaming support yet

### Current Data Flow

```
Model (DeepSeek/o1)
  ↓ [reasoning_content (streamed or batched)]
  ↓
ModelAdapter.call()
  ↓ [returns reasoning_content in modelResult]
  ↓
Agent.step() (src/core/engine/agent.ts, line 424)
  ↓ [receives reasoningContent via modelResult]
  ↓
HookRegistry.emit('tool:call', { reasoningContent, ... })
  ↓
Engine.onEvent('tool:call') (src/core/engine/engine.ts, line 222)
  ↓ [extracts reasoningContent, slices to 1000 chars]
  ↓
EventLogger.decisionMade()
  ↓
EventBus.emit('decision_made')
  ↓
EventStore.insert() → SQLite
  ↓
WebSocket broadcast to Dashboard
  ↓
FOCUS.renderFocus() (src/dashboard/app.js)
```

**Problem:** Entire reasoning flow happens synchronously. No intermediate checkpoints.

### Where reasoningContent is Available

| Location | Stage | Timing | Format |
|----------|-------|--------|--------|
| ModelAdapter | During model call | Parallel (streaming) or post-response | Full text or chunked |
| Agent.step() | After model returns | Post-model | Full text (1000+ chars) |
| tool:call hook | Before decision_made | Immediate | Full text (sliced to 1000) |
| decision_made event | Final decision | Once per decision | 1000-char snippet |

**Current blocker:** No event emission between "model starts reasoning" and "decision_made event emitted".

---

## Part 2: Event Model Design

### New Events: Reasoning Lifecycle

#### `reasoning_started`
**Fired:** When model begins computation (immediately after API call)

```javascript
{
  type: 'reasoning_started',
  taskId: string,
  decisionId: string,  // Unique reasoning session
  timestamp: number,
  payload: {
    model: string,           // 'deepseek-v3', 'o1-preview'
    provider: string,        // 'deepseek', 'openai'
    cycleNum: number,        // ReAct cycle (1, 2, 3...)
    expectedDuration?: number // ms (optional, from model metadata)
  }
}
```

#### `reasoning_updated`
**Fired:** As intermediate reasoning becomes available (streaming chunks)

```javascript
{
  type: 'reasoning_updated',
  taskId: string,
  decisionId: string,  // Links to reasoning_started
  timestamp: number,
  payload: {
    chunk: string,              // Latest reasoning text (incremental)
    fullReasoning: string,      // Complete reasoning so far
    charCount: number,          // Total chars accumulated
    percentComplete?: number,   // 0-100 (if known)
    model: string
  }
}
```

#### `reasoning_finished`
**Fired:** When model reasoning completes, before decision_made

```javascript
{
  type: 'reasoning_finished',
  taskId: string,
  decisionId: string,
  timestamp: number,
  payload: {
    reasoning: string,          // Complete reasoning text
    charCount: number,
    durationMs: number,         // Time from reasoning_started to finish
    model: string,
    decision?: string,          // Early indicator (optional)
    confidence?: number         // 0.0-1.0 (optional)
  }
}
```

#### `decision_made` (UNCHANGED)
**Current:** Still fired after tool/response selected

```javascript
{
  type: 'decision_made',
  taskId: string,
  decisionId: string,  // Same decisionId from reasoning_started
  timestamp: number,
  payload: {
    decision: string,
    reason: string,
    reasoningSnippet: string,
    nextAction: string,
    confidence?: number
  }
}
```

**Change:** `decisionId` now links back to `reasoning_started`, creating a causal chain.

---

## Part 3: Complete Data Flow (Proposed)

```
┌─────────────────────────────────────────────────────────────┐
│ MODEL (DeepSeek/o1 thinking mode)                          │
│ • Receives task                                             │
│ • Begins intermediate reasoning                             │
│ • Streams reasoning chunks (or batches)                     │
└──────────────────┬──────────────────────────────────────────┘
                   │ [reasoning_content stream]
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ MODEL ADAPTER (src/core/llm/model-adapter.ts)              │
│ • Consumes streaming chunks from model API                 │
│ • Buffers or emits intermediate reasoning                  │
│ • Calls hooks for EACH chunk (or batches)                  │
│   onReasoningChunk(chunk, fullSoFar, model)                │
└──────────────────┬──────────────────────────────────────────┘
                   │ [reasoning chunks via hook]
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ HOOK REGISTRY (src/core/hooks.ts)                          │
│ • Emits: 'reasoning:update'                                │
│   { chunk, fullReasoning, charCount, model }               │
│ • Pipeline can intercept and route to EventBus             │
└──────────────────┬──────────────────────────────────────────┘
                   │ [custom reasoning hooks]
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ AGENT (src/core/engine/agent.ts)                           │
│ • Receives model response with full reasoning              │
│ • Emits hook: 'reasoning:complete'                         │
│   { reasoning, model, duration }                           │
│ • Continues with tool selection / response generation      │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ↓                     ↓
[tool:call]           [model:response]
        │                     │
        └──────────┬──────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ ENGINE (src/core/engine/engine.ts)                         │
│ • Listens to tool:call / model:response                    │
│ • Emits decision_made with reasoningSnippet                │
│ • Links decisionId to prior reasoning_started              │
└──────────────────┬──────────────────────────────────────────┘
                   │ [decision_made event]
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ EVENT LOGGER (src/core/events/logger.ts)                  │
│ • Receives decision_made                                    │
│ • Writes to EventBus                                        │
└──────────────────┬──────────────────────────────────────────┘
                   │ [event object]
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ EVENT BUS (src/core/events/bus.ts)                        │
│ • Broadcasts event to subscribers                          │
│ • EventStore listens                                       │
│ • Dashboard WebSocket listeners activate                   │
└──────────────────┬──────────────────────────────────────────┘
                   │ [event broadcast]
        ┌──────────┼──────────┐
        │          │          │
        ↓          ↓          ↓
      SQL      Memory      WebSocket
        │          │          │
        ↓          ↓          ↓
    SQLite    Recall      Dashboard
                            (browser)
                            │
                            ↓
                    ┌──────────────────┐
                    │ FOCUS Tab        │
                    │ renderFocus()    │
                    │                  │
                    │ [Live reasoning] │
                    │ [Prediction]     │
                    │ [Tool]           │
                    │ [Context]        │
                    └──────────────────┘
```

**New Stream Path (Intermediate Reasoning):**

```
Model reasoning chunks
    ↓
ModelAdapter (IF streaming support exists)
    ↓
HookRegistry: 'reasoning:chunk'
    ↓
Engine (new listener): 'reasoning:chunk'
    ↓
EventLogger.reasoningUpdated()
    ↓
EventBus.emit('reasoning_updated')
    ↓
WebSocket → Dashboard
    ↓
FOCUS.renderReasoning() (live update, no refresh needed)
```

---

## Part 4: Model/Provider Capability Matrix

| Model | Provider | Intermediate Reasoning | Format | Streaming | Status |
|-------|----------|------------------------|--------|-----------|--------|
| DeepSeek V3 | Deepseek API | ✅ Yes (thinking_content) | JSON field | ✅ Batched | Ready |
| o1-preview | OpenAI | ✅ Yes (via content_block) | Delta chunks | ✅ Yes | Ready |
| o1-mini | OpenAI | ✅ Yes (via content_block) | Delta chunks | ✅ Yes | Ready |
| Claude 3.5 | Anthropic | ⏳ Extended thinking (beta) | Not yet | ? | Future |
| Llama 3.1 | Meta | ❌ No | N/A | N/A | Not supported |
| Mixtral | Mistral | ❌ No | N/A | N/A | Not supported |

**Recommendation:** Start with DeepSeek V3 (already using it), migrate OpenAI models to o1 for production reasoning.

---

## Part 5: Proof-of-Concept Architecture

### Phase 1: Capture Intermediate Reasoning (DeepSeek)

**Goal:** Emit `reasoning_updated` events as chunks arrive

**Implementation Points:**

1. **ModelAdapter Enhancement**
   - File: `src/core/llm/model-adapter.ts`
   - Add handler for `reasoning_content` in DeepSeek response parsing
   - Emit hook: `HookRegistry.emit('reasoning:chunk', { chunk, fullSoFar })`

2. **Hook Integration**
   - File: `src/core/hooks.ts`
   - Add new hook type: `'reasoning:chunk'`
   - Signature: `(chunk: string, fullReasoning: string, model: string) => void`

3. **Engine Listener**
   - File: `src/core/engine/engine.ts`
   - Add `this.agent.onEvent('reasoning:chunk', async (data) => { ... })`
   - Emit EventLogger call: `this.eventLogger.reasoningUpdated(taskId, decisionId, chunk, fullReasoning)`

4. **EventLogger Addition**
   - File: `src/core/events/logger.ts`
   - New method: `reasoningUpdated(taskId, decisionId, chunk, fullReasoning, model, charCount)`
   - Writes to EventBus: `{ type: 'reasoning_updated', payload: { ... } }`

5. **EventStore/DB**
   - File: `src/core/events/store.ts`
   - Store reasoning_updated events like other events
   - Query optimization: Aggregate multiple reasoning_updated per decisionId

### Phase 2: Dashboard Live Rendering

**Goal:** FOCUS tab updates in real-time with streaming reasoning

**Implementation Points:**

1. **WebSocket Handler**
   - Already exists in `src/dashboard/app.js`
   - Add case for `'reasoning_updated'`
   - Trigger: `renderReasoningLive(event.payload)`

2. **New Render Function**
   - File: `src/dashboard/app.js`
   - Function: `renderReasoningLive(chunk, fullReasoning, charCount)`
   - Update focus-thought element with live typing animation
   - Append chunk text with fade-in

3. **Animation**
   - CSS: `.focus-thought.streaming` — typing cursor animation
   - Update charCount display: "1,247 chars..." ✍️

4. **Fallback**
   - If no reasoning_updated events → use current decision_made snapshot
   - Graceful degradation for non-streaming models

---

## Part 6: Event Schemas (JSON Schema)

### reasoning_started

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "taskId", "decisionId", "timestamp", "payload"],
  "properties": {
    "type": { "const": "reasoning_started" },
    "taskId": { "type": "string", "format": "uuid" },
    "decisionId": { "type": "string", "format": "uuid" },
    "timestamp": { "type": "integer", "minimum": 0 },
    "payload": {
      "type": "object",
      "required": ["model", "provider", "cycleNum"],
      "properties": {
        "model": { "type": "string", "enum": ["deepseek-v3", "o1-preview", "o1-mini"] },
        "provider": { "type": "string" },
        "cycleNum": { "type": "integer", "minimum": 1 },
        "expectedDuration": { "type": "integer", "nullable": true }
      }
    }
  }
}
```

### reasoning_updated

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "taskId", "decisionId", "timestamp", "payload"],
  "properties": {
    "type": { "const": "reasoning_updated" },
    "taskId": { "type": "string", "format": "uuid" },
    "decisionId": { "type": "string", "format": "uuid" },
    "timestamp": { "type": "integer" },
    "payload": {
      "type": "object",
      "required": ["chunk", "fullReasoning", "charCount", "model"],
      "properties": {
        "chunk": { "type": "string", "description": "Latest incremental chunk" },
        "fullReasoning": { "type": "string", "description": "Complete reasoning so far" },
        "charCount": { "type": "integer", "minimum": 0 },
        "percentComplete": { "type": "number", "minimum": 0, "maximum": 100, "nullable": true },
        "model": { "type": "string" }
      }
    }
  }
}
```

### reasoning_finished

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "taskId", "decisionId", "timestamp", "payload"],
  "properties": {
    "type": { "const": "reasoning_finished" },
    "taskId": { "type": "string", "format": "uuid" },
    "decisionId": { "type": "string", "format": "uuid" },
    "timestamp": { "type": "integer" },
    "payload": {
      "type": "object",
      "required": ["reasoning", "charCount", "durationMs", "model"],
      "properties": {
        "reasoning": { "type": "string" },
        "charCount": { "type": "integer" },
        "durationMs": { "type": "integer", "minimum": 0 },
        "model": { "type": "string" },
        "decision": { "type": "string", "nullable": true },
        "confidence": { "type": "number", "minimum": 0, "maximum": 1, "nullable": true }
      }
    }
  }
}
```

---

## Part 7: Example Payloads

### Real Scenario: JWT Middleware Decision

**Timeline:**
1. User asks: "Build FastAPI service with JWT"
2. Agent enters ReAct cycle 1
3. Model (DeepSeek V3) begins thinking

**Event Stream:**

```javascript
// T+0ms: Reasoning starts
{
  type: 'reasoning_started',
  taskId: 'task-001',
  decisionId: 'decision-123',
  timestamp: 1718892215123,
  payload: {
    model: 'deepseek-v3',
    provider: 'deepseek',
    cycleNum: 1
  }
}

// T+150ms: First chunk arrives
{
  type: 'reasoning_updated',
  taskId: 'task-001',
  decisionId: 'decision-123',
  timestamp: 1718892215273,
  payload: {
    chunk: "I need to build a FastAPI service with JWT authentication. Let me think about the architecture:\n\n1. JWT tokens require:",
    fullReasoning: "I need to build a FastAPI service with JWT authentication. Let me think about the architecture:\n\n1. JWT tokens require:",
    charCount: 109,
    model: 'deepseek-v3'
  }
}

// T+300ms: Second chunk
{
  type: 'reasoning_updated',
  taskId: 'task-001',
  decisionId: 'decision-123',
  timestamp: 1718892215423,
  payload: {
    chunk: " a secret key, encoding/decoding logic, and middleware to validate on every request.\n2. FastAPI has built-in support for ",
    fullReasoning: "I need to build a FastAPI service with JWT authentication. Let me think about the architecture:\n\n1. JWT tokens require: a secret key, encoding/decoding logic, and middleware to validate on every request.\n2. FastAPI has built-in support for ",
    charCount: 234,
    model: 'deepseek-v3'
  }
}

// T+500ms: Final chunk
{
  type: 'reasoning_updated',
  taskId: 'task-001',
  decisionId: 'decision-123',
  timestamp: 1718892215623,
  payload: {
    chunk: "HTTPBearer and dependency injection.\n3. I should search for existing JWT patterns to avoid reinventing.",
    fullReasoning: "I need to build a FastAPI service with JWT authentication. Let me think about the architecture:\n\n1. JWT tokens require: a secret key, encoding/decoding logic, and middleware to validate on every request.\n2. FastAPI has built-in support for HTTPBearer and dependency injection.\n3. I should search for existing JWT patterns to avoid reinventing.",
    charCount: 346,
    percentComplete: 95,
    model: 'deepseek-v3'
  }
}

// T+600ms: Reasoning completes
{
  type: 'reasoning_finished',
  taskId: 'task-001',
  decisionId: 'decision-123',
  timestamp: 1718892215723,
  payload: {
    reasoning: "I need to build a FastAPI service with JWT authentication. Let me think about the architecture:\n\n1. JWT tokens require: a secret key, encoding/decoding logic, and middleware to validate on every request.\n2. FastAPI has built-in support for HTTPBearer and dependency injection.\n3. I should search for existing JWT patterns to avoid reinventing.",
    charCount: 346,
    durationMs: 600,
    model: 'deepseek-v3',
    decision: 'Search knowledge base for JWT patterns',
    confidence: 0.87
  }
}

// T+620ms: Decision made
{
  type: 'decision_made',
  taskId: 'task-001',
  decisionId: 'decision-123',
  timestamp: 1718892215743,
  payload: {
    decision: 'Call search_knowledge_graph',
    reason: 'Looking for existing JWT middleware patterns to avoid duplication.',
    reasoningSnippet: "I need to build a FastAPI service with JWT authentication. Let me think about the architecture:\n\n1. JWT tokens require: a secret key, encoding/decoding logic, and middleware to validate on every request.\n2. FastAPI has built-in support for HTTPBearer and dependency injection.\n3. I should search for existing JWT patterns to avoid reinventing.",
    nextAction: 'execute search_knowledge_graph',
    confidence: 0.87
  }
}
```

**Dashboard Display (FOCUS Tab, Real-Time):**

```
T+0ms:    [No reasoning yet...]
T+150ms:  [I need to build a FastAPI service with JWT authentication...
           109 chars ✍️]
T+300ms:  [I need to build a FastAPI service with JWT authentication. Let me think about the architecture:
           
           1. JWT tokens require: a secret key, encoding/decoding logic, and middleware...
           234 chars ✍️]
T+500ms:  [I need to build a FastAPI service with JWT authentication. Let me think about the architecture:
           
           1. JWT tokens require: a secret key, encoding/decoding logic, and middleware to validate...
           346 chars ✍️ (95%)]
T+600ms:  [Complete reasoning displayed]
           Next: Search knowledge base for JWT patterns
           Confidence: 87%
T+620ms:  [Same, but decision_made event triggers tool execution...]
```

---

## Part 8: Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Models don't stream intermediate reasoning | Medium | High | Fallback to decision_made snapshot; graceful degradation |
| Event spam (too many reasoning_updated) | High | Medium | Batch chunks every 100ms; throttle WebSocket broadcasts |
| DB insert lag with many events | Low | Medium | Index on (taskId, decisionId, type); async writes |
| WebSocket connection lost mid-reasoning | Low | Medium | Cache last N reasoning events; client reconnect fetches backlog |
| Reasoning text very large (100k+ chars) | Low | Medium | Cap chunk to 5KB; truncate fullReasoning in payload to 50KB |
| Model changes reasoning format | Medium | Medium | Adapter detection logic; fallback parsers for each model |
| User perception: "Agent thinks too slowly" | High | Low | Show char count, duration, "90% complete" feedback |

---

## Part 9: Migration Plan

### Phase 1: Event Definitions (1–2 hours)
1. Add event types to `src/core/events/factory.ts`
2. Add EventLogger methods for reasoning events
3. Update TypeScript types in `src/core/types.ts`
4. Add SQLite schema for reasoning_updated, reasoning_finished

### Phase 2: ModelAdapter Integration (2–3 hours)
1. Identify where DeepSeek returns `reasoning_content`
2. Add hook emission in model-adapter.ts
3. Test with actual DeepSeek API call
4. Verify reasoning_content is being captured

### Phase 3: Engine Listener (1–2 hours)
1. Add `onEvent('reasoning:chunk')` listener in engine.ts
2. Call `eventLogger.reasoningUpdated()`
3. Route to EventBus
4. Test event flow end-to-end

### Phase 4: Dashboard Integration (2–3 hours)
1. Add WebSocket handler for `'reasoning_updated'`
2. Implement `renderReasoningLive()` function
3. Add CSS animation for streaming text
4. Test with live model call

### Phase 5: Testing & Refinement (2–3 hours)
1. Load testing: high-frequency reasoning_updated events
2. Network resilience: WebSocket reconnect during reasoning
3. UI responsiveness: smooth animation even with 10KB chunks
4. Fallback behavior: verify graceful degradation

**Total Effort:** 8–13 hours (1–2 days)

---

## Part 10: Success Criteria

✅ Reasoning updates appear in FOCUS tab in real-time (< 200ms latency from model to UI)  
✅ Live typing animation visible as reasoning develops  
✅ No polling; event-driven only  
✅ Fallback to decision_made snapshot if no streaming events  
✅ Character count displayed and updates live  
✅ Duration shown (e.g., "600ms thinking")  
✅ Graceful degradation for non-streaming models  
✅ Zero data loss; all reasoning events persisted in SQLite  
✅ WebSocket reconnect recovers missed reasoning events  

---

## Part 11: Next Steps (After Approval)

1. **Decision:** Approve streaming reasoning architecture?
2. **Decision:** Start with DeepSeek V3, plan OpenAI o1 migration?
3. **Decision:** Buffer reasoning chunks or emit individually?
4. **Implementation:** Phase 1 (event definitions)
5. **Testing:** Live reasoning updates in FOCUS
6. **Feedback:** User observes agent "thinking in real-time"

---

## Appendix: File Impact Map

| File | Current LOC | Change | Reason |
|------|-------------|--------|--------|
| src/core/events/factory.ts | ~200 | +40 | Add reasoning event methods |
| src/core/events/logger.ts | ~150 | +20 | New reasoningUpdated() method |
| src/core/llm/model-adapter.ts | ~300 | +30 | Hook emission for chunks |
| src/core/engine/agent.ts | ~500 | +10 | Minor event labeling |
| src/core/engine/engine.ts | ~630 | +50 | New reasoning:chunk listener |
| src/core/hooks.ts | ~100 | +5 | Add reasoning:chunk hook |
| src/core/types.ts | ~200 | +15 | New event types |
| src/core/events/store.ts | ~150 | +5 | Insert reasoning events |
| src/dashboard/app.js | ~1,137 | +80 | renderReasoningLive(), WebSocket handler |
| src/dashboard/styles.css | ~1,200 | +30 | Streaming animation (.focus-thought.streaming) |

**Total New Code:** ~280 LOC  
**Effort:** 8–13 hours

---

**End of Proposal**

**Status:** Ready for user review and approval before Phase 1 implementation.
