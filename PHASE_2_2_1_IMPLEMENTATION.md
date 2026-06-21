# Phase 2.2.1: Session TTL Cache Implementation

**Status:** Ready to implement  
**Timeline:** 1-2 hours  
**Acceptance Criteria:** Intro sent once per 15-min session, not on restart  
**Test Coverage:** Session cache lifecycle + intro deduplication

---

## 🎯 Objective

Fix Coral's intro reset by adding lightweight session TTL cache to Telegram platform layer. Keep Coral agent stateless; add state only at platform boundary.

---

## 📋 Implementation Plan

### Step 1: Create Session Manager (30 min)

**File:** `src/platform/telegram/session-manager.ts`

Requirements:
- Store sessionId, lastActivity, introSent per userId
- Auto-expire sessions after 15 min
- Thread-safe Map operations
- Emit session events to observability

```typescript
interface SessionState {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  introSent: boolean;
}

class SessionManager {
  private sessions = new Map<string, SessionState>();
  private readonly TTL_MS = 15 * 60 * 1000; // 15 min
  
  getOrCreateSession(userId: string): SessionState {
    const session = this.sessions.get(userId);
    
    // Check TTL
    if (session && Date.now() - session.lastActivity > this.TTL_MS) {
      this.sessions.delete(userId);
      return this.createNewSession(userId);
    }
    
    if (!session) {
      return this.createNewSession(userId);
    }
    
    return session;
  }
  
  private createNewSession(userId: string): SessionState {
    const session: SessionState = {
      sessionId: crypto.randomUUID(),
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      introSent: false,
    };
    this.sessions.set(userId, session);
    return session;
  }
  
  markIntroSent(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.introSent = true;
      session.lastActivity = Date.now();
    }
  }
  
  updateLastActivity(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }
  
  cleanup(): void {
    // Remove expired sessions (run every 5 min)
    const now = Date.now();
    for (const [userId, session] of this.sessions) {
      if (now - session.lastActivity > this.TTL_MS) {
        this.sessions.delete(userId);
      }
    }
  }
}
```

### Step 2: Integrate with Telegram Handler (30 min)

**File:** `src/platform/telegram/message-handler.ts`

Modify message handling:

```typescript
import { SessionManager } from './session-manager';
import { observability } from '../../observability/integration';

class TelegramMessageHandler {
  private sessionManager = new SessionManager();
  
  async handleMessage(userId: string, text: string): Promise<string> {
    // Get or create session
    const session = this.sessionManager.getOrCreateSession(userId);
    
    // Log session event
    await observability.recordEvent({
      type: 'session_activity',
      sessionId: session.sessionId,
      userId,
      action: 'message_received',
      isNewSession: !session.introSent,
    });
    
    // Send intro only if first time in session
    let response = '';
    if (!session.introSent) {
      response = this.getIntroMessage();
      this.sessionManager.markIntroSent(userId);
      
      await observability.recordEvent({
        type: 'intro_sent',
        sessionId: session.sessionId,
        userId,
      });
    }
    
    // Handle message (Coral agent is stateless)
    const agentResponse = await coral.handleMessage(
      session.sessionId,
      text
    );
    
    // Update activity
    this.sessionManager.updateLastActivity(userId);
    
    return response + agentResponse;
  }
  
  private getIntroMessage(): string {
    return `🪸 Xin chào! Tôi là Coral, trợ lý AI của bạn. Tôi sẽ giúp bạn với thời tiết, lịch, và nhiều việc khác.\n\n`;
  }
}
```

### Step 3: Add Session Event Tracking (20 min)

**Update:** `src/observability/event-store.ts`

Add session event types:

```typescript
export type ObservabilityEvent = 
  | ToolCallEvent
  | LLMResponseEvent
  | MemoryUpdateEvent
  | ErrorEvent
  | HealthCheckEvent
  | SessionActivityEvent // NEW
  | IntroSentEvent; // NEW

interface SessionActivityEvent {
  type: 'session_activity';
  sessionId: string;
  userId: string;
  action: 'message_received' | 'session_created' | 'session_expired';
  isNewSession: boolean;
  timestamp: number;
}

interface IntroSentEvent {
  type: 'intro_sent';
  sessionId: string;
  userId: string;
  timestamp: number;
}
```

### Step 4: Write Tests (20 min)

**File:** `tests/session-manager.test.ts`

```typescript
describe('SessionManager', () => {
  let manager: SessionManager;
  
  beforeEach(() => {
    manager = new SessionManager();
  });
  
  it('creates new session for new user', () => {
    const session = manager.getOrCreateSession('user123');
    expect(session.userId).toBe('user123');
    expect(session.introSent).toBe(false);
  });
  
  it('returns same session within TTL', () => {
    const session1 = manager.getOrCreateSession('user123');
    const session2 = manager.getOrCreateSession('user123');
    expect(session1.sessionId).toBe(session2.sessionId);
  });
  
  it('marks intro as sent', () => {
    manager.getOrCreateSession('user123');
    manager.markIntroSent('user123');
    const session = manager.getOrCreateSession('user123');
    expect(session.introSent).toBe(true);
  });
  
  it('expires session after TTL', (done) => {
    vi.useFakeTimers();
    const session1 = manager.getOrCreateSession('user123');
    
    // Advance 15 min + 1 sec
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    
    const session2 = manager.getOrCreateSession('user123');
    expect(session2.sessionId).not.toBe(session1.sessionId);
    expect(session2.introSent).toBe(false);
    
    vi.useRealTimers();
    done();
  });
  
  it('cleans up expired sessions', () => {
    vi.useFakeTimers();
    manager.getOrCreateSession('user1');
    manager.getOrCreateSession('user2');
    
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    manager.cleanup();
    
    // Both should be recreated with new IDs
    const s1 = manager.getOrCreateSession('user1');
    const s2 = manager.getOrCreateSession('user2');
    expect(s1.createdAt).toBeGreaterThan(0);
    expect(s2.createdAt).toBeGreaterThan(0);
    
    vi.useRealTimers();
  });
});
```

