# Phase 2.2.1 Kickoff: Engine Integration

**Status:** Ready to Start  
**Estimated Duration:** 2-3 hours  
**Success Criteria:** Engine emits observability events, <5% performance overhead

---

## 📋 Checklist

### Step 1: Import & Initialize (30 min)

- [ ] Import ObservabilityIntegration in src/core/engine/engine.ts
- [ ] Add observability config to Engine constructor
- [ ] Initialize on engine.init()
- [ ] Add shutdown hook to engine.shutdown()
- [ ] Verify no startup regressions

### Step 2: Wire Tool Executor (45 min)

- [ ] Find where tools are executed (tool-executor or agent.ts)
- [ ] Wrap execution with try-catch
- [ ] Record start time, end time, duration
- [ ] Call observability.recordToolCall() on success
- [ ] Call observability.recordError() on failure
- [ ] Verify tool execution still works

### Step 3: Wire LLM Adapter (45 min)

- [ ] Find LLM calls in model-adapter.ts
- [ ] Wrap LLM calls with duration tracking
- [ ] Extract token usage from response
- [ ] Call observability.recordLLMResponse()
- [ ] Handle streaming responses (if applicable)
- [ ] Verify LLM latency not degraded

### Step 4: Wire Memory Store (30 min)

- [ ] Find memory operations (store, retrieve, update, delete)
- [ ] Record operation start/end time
- [ ] Track success/failure
- [ ] Call observability.recordMemoryUpdate()
- [ ] Verify memory latency <2ms overhead

### Step 5: Health Monitor (30 min)

- [ ] Find existing health check code (if any)
- [ ] Record system status (healthy/degraded/unhealthy)
- [ ] Track memory usage (process.memoryUsage())
- [ ] Track uptime (process.uptime())
- [ ] Call observability.recordHealthCheck() every 5 min

### Step 6: REST API Integration (30 min)

- [ ] Add observability router to express server
- [ ] Mount at `/api/observability/*`
- [ ] Verify endpoints respond
- [ ] Test pagination on /events
- [ ] Test dashboard endpoint

### Step 7: Testing (30 min)

- [ ] Write integration test: engine startup + tool call → event
- [ ] Verify events appear in EventStore
- [ ] Verify metrics aggregation works
- [ ] Verify no performance regression (<5% overhead)
- [ ] Test disabled mode (observability: false)

### Step 8: Documentation (20 min)

- [ ] Update PHASE_2_2_1_DELIVERABLE.md
- [ ] Commit with message: "Phase 2.2.1: Engine observability hooks (tool/LLM/memory/health)"
- [ ] Update README with observability docs

---

## 🎯 Key Integration Points

**Tool Executor:**
```typescript
const start = Date.now();
try {
  const result = await executeTool(toolName, args);
  await observability.recordToolCall({
    tool: toolName,
    input: args,
    duration: Date.now() - start,
    success: true,
    output: result,
  });
  return result;
} catch (err) {
  await observability.recordToolCall({
    tool: toolName,
    input: args,
    duration: Date.now() - start,
    success: false,
    error: err.message,
  });
  throw err;
}
```

**LLM Adapter:**
```typescript
const start = Date.now();
const response = await this.modelRouter.route(messages, options);
await observability.recordLLMResponse({
  model: response.model,
  prompt: messages.map(m => m.content).join('\n'),
  response: response.content,
  tokens: { input: response.inputTokens, output: response.outputTokens, total: response.totalTokens },
  duration: Date.now() - start,
});
return response;
```

**Memory Store:**
```typescript
const start = Date.now();
try {
  const result = await this.store(key, value);
  await observability.recordMemoryUpdate({
    operation: 'store',
    key,
    duration: Date.now() - start,
    success: true,
  });
  return result;
} catch (err) {
  await observability.recordMemoryUpdate({
    operation: 'store',
    key,
    duration: Date.now() - start,
    success: false,
    error: err.message,
  });
  throw err;
}
```

---

## ✅ Pre-Conditions

- [x] EventStore implemented (17 tests ✅)
- [x] MetricsCollector implemented (16 tests ✅)
- [x] ObservabilityAPI defined (9 endpoints ✅)
- [x] ObservabilityIntegration bridge (17 tests ✅)
- [x] All 473 tests passing ✅

---

## 🚫 Pitfalls to Avoid

1. **Performance Hit** — Don't await observability on critical path
   - Use fire-and-forget or background queue
   - Observability should <1% overhead

2. **Circular Dependencies** — Don't import engine in observability
   - Observability is independent of engine
   - Engine imports observability, not vice versa

3. **Uninitialized Access** — Check observability.isEnabled()
   - In tests, observability might be disabled
   - Always check before recording

4. **Memory Leaks** — Don't keep references to events
   - EventStore handles cleanup
   - Only store metrics in memory temporarily

5. **Silent Failures** — Observability errors should log, not crash
   - Already handled in ObservabilityIntegration
   - Verify no unhandled promises

---

## 🔍 Verification Commands

```bash
# Run all tests
npm test

# Run only observability tests
npm test -- observability

# Check performance (baseline → after)
time npm run build

# Search for observability calls
grep -r "recordToolCall" src/

# Check memory usage
node --inspect src/index.ts
```

---

## 📊 Success Metrics

- [ ] All 473 tests still passing
- [ ] Engine startup time <50ms overhead
- [ ] Tool execution <1% overhead
- [ ] LLM response latency <2% overhead
- [ ] Memory operations <1ms overhead
- [ ] Dashboard API responds <500ms
- [ ] No memory leaks (stable heap over time)

---

## 🎓 For Kayce: Learning Objectives

This phase teaches:
1. **Instrumentation** — Adding observability without breaking core logic
2. **Non-Blocking I/O** — Why fire-and-forget for metrics?
3. **Separation of Concerns** — Observability layer independent from business logic
4. **Error Resilience** — Observability failures shouldn't crash the engine
5. **Performance Profiling** — Measuring overhead of new features

**Reading:** Observability Engineering Ch 5-6 (instrumenting code)

---

**Status:** 🟢 READY TO START  
**Blocking:** None  
**Estimated Completion:** 2026-06-21 afternoon
