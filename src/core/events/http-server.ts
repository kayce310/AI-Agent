/**
 * @file HTTP/WS Server — Serves events to dashboard
 * @layer infrastructure
 * @created 2026-06-20
 */

import * as http from 'http';
import { EventBus } from './bus.js';
import { EventStore } from './store.js';
import { StructuredLogger } from './logger.js';
import { EventWebSocket } from './websocket.js';
import { EventApi } from './api.js';

export interface DashboardServerOptions {
  port?: number;
  host?: string;
}

export class DashboardServer {
  private server: http.Server;
  private eventWebSocket: EventWebSocket;
  private eventApi: EventApi;
  private port: number;
  private host: string;

  constructor(eventBus: EventBus, options: DashboardServerOptions = {}) {
    this.port = options.port || 8766;
    this.host = options.host || '127.0.0.1';

    this.eventApi = new EventApi(eventBus);

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.eventWebSocket = new EventWebSocket(this.server, eventBus);
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // CORS headers for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    try {
      let response: any;

      if (path === '/api/events/recent') {
        const limit = parseInt(url.searchParams.get('limit') || '50');
        response = this.eventApi.getRecent(limit);
      } else if (path.startsWith('/api/events/task/')) {
        const taskId = path.split('/api/events/task/')[1];
        response = this.eventApi.getByTask(taskId);
      } else if (path === '/api/events/stats') {
        response = this.eventApi.getStats();
      } else if (path === '/api/health') {
        response = {
          success: true,
          data: { status: 'ok', timestamp: Date.now(), wsClients: this.eventWebSocket.getClientCount() }
        };
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, error: 'Not found' }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify(response));
    } catch (error) {
      console.error('[DashboardServer] Request error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`[DashboardServer] HTTP/WS server running at http://${this.host}:${this.port}`);
        console.log(`[DashboardServer] WebSocket endpoint: ws://${this.host}:${this.port}/ws/events`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  getPort(): number {
    return this.port;
  }
}
