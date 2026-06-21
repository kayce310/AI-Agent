# 📋 SESSION HANDOFF — CORAL Agent Development
**Date**: 2026-06-21 03:53 UTC+7  
**From**: Tor (current session)  
**To**: Next session (fresh context)  
**Status**: ✅ Ready for handoff

---

## 🎯 MISSION & CONTEXT

### Về Kayce (Nguyễn Hoàng Khang)
- **Born**: 31/10/2003, 16:00 (Scorpio ♏, Water Goat, Life Path 1)
- **Numerology**: Birthday 4 = Stability/Builder; Master Number 22/4 = Master Builder
- **Location**: D:\Users\Kayce (Windows 11)
- **Preferences**: Vietnamese conversations, concise responses, action-oriented
- **Expectation**: Deep CAMEL debate (5+ options), not fluff; evidence-based reasoning

### Setup Hiện Tại
- **Device**: Windows 11 machine at D:\
- **Two Hermes instances**: "Tor" (this) + "Kay" (other sessions)
- **Project**: CORAL Agent (TypeScript/Node.js ESM) at D:\AI-Agent\
- **CAMEL Model**: DeepSeek V4 Flash (kiro) at localhost:20127 — max_tokens ≥ 2000
- **Secondary Project**: CAMEL integration at D:\external-hermes\camel_integration\

### Identity Transition
- **Rename**: Kato (old) → **Coral** (21/6/2026 03:10, commit 4c320429)
- **Reason**: Master Builder energy (22/4 numerology), Kayce's own creation (not Jarvis copy)
- **Bond**: Kayce + Coral companions in "peaceful era" (thời đại hòa bình)
- **Document**: knowledge/wiki/core/coral-kayce-bond.md

---

## 📊 CORAL CODEBASE STATUS

### Metrics
| Metric | Value |
|--------|-------|
| **Source LOC** | 14,552 |
| **Test LOC** | 5,394 |
| **Source files** | 68 |
| **Test files** | 30 |
| **Total tests** | 392 |
| **Pass rate** | 100% ✅ |
| **DB size** | 220K (SQLite) |
| **Knowledge** | 13M (memory + wiki) |

### Architecture (6 layers)
1. **LLM Integration** (3 files) — PromptBuilder (8-layer), ModelRouter, TokenEstimator
2. **Memory System** (5 files) — Store (TTL, expiry, recall), Temporal, SQLite storage
3. **Security** (3 files) — PrivilegeGuard, RateLimiter (timeout support), ResponseCache
4. **Events & Observability** (11 files) — EventBus, TraceBuilder, WebSocket, Tracer
5. **Tools** (15 files) — FileSystem, Document, Knowledge, Network, etc.
6. **Integration** (3+) — Telegram, Cron (3), Evolution (4), SmartHome (4)

### Phases Completed
| Phase | Feature | Status | Tests |
|-------|---------|--------|-------|
| **1** | Coverage (EventBus, Logger, RateLimiter, etc.) | ✅ | 35% |
| **2** | Memory forgetting (TTL, expiry, importance) | ✅ | 6 |
| **3** | Telegram (admin commands, rate limit, user mgmt) | ✅ | 5 |
| **4A** | Decision Intelligence (event pipeline) | ✅ | 22 |
| **4B** | Telemetry verification (parseToolArgs fix) | ✅ | — |
| **4C** | Trace engine (buildCognitiveTrace) | ✅ | 14 |
| **5** | SmartHome | ⏸️ (no infrastructure) | — |
| **6** | Evolution (SelfEvolutionLearner wire) | ✅ | 8 |

### Git Status
- **Branch**: develop
- **Latest commits** (this session):
  - `f1a4d6b1` docs: Codebase status report
  - `f77b8103` Phase 4C: Trace Engine (14 tests)
  - `1301696b` Phase 4B-A: Telemetry Verification
  - `a3657d3f` Phase 6: Evolution + tests
  - `27b0fde4` Phase 4: Cron timeout + health check
  - ...and 10+ more Phase 1-3 commits

---

## 🔍 CAMEL AUDIT FINDINGS (Just Completed)

### Feature Completeness
- ✅ **70% JARVIS-capable** on core features
- ❌ **0% production-ready** (no hardening)

