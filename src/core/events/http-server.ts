/**
 * @file HTTP/WS Server — Serves events + dashboard to browser
 * @layer infrastructure
 * @created 2026-06-20
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
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
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = req.url || '/';

    // ═══ STATIC FILES (Dashboard v6) ═══
    if (url === '/' || url === '/index.html') {
      this.serveFile(res, 'src/dashboard/index.html', 'text/html; charset=utf-8');
      return;
    }
    if (url === '/styles.css') {
      this.serveFile(res, 'src/dashboard/styles.css', 'text/css; charset=utf-8');
      return;
    }
    if (url === '/app.js') {
      this.serveFile(res, 'src/dashboard/app.js', 'application/javascript; charset=utf-8');
      return;
    }

    // ═══ API: Stats ═══
    if (url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { status: 'ok', timestamp: Date.now() } }));
      return;
    }

    // ═══ API: Events ═══
    if (url.startsWith('/api/events/')) {
      const pathname = url.replace(/^\/api\/events\//, '');
      let response: any;

      if (pathname === 'recent') {
        response = this.eventApi.getRecent();
      } else if (pathname === 'stats') {
        response = this.eventApi.getStats();
      } else if (pathname.startsWith('task/')) {
        const taskId = pathname.replace('task/', '');
        response = this.eventApi.getByTask(taskId);
      } else {
        response = { success: false, error: 'Unknown endpoint' };
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Not found' }));
  }

  private serveFile(res: http.ServerResponse, filePath: string, contentType: string): void {
    const fullPath = path.resolve(process.cwd(), filePath);
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        console.error(`[DashboardServer] Failed to serve ${filePath}:`, err.message);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, this.host, () => {
        console.log(`[DashboardServer] HTTP/WS server running at http://${this.host}:${this.port}`);
        console.log(`[DashboardServer] Dashboard: http://${this.host}:${this.port}`);
        console.log(`[DashboardServer] WebSocket: ws://${this.host}:${this.port}/ws/events`);
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
