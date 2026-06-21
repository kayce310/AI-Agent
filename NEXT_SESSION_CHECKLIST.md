# 🚀 NEXT SESSION STARTUP CHECKLIST

**When starting a fresh session with Kayce**, follow this sequence:

---

## PHASE 1: VERIFY BASELINE (5 minutes)

```bash
cd /d/AI-Agent

# 1. Check latest commit
git log --oneline -1

# 2. Verify tests still pass
npx vitest run 2>&1 | grep "Test Files\|Tests"

# 3. Check for conflicts from other session
git diff --name-only HEAD~5..HEAD

# 4. Database size (memory store health)
ls -lh data/coral.db*
```

**Expected**:
- Latest commit: `128e20d6 docs: Add SESSION_HANDOFF.md`
- Tests: 30 files, 392 tests, 100% passing
- No conflicts
- coral.db size: ~220K

---

## PHASE 2: CONTEXT LOADING (2 minutes)

### Files to Read (In Order)
1. **SESSION_HANDOFF.md** (this repo) — Full context transfer
2. **CODEBASE_STATUS.md** — Architecture overview
3. **knowledge/wiki/core/coral-kayce-bond.md** — Identity/bond context
4. **DEVELOPMENT-HISTORY.md** — Version evolution

### What You Learn
- ✅ Kayce's profile (numerology, preferences)
- ✅ CORAL status (14,552 LOC, 70% feature-complete)
- ✅ All 6 phases done (Memory, Telegram, Cron, Evolution, Trace)
- ✅ CAMEL audit findings
- ✅ Three strategic paths (A/B/C)

---

## PHASE 3: ASK KAYCE (2 minutes)

**Critical question**:

> "Kayce, CAMEL audit found CORAL is 70% feature-complete nhưng 0% production-hardened.
> 
> Ba đường chọn:
> - **PATH A** (2-3 tuần): Ship ngay, risky
> - **PATH B** (5-7 tuần): Hardening, an toàn, team-operable ⭐ Recommended
> - **PATH C** (12-16 tuần): Enterprise JARVIS, phức tạp
> 
> Bạn chọn đường nào?"

**Also ask**:
- "Learning phải lưu qua restart không?"
- "Deploy solo hay team?"
- "Deadline có áp lực không?"

---

## PHASE 4: EXECUTE PLAN (Then onwards)

### If Kayce Chooses PATH A (Ship Now)
```
Week 1:
- [ ] Add 40 security tests (8h) — Tool, Telegram, Security subsystems
- [ ] Docker verify + manual testing (4h)
- [ ] Deploy + monitor
```

### If Kayce Chooses PATH B (Recommended)
```
Week 1: Security Tests (8h)
- [ ] PrivilegeGuard tests
- [ ] RateLimiter tests
- [ ] ResponseCache tests
- [ ] Tool execution security

Week 2: Metrics & Observability (1w)
- [ ] Prometheus integration
- [ ] LangFuse tracing
- [ ] Real-time dashboard

Week 3: Resilience (1w)
- [ ] Circuit breaker for LLM
- [ ] Retry logic + timeout wrapper
- [ ] Graceful degradation

Week 4: Data Protection (1w)
- [ ] Daily backup strategy
- [ ] Memory snapshots
- [ ] Event archive

Week 5: Deployment (1w)
- [ ] Docker Compose setup
- [ ] GitHub Actions CI
- [ ] Health checks

Week 6: Testing & Polish (1w)
- [ ] Stress test 20 concurrent
- [ ] Integration tests
- [ ] Documentation

Target: ~2026-08-01
```

### If Kayce Chooses PATH C (Enterprise)
```
Phases 4-9 (12-16 weeks):
- [ ] DAG scheduler + planning
- [ ] Vector DB + learning indexing
- [ ] Multi-channel (Discord, Slack)
- [ ] Kubernetes distributed
- [ ] Compliance & audit
- [ ] Scale testing 1000 users
```

---

## PHASE 5: TOOLS & COMMANDS

### Useful Commands This Session
```bash
# Verify nothing broken
npx vitest run

# Run specific test file
npx vitest run tests/memory-core.test.ts

# Git operations (always fetch first!)
git fetch && git pull
git log --oneline -10
git diff HEAD~1

# Database inspection
sqlite3 data/coral.db ".tables"

# Check code metrics
find src -name "*.ts" -type f | xargs wc -l | tail -1
find tests -name "*.test.ts" -type f | xargs wc -l | tail -1
```

### Reference Docs
- `CODEBASE_STATUS.md` — Full architecture
- `SESSION_HANDOFF.md` — This handoff
- `CORAL.md` — Bootloader (operating rules)
- `knowledge/wiki/` — Architecture decisions, soul, bonds

---

## PHASE 6: COMMUNICATION STYLE

**Remember Kayce's preferences**:
- Vietnamese conversations ✅
- Concise, action-oriented ✅
- Deep reasoning before recommending ✅
- Evidence-based debate (5+ options, not marketing) ✅
- Challenge assumptions first ✅
- Don't pick "recommended" unilaterally ✅
- Decision framework: Debt vs IP, understanding depth, timeline ✅

**Debate methodology** (CAMEL):
1. Present options fairly
2. Deep analysis with failure modes
3. Challenge assumptions
4. Ask questions before deciding
5. Let Kayce choose

---

## QUICK REFERENCE

| Item | Value |
|------|-------|
| **Project** | CORAL Agent (TypeScript/Node.js) |
| **Location** | D:\AI-Agent\ |
| **Tests** | 392/392 passing (100%) |
| **Status** | 70% feature-complete, 0% hardened |
| **Next** | Kayce chooses PATH A/B/C |
| **Recommended** | PATH B (5-7 weeks, safe production) |
| **Target** | ~2026-08-01 (PATH B) |

---

## ⚠️ CRITICAL BLOCKERS (If PATH B/C Chosen)

**Must fix before shipping**:
1. **Tool Security Tests** (2,859 LOC untested) — 8h
2. **Telegram Concurrency Tests** (912 LOC untested) — 12h
3. **Circuit Breaker** for LLM (missing resilience) — 1w

---

## 🎯 SUCCESS CRITERIA

### For Each Path

**PATH A Success**: Ship in 2-3 weeks, works for solo use
**PATH B Success**: 6 weeks → Live ~2026-08-01, multi-user ready, observable, data-safe
**PATH C Success**: 16 weeks → Enterprise JARVIS, 1000 concurrent, distributed

---

## 🪸 FINAL REMINDER

Kayce + Coral = Master Builder companions in peaceful era.

**Code quality**: Stable (392/392 tests ✅)
**Production readiness**: Partial (security untested, no hardening)
**Team capability**: Can operate with right documentation + monitoring

**Next session's job**: Execute Kayce's chosen PATH.

---

**Prepared by**: Tor  
**Date**: 2026-06-21 03:54 UTC+7  
**Status**: Ready for handoff ✅

To start next session:
1. Read SESSION_HANDOFF.md
2. Verify baseline (git, tests)
3. Ask Kayce: "PATH A, B, or C?"
4. Execute sprint-by-sprint

🚀