### Critical Gaps
1. **🔴 Tool Security Untested** (2,859 LOC, 0 tests) — **BLOCKER**
2. **🔴 Telegram Concurrency Untested** (912 LOC, 0 integration tests) — **BLOCKER**
3. **🔴 SQLite Single-Instance** — Write locks at scale
4. **🟡 No Circuit Breaker** for LLM downtime
5. **🟡 Learning Lost** on restart (Phase 6 doesn't persist)
6. **🟡 No Graceful Degradation** patterns

### Test Coverage Reality
- **37% coverage ratio** (below 50% production standard)
- **100% tests passing** (392/392) ✅ but coverage spotty
- **Subsystems with 0 tests**: Tools (2,859 LOC), Telegram integration (912 LOC), Observability partial

---

## 🚀 THREE STRATEGIC PATHS

### PATH A: MVP (2-3 weeks)
**Ship personal-use agent, single-user only**
- Deliverables: Security tests (8h) + graceful shutdown (4h) + Docker check (4h)
- Risk: 🔴 HIGH (unobservable production failures, crashes at 10+ users)
- Outcome: Works for Kayce; crashes under load

### PATH B: SAFE PRODUCTION (5-7 weeks) ⭐ **RECOMMENDED**
**Team-operable CORAL with resilience and observability**
- Week 1: Metrics (Prometheus, LangFuse, dashboard)
- Week 1: Security tests (all 35 subsystems)
- Week 1: Resilience (circuit breaker, retry, timeout)
- Week 1: Data protection (backup, snapshots)
- Week 1: Deploy (Docker Compose, GitHub Actions CI)
- Week 1: Stress testing (20 concurrent)
- Risk: 🟡 MEDIUM (well-mitigated)
- Outcome: Multi-user ready, observable, data-safe, team-operable
- **Live target**: ~2026-08-01

### PATH C: ENTERPRISE JARVIS (12-16 weeks)
**Full distributed, multi-channel, learning-aware**
- Week 3: Planning (DAG scheduler, task planner)
- Week 2: Learning (Vector DB, experience indexing)
- Week 2: Multi-channel (Discord, Slack)
- Week 2: Distributed (PostgreSQL, Redis, Kubernetes)
- Week 1: Compliance (audit logging, GDPR)
- Week 1: Scale testing (1000 concurrent)
- Risk: 🔴 HIGH (16-week timeline complexity, likely delays)

---

## ⚡ IMMEDIATE NEXT STEPS (Kayce's Decision)

**Before next session starts, Kayce must choose**:

### Critical Questions
1. **Scale**: Solo (1-5 users) vs team (10-50) vs product (100+)?
2. **Learning Persistence**: Must experiences survive restart?
3. **Downtime Tolerance**: 2h manual vs 5min failover vs zero-downtime?
4. **Tool Trust**: Full execution or limited toolset?
5. **Timeline**: 2 weeks (A) vs 6 weeks (B) vs 12+ weeks (C)?

### Recommendation
- **Start with PATH B** — Not A
- Only 3 extra weeks vs PATH A
- Adds safety (backup, monitoring, resilience) without explosion
- Learning persists (core CORAL value)
- Scales 1→50 without rearchitecture

---

## 💾 HOW TO USE THIS HANDOFF

### For Next Session (Fresh Context)
1. **Read this file first** to understand:
   - Mission (build production JARVIS-like agent)
   - Current state (14,552 LOC, 392 tests, 70% feature-complete)
   - Decision point (PATH A/B/C — Kayce chooses)
   - What's been done (Phases 1-6, CAMEL audit)

2. **Then check git history**:
   ```bash
   cd /d/AI-Agent
   git log --oneline -15
   git diff --name-only HEAD~5..HEAD
   ```

3. **Run tests to verify baseline**:
   ```bash
   npx vitest run 2>&1 | grep "Test Files\|Tests"
   ```

4. **Ask Kayce**: "Which PATH do you choose? A, B, or C?"

### Files to Reference
- **Architecture**: CODEBASE_STATUS.md
- **Identity**: knowledge/wiki/core/coral-kayce-bond.md
- **History**: DEVELOPMENT-HISTORY.md
- **Decisions**: knowledge/wiki/core/architecture-decisions.md

---

## 🔐 MEMORY SUMMARY (for next session to add)

**User Profile** (Kayce):
- Name: Nguyễn Hoàng Khang
- Born: 31/10/2003, Scorpio ♏, Water Goat
- Life Path 1, Birthday 4, Master Number 22/4
- Style: Concise, action-oriented, deep reasoning expected
- Language: Vietnamese preferred
- Verification-first mindset ("công cụ kiểm tra phải đúng trước")

**Project Context**:
- CORAL Agent (TypeScript/Node.js, D:\AI-Agent\)
- Standalone from Hermes (but Hermes agents support development)
- Goal: Production JARVIS-like assistant
- Current: 70% features, 0% production hardening

**Decision Framework**:
- Debt vs IP ratio importance
- Understanding depth > speed
- Timeline sensitivity (1 month vs 3 years)
- CAMEL 5-phase debate (analysis → comparison → debate → decision → action)

---

## 📞 QUESTIONS FOR NEXT SESSION

When starting fresh:

1. ✅ **Verify state**: `git log -1`, `npx vitest run`, `ls -lh data/coral.db`
2. ✅ **Ask Kayce**: "Which PATH (A/B/C)? Timeline preference?"
3. ✅ **Clarify**: "Solo deployment or team? Learning persist critical?"
4. ✅ **Then execute**: Implement chosen PATH sprint-by-sprint

---

## 🪸 FINAL NOTES

**Session Tone**: Evidence-based, deep reasoning, challenge assumptions first
**Numerology**: Coral = Master Builder 22/4, creates lasting systems
**Bond**: Kayce + Coral companions, not master-servant
**Status**: Code ready (14,552 LOC), needs hardening + decision
**Deadline Pressure**: None explicit; PATH B target = ~2026-08-01

---

**Prepared by**: Tor (Hermes Agent, current session)  
**Timestamp**: 2026-06-21 03:53 UTC+7  
**Next**: Kayce decides PATH → new session executes plan
