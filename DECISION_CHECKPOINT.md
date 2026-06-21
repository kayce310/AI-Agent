# Coral Roadmap — Decision Checkpoint

**Current Status:** Phase 2.3 COMPLETE (505/505 tests)  
**Date:** 2026-06-21 10:35 UTC  
**Session Runtime:** ~55 minutes (Phase 2.3 integration)  

---

## ✅ Phase 2.3 Delivered

- [x] SessionManager wired into TelegramBridge
- [x] Session-aware intro dedup (15-min TTL)
- [x] /start, message:text, channel_post:text all session-aware
- [x] Cross-instance deduplication maintained
- [x] Resource cleanup in stop()
- [x] 505/505 tests PASS
- [x] Production-ready Telegram integration

---

## 🛣️ Next Phase Options (Choose One)

### Option 1: Phase 2.3.1 — Webhook Integration (1-2 hours)
**Why:** Replace long polling with Telegram webhooks
- Faster message delivery (webhook push vs 30s polling)
- Reduced server load (especially at scale)
- Production deployment ready
- Requires HTTPS endpoint setup

**Deliverable:**
- Webhook route handler in start-telegram.ts
- Graceful fallback to polling if webhook fails
- Production-ready for cloud deployment

---

### Option 2: Phase 3 — Knowledge Graph (3-4 hours)
**Why:** Enable persistent learning & semantic understanding
- Entity relationships (who, what, when, where)
- Conversation memory across sessions
- Semantic search capabilities
- Smart context retrieval for future conversations

**Scope:**
- Graph database schema (entities, relationships)
- Knowledge extraction from conversations
- Semantic query interface
- Integration with memory system

**Complexity:** Medium-High (new domain pattern)

---

### Option 3: Phase 4 — Smart Home Integration (2-3 hours)
**Why:** Enable real-time device control via Telegram
- Wire Xiaomi devices to existing SmartHomeManager
- Device discovery & status queries
- Voice-friendly control commands
- Scene automation

**Scope:**
- SmartHomeManager device binding
- Telegram command handlers (/devices, /scene, /control)
- Real-time status feedback
- Error handling for unavailable devices

**Complexity:** Medium (integration-heavy)

---

## 📊 Codebase Health

```
Files:    77 TypeScript files
LOC:      17,819 lines
Tests:    505 passing
Modules:  14 main domains
Commits:  92 ahead of origin

Recent Session:
├─ Phase 2.2.1: SessionManager + TelegramMessageHandler (32 new tests)
└─ Phase 2.3: TelegramBridge integration (505/505 PASS, no regression)
```

---

## 💡 Recommendation Matrix

| Phase | Time | Impact | Complexity | Risk |
|-------|------|--------|-----------|------|
| **2.3.1** Webhooks | 1-2h | Medium (perf) | Low | Low |
| **3** Knowledge Graph | 3-4h | High (UX) | High | Medium |
| **4** Smart Home | 2-3h | High (feature) | Medium | Low |

**My Take:**
- **Phase 3** = biggest UX leap (persistent conversation context)
- **Phase 2.3.1** = production readiness (webhooks for scale)
- **Phase 4** = immediate user value (smart home control from Telegram)

---

## 🎯 Your Call

Which direction?

1. **Phase 2.3.1** — Webhooks (production hardening)
2. **Phase 3** — Knowledge Graph (intelligence boost)
3. **Phase 4** — Smart Home (feature completeness)
4. **Parallel** — Multiple phases simultaneously (need subagents)

**You choose. I execute.**
