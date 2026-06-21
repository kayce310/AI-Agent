import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TelegramMessageHandler } from '../src/platform/telegram/message-handler';
import { ObservabilityIntegration } from '../src/observability/integration';

describe('TelegramMessageHandler', () => {
  let handler: TelegramMessageHandler;
  let coralMock: any;
  let observabilityMock: any;

  beforeEach(() => {
    // Mock Coral agent
    coralMock = {
      handleMessage: vi.fn().mockResolvedValue('Response from Coral'),
    };

    // Mock observability (optional)
    observabilityMock = {
      recordError: vi.fn().mockResolvedValue(undefined),
      isEnabled: vi.fn().mockReturnValue(false),
    };

    handler = new TelegramMessageHandler(coralMock, observabilityMock);
  });

  afterEach(() => {
    handler.destroy();
  });

  describe('Message Handling', () => {
    it('handles first message and sends intro', async () => {
      const response = await handler.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      expect(response.text).toContain('Xin chào');
      expect(response.text).toContain('Response from Coral');
      expect(response.sentIntro).toBe(true);
    });

    it('does not send intro on second message in same session', async () => {
      // First message
      const response1 = await handler.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });
      expect(response1.sentIntro).toBe(true);

      // Second message
      const response2 = await handler.handleMessage({
        userId: 'user123',
        text: 'How are you?',
      });
      expect(response2.sentIntro).toBe(false);
      expect(response2.text).not.toContain('Xin chào');
      expect(response2.text).toContain('Response from Coral');
    });

    it('calls Coral agent with session ID', async () => {
      await handler.handleMessage({
        userId: 'user123',
        text: 'Test message',
      });

      expect(coralMock.handleMessage).toHaveBeenCalledWith(
        expect.any(String), // sessionId
        'Test message'
      );
    });

    it('uses same session ID across messages', async () => {
      const msg1 = await handler.handleMessage({
        userId: 'user123',
        text: 'First',
      });

      const msg2 = await handler.handleMessage({
        userId: 'user123',
        text: 'Second',
      });

      expect(msg1.sessionId).toBe(msg2.sessionId);
    });

    it('creates different sessions for different users', async () => {
      const msg1 = await handler.handleMessage({
        userId: 'user1',
        text: 'Hello',
      });

      const msg2 = await handler.handleMessage({
        userId: 'user2',
        text: 'Hello',
      });

      expect(msg1.sessionId).not.toBe(msg2.sessionId);
    });
  });

  describe('Session Management', () => {
    it('sends intro again after session TTL expires', async () => {
      vi.useFakeTimers();

      // First message
      const response1 = await handler.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });
      expect(response1.sentIntro).toBe(true);

      // Second message (still in session)
      const response2 = await handler.handleMessage({
        userId: 'user123',
        text: 'Still here',
      });
      expect(response2.sentIntro).toBe(false);

      // Advance past TTL (15 min)
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      // Third message (new session)
      const response3 = await handler.handleMessage({
        userId: 'user123',
        text: 'New session',
      });
      expect(response3.sentIntro).toBe(true);
      expect(response3.sessionId).not.toBe(response1.sessionId);

      vi.useRealTimers();
    });

    it('tracks active session count', async () => {
      expect(handler.getActiveSessionCount()).toBe(0);

      await handler.handleMessage({
        userId: 'user1',
        text: 'Hello',
      });
      expect(handler.getActiveSessionCount()).toBe(1);

      await handler.handleMessage({
        userId: 'user2',
        text: 'Hello',
      });
      expect(handler.getActiveSessionCount()).toBe(2);

      // Same user
      await handler.handleMessage({
        userId: 'user1',
        text: 'Again',
      });
      expect(handler.getActiveSessionCount()).toBe(2);
    });

    it('retrieves session info', async () => {
      await handler.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      const session = handler.getSessionInfo('user123');
      expect(session).toBeDefined();
      expect(session?.userId).toBe('user123');
      expect(session?.introSent).toBe(true);
    });
  });

  describe('Observability Integration', () => {
    it('records session activity when observability enabled', async () => {
      const recordErrorSpy = vi.spyOn(observabilityMock, 'recordError');

      const handler2 = new TelegramMessageHandler(coralMock, observabilityMock);
      await handler2.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      expect(recordErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'session',
          message: expect.stringContaining('message_received'),
        })
      );

      handler2.destroy();
    });

    it('records intro sent event', async () => {
      const recordErrorSpy = vi.spyOn(observabilityMock, 'recordError');

      const handler2 = new TelegramMessageHandler(coralMock, observabilityMock);
      await handler2.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      expect(recordErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'session_intro',
          message: expect.stringContaining('intro_sent'),
        })
      );

      handler2.destroy();
    });

    it('handles missing observability gracefully', async () => {
      const handler2 = new TelegramMessageHandler(coralMock); // No observability
      const response = await handler2.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      expect(response.text).toContain('Xin chào');
      expect(response.sentIntro).toBe(true);

      handler2.destroy();
    });
  });

  describe('Error Handling', () => {
    it('returns error response on agent failure', async () => {
      const failingCoralMock = {
        handleMessage: vi.fn().mockRejectedValue(new Error('Agent crashed')),
      };

      const failHandler = new TelegramMessageHandler(failingCoralMock);
      const response = await failHandler.handleMessage({
        userId: 'user123',
        text: 'Test',
      });

      expect(response.text).toContain('❌');
      expect(response.text).toContain('lỗi');

      failHandler.destroy();
    });

    it('continues to work even if observability fails', async () => {
      const failingObservability = {
        recordError: vi.fn().mockRejectedValue(new Error('Observability down')),
      };

      const handler2 = new TelegramMessageHandler(coralMock, failingObservability);
      const response = await handler2.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      // Should still work
      expect(response.text).toContain('Response from Coral');
      expect(response.sentIntro).toBe(true);

      handler2.destroy();
    });
  });

  describe('Lifecycle', () => {
    it('cleans up resources on destroy', () => {
      handler.getActiveSessionCount(); // Should work
      handler.destroy();
      // After destroy, should not crash
      expect(handler).toBeDefined();
    });
  });

  describe('Type safety', () => {
    it('handles mock observability', async () => {
      const mockObs = {
        recordError: vi.fn().mockResolvedValue(undefined),
      } as any;

      const handler2 = new TelegramMessageHandler(coralMock, mockObs);
      const response = await handler2.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      expect(response.text).toContain('Xin chào');
      handler2.destroy();
    });
  });
});
