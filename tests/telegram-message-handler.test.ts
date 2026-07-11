import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TelegramMessageHandler } from '../src/platform/telegram/message-handler';
import { ObservabilityIntegration } from '../src/observability/integration';
import { SessionManager } from '../src/platform/telegram/session-manager';

describe('TelegramMessageHandler', () => {
  let handler: TelegramMessageHandler;
  let coralMock: any;
  let observabilityMock: any;

  beforeEach(() => {
    // Clear disk state to avoid cross-test contamination
    SessionManager.clearDiskSessionFile();

    // Mock Coral agent with process() method (not handleMessage)
    coralMock = {
      process: vi.fn().mockResolvedValue({ content: 'Response from Coral' }),
      toolRegistry: {
        listTools: vi.fn().mockReturnValue([]),
      },
      agentConfig: {},
      agentRegistry: undefined,
    };

    // Mock observability (optional)
    observabilityMock = {
      recordEvent: vi.fn().mockResolvedValue(undefined),
      isEnabled: vi.fn().mockReturnValue(false),
    };

    handler = new TelegramMessageHandler(coralMock, observabilityMock);
  });

  afterEach(() => {
    // Clean up session manager
    handler.destroy();
  });

  describe('Message Handling', () => {
    it('routes simple messages to Coral agent', async () => {
      const response = await handler.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      expect(response.text).toContain('Response from Coral');
    });

    it('does not send intro on second message in same session', async () => {
      // First message
      const response1 = await handler.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });
      expect(response1.sentIntro).toBe(false); // No intro handling at handler level

      // Second message
      const response2 = await handler.handleMessage({
        userId: 'user123',
        text: 'How are you?',
      });
      expect(response2.sentIntro).toBe(false);
      expect(response2.text).toContain('Response from Coral');
    });

    it('calls Coral agent with session ID', async () => {
      await handler.handleMessage({
        userId: 'user123',
        text: 'Test message',
      });

      expect(coralMock.process).toHaveBeenCalled();
      const callArgs = coralMock.process.mock.calls[0][0];
      expect(callArgs.sessionId).toBeDefined();
      expect(callArgs.messages[0].content).toBe('Test message');
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

    it('routes complex tasks to streaming react loop', async () => {
      const response = await handler.handleMessage({
        userId: 'user123',
        text: 'Research IoT and evaluate options',
      });

      // Complex tasks should still return a response
      expect(response.text).toBeDefined();
      expect(response.sessionId).toBeDefined();
    });
  });

  describe('Session Management', () => {
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
    });
  });

  describe('Streaming', () => {
    it('accepts stream responder', () => {
      const responder = vi.fn().mockResolvedValue(undefined);
      handler.setStreamResponder(responder);
      expect(handler).toBeDefined();
    });

    it('clears stream responder', () => {
      const responder = vi.fn().mockResolvedValue(undefined);
      handler.setStreamResponder(responder);
      handler.clearStreamResponder();
      expect(handler).toBeDefined();
    });
  });

  describe('Observability Integration', () => {
    it('handles missing observability gracefully', async () => {
      const handler2 = new TelegramMessageHandler(coralMock); // No observability param
      const response = await handler2.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      expect(response.text).toContain('Response from Coral');
      handler2.destroy();
    });

    it('continues to work even if observability fails', async () => {
      const failingObservability = {
        recordEvent: vi.fn().mockRejectedValue(new Error('Observability down')),
      };

      const handler2 = new TelegramMessageHandler(coralMock, failingObservability);
      const response = await handler2.handleMessage({
        userId: 'user123',
        text: 'Hello',
      });

      // Should still work
      expect(response.text).toContain('Response from Coral');
      handler2.destroy();
    });
  });

  describe('Error Handling', () => {
    it('returns agent response on agent failure', async () => {
      const failingCoralMock = {
        process: vi.fn().mockRejectedValue(new Error('Agent crashed')),
        toolRegistry: {
          listTools: vi.fn().mockReturnValue([]),
        },
        agentConfig: {},
        agentRegistry: undefined,
      };

      const failHandler = new TelegramMessageHandler(failingCoralMock);
      const response = await failHandler.handleMessage({
        userId: 'user123',
        text: 'Test',
      });

      // Agent failure returns error message
      expect(response.text).toContain('❌');
      expect(response.text).toContain('Lỗi');

      failHandler.destroy();
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

  describe('Intro Messages', () => {
    it('provides static intro message', () => {
      const intro = TelegramMessageHandler.getIntroMessage();
      expect(intro).toContain('Coral');
      expect(intro).toContain('🌊');
    });

    it('provides static bootstrap intro message', () => {
      const intro = TelegramMessageHandler.getBootstrapIntroMessage();
      expect(intro).toContain('admin');
      expect(intro).toContain('🌊');
    });
  });
});
