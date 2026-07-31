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
import { McpTrace } from './mcp-trace.js';
import { CostTracker } from './cost-tracker.js';
import { MemoryAPI } from '../memory/MemoryAPI.js';
import { MemoryStore } from '../memory/MemoryStore.js';
import { getOmniRouteHandlers } from '../omniroute/handlers.js';

export interface DashboardServerOptions {
  port?: number;
  host?: string;
  memoryApi?: MemoryAPI;
}

import { createServer } from 'http';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'HTTPServer' });

export class DashboardServer {
  private server: http.Server;
  private eventWebSocket: EventWebSocket;
  private eventApi: EventApi;
  private mcpTrace: McpTrace;
  private costTracker: CostTracker;
  private omnirouteHandlers: any;
  private memoryApi: MemoryAPI | undefined;
  private port: number;
  private host: string;

  constructor(eventBus: EventBus, options: DashboardServerOptions = {}) {
    this.port = options.port || 8766;
    this.host = options.host || '127.0.0.1';
    this.memoryApi = options.memoryApi;

    this.eventApi = new EventApi(eventBus);
    this.mcpTrace = new McpTrace(eventBus);
    this.costTracker = new CostTracker(eventBus, { budgetUsd: 10 });
    this.omnirouteHandlers = getOmniRouteHandlers();

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res).catch(err => {
        console.error('[DashboardServer] Request handler error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
      });
    });

    this.eventWebSocket = new EventWebSocket(this.server, eventBus);
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
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
    // Strip query string for route matching
    const pathname = url.split('?')[0];

    // ═══ STATIC FILES (Dashboard v6) ═══
    if (pathname === '/' || pathname === '/index.html') {
      this.serveFile(res, 'src/dashboard/index.html', 'text/html; charset=utf-8');
      return;
    }
    if (pathname === '/styles.css') {
      this.serveFile(res, 'src/dashboard/styles.css', 'text/css; charset=utf-8');
      return;
    }
    if (pathname === '/app.js') {
      this.serveFile(res, 'src/dashboard/app.js', 'application/javascript; charset=utf-8');
      return;
    }
    // ═══ DASHBOARD MODULES (v8.1) ═══
    if (pathname === '/utils.js') {
      this.serveFile(res, 'src/dashboard/utils.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/render-mission.js') {
      this.serveFile(res, 'src/dashboard/render-mission.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/render-trace.js') {
      this.serveFile(res, 'src/dashboard/render-trace.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/inspector.js') {
      this.serveFile(res, 'src/dashboard/inspector.js', 'application/javascript; charset=utf-8');
      return;
    }

    if (pathname === '/i18n.js') {
      this.serveFile(res, 'src/dashboard/i18n.js', 'application/javascript; charset=utf-8');
      return;
    }

    // ═══ API: Stats ═══
    if (url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: { status: 'ok', timestamp: Date.now() } }));
      return;
    }

    // ═══ API: Agent State ═══
    if (url === '/api/state') {
      const state = this.eventWebSocket.getState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: state }));
      return;
    }

    // ═══ MEMORY TAB JS ═══
    if (pathname === '/memory-tab.js') {
      this.serveFile(res, 'src/dashboard/memory-tab.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/brain-tab.js') {
      this.serveFile(res, 'src/dashboard/brain-tab.js', 'application/javascript; charset=utf-8');
      return;
    }

    // ═══ LOCAL THREE.JS (for headless / CDN-offline mode) ═══
    if (pathname === '/three.r128.min.js') {
      this.serveFile(res, 'src/dashboard/three.r128.min.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/d3-force.min.js') {
      this.serveFile(res, 'src/dashboard/d3-force.min.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/d3-dispatch.min.js') {
      this.serveFile(res, 'src/dashboard/d3-dispatch.min.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/d3-timer.min.js') {
      this.serveFile(res, 'src/dashboard/d3-timer.min.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/d3-quadtree.min.js') {
      this.serveFile(res, 'src/dashboard/d3-quadtree.min.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/EffectComposer.js') {
      this.serveFile(res, 'src/dashboard/EffectComposer.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/RenderPass.js') {
      this.serveFile(res, 'src/dashboard/RenderPass.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/ShaderPass.js') {
      this.serveFile(res, 'src/dashboard/ShaderPass.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/CopyShader.js') {
      this.serveFile(res, 'src/dashboard/CopyShader.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/LuminosityHighPassShader.js') {
      this.serveFile(res, 'src/dashboard/LuminosityHighPassShader.js', 'application/javascript; charset=utf-8');
      return;
    }
    if (pathname === '/UnrealBloomPass.js') {
      this.serveFile(res, 'src/dashboard/UnrealBloomPass.js', 'application/javascript; charset=utf-8');
      return;
    }

    // ═══ API: Memory ═══
    if (url.startsWith('/api/memory') && this.memoryApi) {
      // GET /api/memory (root endpoint)
      if (url === '/api/memory' && req.method === 'GET') {
        this.sendJson(res, this.memoryApi.stats());
        return;
      }
      if (url === '/api/memory/stats') {
        this.sendJson(res, this.memoryApi.stats());
        return;
      }
      if (url === '/api/memory/list' || url.startsWith('/api/memory/list?')) {
        this.sendJson(res, this.memoryApi.list(url));
        return;
      }
      if (url === '/api/memory/graph') {
        this.sendJson(res, this.memoryApi.graph());
        return;
      }

      // POST/PATCH/DELETE handling
      if (req.method === 'POST') {
        const body = await this.readBody(req);
        
        if (url === '/api/memory') {
          this.sendJson(res, this.memoryApi.create(body));
          return;
        }
        // Memory flush — trigger persist to disk
        if (url === '/api/memory/flush') {
          if (this.memoryApi && typeof this.memoryApi['store']?.shutdown === 'function') {
            this.memoryApi['store'].shutdown();
          }
          this.sendJson(res, { success: true, data: { message: 'Memory persisted to disk' } });
          return;
        }
        // Memory cleanup — run decay + archive low-confidence items
        if (url === '/api/memory/cleanup') {
          let removed = 0;
          if (this.memoryApi && typeof this.memoryApi['store']?.applyDecay === 'function') {
            this.memoryApi['store'].applyDecay();
            const counts = this.memoryApi['store'].getCount();
            removed = counts.archived;
          }
          this.sendJson(res, { success: true, data: { removed } });
          return;
        }
        // POST /api/memory/:id/pin, /unpin, /forget, /promote, /link
        const postMatch = url.match(/^\/api\/memory\/([^/]+)\/([a-z]+)$/);
        if (postMatch) {
          const [_, id, action] = postMatch;
          switch (action) {
            case 'pin': this.sendJson(res, this.memoryApi.pin(id)); return;
            case 'unpin': this.sendJson(res, this.memoryApi.unpin(id)); return;
            case 'forget': this.sendJson(res, this.memoryApi.forget(id)); return;
            case 'promote': this.sendJson(res, this.memoryApi.promote(id, body)); return;
            case 'link': this.sendJson(res, this.memoryApi.link(id, body)); return;
          }
        }
      }

      if (req.method === 'PATCH') {
        const patchMatch = url.match(/^\/api\/memory\/([^/]+)$/);
        if (patchMatch) {
          const body = await this.readBody(req);
          this.sendJson(res, this.memoryApi.update(patchMatch[1], body));
          return;
        }
      }

      if (req.method === 'DELETE') {
        const delMatch = url.match(/^\/api\/memory\/([^/]+)$/);
        if (delMatch) {
          this.sendJson(res, this.memoryApi.delete(delMatch[1]));
          return;
        }
      }

      // GET /api/memory/:id (single item)
      const getMatch = url.match(/^\/api\/(?:memory|memories)\/([^/]+)$/);
      if (getMatch && req.method === 'GET') {
        this.sendJson(res, this.memoryApi.get(getMatch[1]));
        return;
      }

      // If memory API was matched but no route handled, continue to default
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

    // ═══ API: Trace ═══
    if (url.startsWith('/api/trace/')) {
      const taskId = url.replace(/^\/api\/trace\//, '');
      if (!taskId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing taskId' }));
        return;
      }

      const response = this.eventApi.getTrace(taskId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      return;
    }

    // ═══ API: Graph (Cognitive Decision Graph from events) ═══
    if (url.startsWith('/api/graph/')) {
      const taskId = url.replace(/^\/api\/graph\//, '');
      if (!taskId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing taskId' }));
        return;
      }

      const response = this.eventApi.getGraph(taskId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      return;
    }

    // ═══ API: Code Graph (Knowledge Graph from source code) ═══
    if (url === '/api/code-graph' || url.startsWith('/api/code-graph?')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const projectPath = params.get('path') || process.cwd();
      
      try {
        // Dynamic import to avoid loading at startup
        const { scanCodebase } = await import('../knowledge/code-graph-builder.js');
        const graph = await scanCodebase(projectPath + '/src');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          data: {
            nodes: graph.nodes,
            edges: graph.edges,
            stats: {
              totalNodes: graph.nodes.length,
              totalEdges: graph.edges.length,
              byLabel: graph.nodes.reduce((acc, n) => {
                acc[n.label] = (acc[n.label] || 0) + 1;
                return acc;
              }, {} as Record<string, number>),
            }
          }
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to scan codebase' 
        }));
      }
      return;
    }

    // ═══ API: MCP Trace ═══
    if (url === '/api/mcp/trace' || url.startsWith('/api/mcp/trace?')) {
      const params = new URL(url, 'http://localhost').searchParams;
      const limit = parseInt(params.get('limit') || '500', 10);
      const toolName = params.get('tool') || undefined;
      const response = this.mcpTrace.buildTrace(limit, toolName);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
      return;
    }

    // ═══ CIRCUIT BREAKER MANAGEMENT ═══
    if (url === '/api/circuit-breaker/status') {
      const { engineCircuitBreaker } = await import('../circuit-breaker.js');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          state: engineCircuitBreaker.getState(),
          healthy: engineCircuitBreaker.isHealthy(),
          failureCount: engineCircuitBreaker.getFailureCount(),
        },
      }));
      return;
    }

    if (url === '/api/circuit-breaker/reset' && req.method === 'POST') {
      const { engineCircuitBreaker } = await import('../circuit-breaker.js');
      engineCircuitBreaker.reset();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Circuit breaker reset to CLOSED state',
      }));
      return;
    }

    // ═══ COST TRACKING ═══
    if (url === '/api/cost/session' || url.startsWith('/api/cost/session?')) {
      const sessionCost = this.costTracker.getSessionCost();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: sessionCost }));
      return;
    }
    if (url === '/api/cost/budget') {
      const budget = this.costTracker.getBudgetStatus();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: budget }));
      return;
    }
    if (url === '/api/cost/alerts' || url.startsWith('/api/cost/alerts?')) {
      const p = new URL(url, 'http://localhost').searchParams;
      const lim = parseInt(p.get('limit') || '20', 10);
      const alerts = this.costTracker.getAlerts(lim);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: alerts }));
      return;
    }
    if (url === '/api/cost/records' || url.startsWith('/api/cost/records?')) {
      const p = new URL(url, 'http://localhost').searchParams;
      const lim = parseInt(p.get('limit') || '50', 10);
      const records = this.costTracker.getRecentRecords(lim);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: records }));
      return;
    }

    // ═══ API: OmniRoute Integration ═══
    if (pathname.startsWith('/api/omniroute')) {
      const handled = await this.omnirouteHandlers.route(req, res, pathname);
      if (handled) {
        return;
      }
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
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(data);
    });
  }

  /**
   * Send JSON response (helper)
   */
  private sendJson(res: http.ServerResponse, data: any): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Read request body as string
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => resolve(body));
      req.on('error', reject);
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
      // Close active connections (WebSocket clients attached to this server)
      // so server.close() can release the port immediately instead of waiting
      // for idle connections. Node 18.2+ / 20+.
      try {
        (this.server as any).closeAllConnections?.();
      } catch {}
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
