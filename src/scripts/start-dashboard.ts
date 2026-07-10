/**
 * @file start-dashboard — Standalone dashboard server
 * @layer scripts
 * @created 2026-06-27
 * 
 * Run this to start the dashboard without Telegram bot:
 *   node dist/scripts/start-dashboard.js
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { scanCodebase } from '../core/knowledge/code-graph-builder.js';

const PORT = parseInt(process.env.PORT || '8766', 10);
const HOST = process.env.HOST || '127.0.0.1';

// Cache for code graph
let codeGraphCache: { nodes: any[]; edges: any[]; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 1 minute

// Get source path from env or use default
function getSourcePath(): string {
  const envPath = process.env.SRC_PATH;
  if (envPath) return envPath;
  // Default: src directory relative to cwd
  return path.join(process.cwd(), 'src');
}

async function getCodeGraph() {
  const now = Date.now();
  if (codeGraphCache && now - codeGraphCache.timestamp < CACHE_TTL) {
    return codeGraphCache;
  }
  
  const srcPath = getSourcePath();
  console.log('[CodeGraph] Scanning codebase at:', srcPath);
  const graph = await scanCodebase(srcPath);
  codeGraphCache = { ...graph, timestamp: now };
  console.log(`[CodeGraph] Scanned: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  return graph;
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = req.url || '/';
  const pathname = url.split('?')[0];

  // Health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { status: 'ok', timestamp: Date.now() } }));
    return;
  }

  // Code graph API
  if (pathname === '/api/code-graph') {
    try {
      const graph = await getCodeGraph();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          nodes: graph.nodes,
          edges: graph.edges,
          stats: {
            totalNodes: graph.nodes.length,
            totalEdges: graph.edges.length,
            byLabel: graph.nodes.reduce((acc: Record<string, number>, n: any) => {
              acc[n.label] = (acc[n.label] || 0) + 1;
              return acc;
            }, {}),
          }
        }
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: String(error) }));
    }
    return;
  }

  // Static files
  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, 'src/dashboard/index.html', 'text/html; charset=utf-8');
    return;
  }
  if (pathname === '/styles.css') {
    serveFile(res, 'src/dashboard/styles.css', 'text/css; charset=utf-8');
    return;
  }
  if (pathname === '/app.js') {
    serveFile(res, 'src/dashboard/app.js', 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/brain-tab.js') {
    serveFile(res, 'src/dashboard/brain-tab.js', 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/memory-tab.js') {
    serveFile(res, 'src/dashboard/memory-tab.js', 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/three.r128.min.js') {
    serveFile(res, 'src/dashboard/three.r128.min.js', 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/d3-force.min.js') {
    serveFile(res, 'src/dashboard/d3-force.min.js', 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/d3-dispatch.min.js') {
    serveFile(res, 'src/dashboard/d3-dispatch.min.js', 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/d3-timer.min.js') {
    serveFile(res, 'src/dashboard/d3-timer.min.js', 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/d3-quadtree.min.js') {
    serveFile(res, 'src/dashboard/d3-quadtree.min.js', 'application/javascript; charset=utf-8');
    return;
  }
  if (pathname === '/EffectComposer.js' || pathname === '/RenderPass.js' ||
      pathname === '/ShaderPass.js' || pathname === '/CopyShader.js' ||
      pathname === '/LuminosityHighPassShader.js' || pathname === '/UnrealBloomPass.js') {
    serveFile(res, 'src/dashboard' + pathname, 'application/javascript; charset=utf-8');
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

function serveFile(res: http.ServerResponse, filePath: string, contentType: string) {
  const fullPath = path.resolve(process.cwd(), filePath);
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found: ' + filePath);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

server.listen(PORT, HOST, () => {
  console.log(`[DashboardServer] Running at http://${HOST}:${PORT}`);
  console.log(`[DashboardServer] Health: http://${HOST}:${PORT}/api/health`);
  console.log(`[DashboardServer] Code Graph: http://${HOST}:${PORT}/api/code-graph`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[DashboardServer] Shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  console.log('[DashboardServer] Shutting down...');
  server.close(() => process.exit(0));
});
