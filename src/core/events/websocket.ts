/**
 * @file WebSocket Server — Stream events to dashboard
 * @layer core
 * @created 2026-06-20
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventBus } from './bus.js';
import { AgentEvent } from './types.js';

export class EventWebSocket {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private bus: EventBus;

  constructor(server: Server, bus: EventBus) {
    this.wss = new WebSocketServer({ server, path: '/ws/events' });
    this.bus = bus;

    this.wss.on('connection', (ws) => {
      console.log('[WebSocket] Client connected');
      this.clients.add(ws);

      // Send recent events on connect
      const recent = this.bus.getRecent(50);
      ws.send(JSON.stringify({ type: 'init', events: recent }));

      // Subscribe to all events
      const unsubscribe = this.bus.subscribeAll((event) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'event', event }));
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
        this.clients.delete(ws);
        unsubscribe();
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
        this.clients.delete(ws);
        unsubscribe();
      });
    });
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}