**File:** `tests/telegram-handler-with-session.test.ts`

```typescript
describe('TelegramMessageHandler with SessionManager', () => {
  let handler: TelegramMessageHandler;
  let coralMock: any;
  
  beforeEach(() => {
    coralMock = {
      handleMessage: vi.fn().mockResolvedValue('Response from Coral'),
    };
    handler = new TelegramMessageHandler(coralMock);
  });
  
  it('sends intro only on first message in session', async () => {
    const response1 = await handler.handleMessage('user123', 'Hello');
    expect(response1).toContain('Xin chào');
    expect(response1).toContain('Response from Coral');
    
    // Second message in same session
    const response2 = await handler.handleMessage('user123', 'How are you?');
    expect(response2).not.toContain('Xin chào');
    expect(response2).toContain('Response from Coral');
  });
  
  it('sends intro again after session expires', (done) => {
    vi.useFakeTimers();
    
    const response1 = await handler.handleMessage('user123', 'Hello');
    expect(response1).toContain('Xin chào');
    
    // Advance past TTL
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    
    const response2 = await handler.handleMessage('user123', 'Hi again');
    expect(response2).toContain('Xin chào'); // Intro sent again
    
    vi.useRealTimers();
    done();
  });
  
  it('records session events to observability', async () => {
    const eventRecordSpy = vi.spyOn(observability, 'recordEvent');
    
    await handler.handleMessage('user123', 'Test');
    
    expect(eventRecordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'session_activity',
        action: 'message_received',
        isNewSession: true,
      })
    );
    
    expect(eventRecordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'intro_sent',
      })
    );
  });
});
```

### Step 5: Update Integration Tests (10 min)

**Update:** `tests/observability-integration.test.ts`

Add session event recording:

```typescript
it('records session activity events', async () => {
  const integration = new ObservabilityIntegration();
  
  await integration.recordSessionActivity({
    sessionId: 'sess-123',
    userId: 'user-456',
    action: 'message_received',
    isNewSession: true,
  });
  
  const events = await integration.getEventsByType('session_activity');
  expect(events.length).toBeGreaterThan(0);
  expect(events[0].type).toBe('session_activity');
});

it('records intro sent events', async () => {
  const integration = new ObservabilityIntegration();
  
  await integration.recordIntroSent({
    sessionId: 'sess-123',
    userId: 'user-456',
  });
  
  const events = await integration.getEventsByType('intro_sent');
  expect(events.length).toBeGreaterThan(0);
});
```

---

## ✅ Acceptance Criteria

- [ ] SessionManager created and tested (8 tests pass)
- [ ] Telegram handler integrated with SessionManager
- [ ] Intro sent only once per 15-min session
- [ ] Intro resent after session TTL expires
- [ ] Session events recorded to EventStore
- [ ] All tests pass (current 473 + ~12 new = 485+)
- [ ] No intro sent on bot restart (within session TTL)
- [ ] Manual Telegram test: send 2 messages, verify intro sent once

---

## 📊 Expected Test Results

```
Before: 473/473 PASS
After:  485+/485+ PASS (+12 tests)
  - SessionManager: 5 tests
  - TelegramHandler: 4 tests
  - ObservabilityIntegration: 3 tests
```

---

## 🚀 Deployment

1. Branch: `feature/session-ttl-cache`
2. Merge to `develop` when all tests pass
3. Update `PHASE_2_2_1_CHECKPOINT.md` with results
4. Commit: `"Phase 2.2.1: Session TTL cache + intro deduplication"`

---

## 📌 Notes

**Why 15 minutes?**
- Short enough for UX (user doesn't wait forever)
- Long enough for typical conversation (most chats <10 min)
- Aligns with typical session TTL patterns (web sessions: 15-30 min)

**Why Map, not Redis?**
- Coral is single-instance (not cluster)
- Session cache is ephemeral (loss is acceptable)
- Simple, fast, no external dependency
- Can migrate to Redis later if needed

**Why emit events?**
- Observability (see session patterns)
- Future debugging (why intro sent multiple times?)
- Analytics (session distribution, TTL patterns)

---

## 🎓 Learning Outcomes

After this phase, Kayce will understand:
- ✅ Stateless agent + stateful platform = best UX
- ✅ Session management doesn't couple architecture
- ✅ Event-driven observability enables debugging
- ✅ TTL cache is superior to full state management
