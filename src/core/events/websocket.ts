/**
 * @file WebSocket Server — Stream events + AgentState to dashboard
 * @layer core
 * @created 2026-06-20
 * @updated 2026-06-21 — Phase 1: send AgentState with every event
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { EventBus } from './bus.js';
import { AgentEvent } from './types.js';
import { AgentState, buildStateFromEvents, reduceEvent, createInitialState } from './agent-state.js';

export class EventWebSocket {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private bus: EventBus;
  private currentState: AgentState;

  constructor(server: Server, bus: EventBus) {
    this.wss = new WebSocketServer({ server, path: '/ws/events' });
    this.bus = bus;

    // Build initial state from recent events (oldest first)
    const recent = this.bus.getRecent(200);
    this.currentState = buildStateFromEvents([...recent].reverse());

    this.wss.on('connection', (ws) => {
      console.log('[WebSocket] Client connected');
      this.clients.add(ws);

      // Send initial state + recent events
      ws.send(JSON.stringify({
        type: 'init',
        state: this.currentState,
        events: recent,
      }));

      // Subscribe to all events
      const unsubscribe = this.bus.subscribeAll((event) => {
        // Update state
        this.currentState = reduceEvent(this.currentState, event);

        // Broadcast event + updated state to all clients
        const message = JSON.stringify({
          type: 'event',
          event,
          state: this.currentState,
        });

        this.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
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
   * Get current agent state
   */
  getState(): AgentState {
    return this.currentState;
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}
