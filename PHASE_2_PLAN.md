# Phase 2: Observability & Telegram Integration

**Duration:** 6-8 weeks  
**Theme:** Make Coral observable, add single-platform (Telegram), enable proactive monitoring  
**Goal:** Minimum Viable JARVIS (MVJ) ready for autonomous deployment

---

## Phase 2 Objectives

### 2.1 Observability Layer (3 weeks)
**What:** Event sourcing, audit trails, metrics, dashboards

**Deliverables:**
- [ ] Event Store: Centralized log for all agent decisions + tool calls
- [ ] Metrics: Token usage, response latency, error rates, memory churn
- [ ] Dashboard: Real-time status view (REST API + simple HTML)
- [ ] Audit Trail: Immutable log for security compliance
- [ ] Alerting: Anomaly detection (unusual token spikes, crash loops)

**Tests:**
- Event ordering (out-of-order event handling)
- Metrics accuracy (token counting, latency measurement)
- Dashboard data consistency
- Audit trail immutability

**Why:** Self-evolution requires observation. Can't improve what you can't measure.

---

### 2.2 Telegram Integration (2-3 weeks)
**What:** Single reliable platform to start JARVIS

**Deliverables:**
- [ ] Telegram Bot Handler: @coral_agent webhook receiver
- [ ] Message Routing: User → SessionId mapping
- [ ] Rich Formatting: Markdown, buttons, inline keyboards
- [ ] Error Handling: Graceful degradation on API failures
- [ ] Rate Limiting: Per-user + global Telegram API limits

**Tests:**
- Message receipt + reply (happy path)
- Concurrent user sessions (isolation)
- Long-running requests (streaming responses)
- Network failure recovery
- Rate limit enforcement

**Why:** Telegram is simpler than voice/vision. Master one platform first.

---

### 2.3 Proactive Monitoring (1-2 weeks)
**What:** Cron-based health checks + memory maintenance

**Deliverables:**
- [ ] Health Check Job: CPU, memory, disk usage every 5 min
- [ ] Memory Maintenance: Prune old memories (TTL-based expiry)
- [ ] Crash Recovery: Auto-restart on unhandled exception
- [ ] State Snapshot: Periodic save of engine state
- [ ] Alerts to User: Telegram notification on anomalies

**Tests:**
- Cron job scheduling accuracy
- Memory expiry timing
- Crash detection + restart
- State snapshot integrity
- Alert delivery

**Why:** JARVIS runs autonomously. Must self-heal.

---

## Implementation Order

### Week 1-3: Observability
1. **Event Store** (done first, used by everything)
2. **Metrics Collection** (hook into engine)
3. **Dashboard** (REST API endpoint)
4. **Audit Trail** (immutable append-log)

### Week 4-5: Telegram
1. **Bot Setup** (webhook receiver)
2. **Message Routing** (sessionId tracking)
3. **Rich UI** (formatting, buttons)
4. **Error Handling** (graceful degradation)

### Week 6-7: Proactive Monitoring
1. **Cron Jobs** (health check, memory cleanup)
2. **Crash Recovery** (supervision)
3. **State Snapshots** (durability)
4. **User Alerts** (Telegram notifications)

---

## Testing Strategy

**Phase 2 Test Coverage Target:** 80%+ of new code

**Test Types:**
- Unit: Event store operations, metrics calculations
- Integration: Engine → Event store → Dashboard
- E2E: Telegram message → Engine → Response → Telegram
- Load: 10 concurrent users, sustained for 1 hour
- Chaos: Network failures, out-of-order events, crashes

**CAMEL Evaluation:** After Phase 2, run debate with focus on:
- "Is observability sufficient for autonomous operation?"
- "Are Telegram failures handled gracefully?"
- "Does crash recovery work reliably?"

---

## Success Criteria

✅ **Observability:**
- 100% of engine events logged
- Metrics accurate to ±5%
- Dashboard updates <1s delay
- Audit trail immutable

✅ **Telegram:**
- All message types handled (text, files, locations)
- <500ms response latency
- Zero dropped messages in 48h test
- Graceful recovery from API downtime

✅ **Monitoring:**
- Health check runs reliably every 5 min
- Memory cleanup removes 100% of expired blocks
- Crash recovery succeeds >99% of time
- State snapshots verifiable

✅ **Tests:**
- 450+ total tests (was 425, +25+)
- Zero new regressions
- Coverage ≥80% for Phase 2 code

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Telegram API throttling | High | Implement queue + backoff |
| Event store scaling (large logs) | Medium | Snapshot + rotation strategy |
| Crash loop (restart too fast) | High | Exponential backoff on restart |
| Memory cleanup blocking engine | Medium | Run cleanup async, small batches |
| Out-of-order events breaking state | High | Event ordering tests + reordering logic |

---

## Kayce's Learning Goals (Phase 2)

1. **Observability Design:** Why is event sourcing better than logging?
2. **State Management:** How does Telegram routing maintain session isolation?
3. **Resilience:** What makes crash recovery reliable?
4. **Measurement:** Why are metrics needed for self-evolution?

---

## Dependencies & Blockers

**None:** Phase 2 builds on Phase 1 foundation (stable, tested, documented)

---

## Deliverables Summary

- [ ] Event Store (100% coverage, immutable)
- [ ] Metrics API (dashboard data)
- [ ] Telegram Bot (single-platform)
- [ ] Health Check Cron (proactive monitoring)
- [ ] Phase 2 Test Suite (80%+ coverage)
- [ ] CAMEL Evaluation (post-Phase-2)

---

**Status:** Phase 2 Ready ✅  
**Estimated Start:** 2026-06-22  
**Estimated Completion:** 2026-08-02 (6 weeks)  
**Next Checkpoint:** Week 2 (Observability API ready)
