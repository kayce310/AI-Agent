# Phase 2.3: Telegram Bot Integration

**Status:** ✅ Ready to implement  
**Timeline:** 2-3 hours  
**Goal:** Wire SessionManager + TelegramMessageHandler into real TelegramBridge (grammy)  
**Acceptance:** Session-aware intro dedup, observability events, error resilience  

---

## 🎯 Objective

Integrate the new platform layer (SessionManager, TelegramMessageHandler) into the existing TelegramBridge, replacing hardcoded intro strings with session-aware deduplication.

## 📋 Changes

### 1. TelegramBridge (`src/modules/telegram/index.ts`)

**Replace:**
- Hardcoded intro in `/start` → Use `TelegramMessageHandler.getIntroMessage()`
- Raw message handler → Use `TelegramMessageHandler.handleMessage()`
- Processing message dedup → Let SessionManager handle session state

**Add:**
- `SessionManager` integration for TTL-based sessions
- `ObservabilityIntegration` for event recording
- Session-aware intro deduplication (follow-up messages skip intro)

### 2. TelegramMessageHandler (`src/platform/telegram/message-handler.ts`)

**Extend:**
- Export `getIntroMessage()` as static method
- Add optional platform callback for sendMessage
- Support both direct and gateway-based modes

### 3. Tests (`tests/telegram-bridge.test.ts`)

**Add:**
- Session-aware message flow tests
- Intro dedup tests through bridge
- Command tests with session context

---

## 🎯 Key Deliverables

- [ ] TelegramBridge uses SessionManager + TelegramMessageHandler
- [ ] Session-aware intro dedup (once per 15-min session)
- [ ] Observability events (session activity, intros sent)
- [ ] All 505+ tests passing
- [ ] Graceful fallback if observability unavailable
- [ ] Error resilience (bridge works without SessionManager)

---

## 📊 Test Expectations

```
Before: 505/505 PASS
After:  520+/520 PASS (+15 integration tests)

New tests:
├─ TelegramBridge with SessionManager (8 tests)
├─ Session-aware commands (4 tests)
└─ Observability integration (3 tests)
```
