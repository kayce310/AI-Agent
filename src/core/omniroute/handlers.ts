/**
 * @file OmniRoute API Handlers — REST endpoint handlers for OmniRoute integration
 * @layer core
 * @created 2026-07-05
 */

import * as http from 'http';
import { getOmniRouteClient, OmniRouteResponse } from './client.js';

export interface RequestContext {
  method: string;
  pathname: string;
  query: Record<string, string>;
  body?: any;
}

export class OmniRouteApiHandlers {
  private client = getOmniRouteClient();

  /**
   * Parse query parameters from URL
   */
  private parseQuery(url: string): Record<string, string> {
    const queryString = url.split('?')[1];
    if (!queryString) return {};

    const params: Record<string, string> = {};
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
    return params;
  }

  /**
   * Parse JSON body from request
   */
  private async parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (error) {
          reject(new Error('Invalid JSON body'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * GET /api/omniroute/models
   * List free models available in OmniRoute
   */
  async handleGetModels(res: http.ServerResponse): Promise<void> {
    const response = await this.client.getFreeModels();
    this.sendResponse(res, response.status, response);
  }

  /**
   * GET /api/omniroute/agent-skills
   * List agent skills catalog
   */
  async handleGetAgentSkills(res: http.ServerResponse, query: Record<string, string>): Promise<void> {
    const response = await this.client.getAgentSkills(query.category, query.area);
    this.sendResponse(res, response.status, response);
  }

  /**
   * GET /api/omniroute/guardrails
   * List registered guardrails
   */
  async handleGetGuardrails(res: http.ServerResponse): Promise<void> {
    const response = await this.client.getGuardrails();
    this.sendResponse(res, response.status, response);
  }

  /**
   * POST /api/omniroute/guardrails/test
   * Test guardrails with payload
   */
  async handleTestGuardrails(
    res: http.ServerResponse,
    body: any,
  ): Promise<void> {
    const response = await this.client.testGuardrails(body);
    this.sendResponse(res, response.status, response);
  }

  /**
   * GET /api/omniroute/docs/codex-cli
   * Get Codex CLI documentation
   */
  async handleGetCodexDocs(res: http.ServerResponse): Promise<void> {
    const response = await this.client.getCodexCliDocs();
    this.sendResponse(res, response.status, response);
  }

  /**
   * POST /api/omniroute/proxy
   * Generic proxy to OmniRoute endpoints
   * Body: { method: string, path: string, data?: any }
   */
  async handleProxy(
    res: http.ServerResponse,
    body: any,
  ): Promise<void> {
    const { method, path, data } = body;

    if (!method || !path) {
      this.sendResponse(res, 400, {
        success: false,
        error: 'Missing required fields: method, path',
        status: 400,
      });
      return;
    }

    const response = await this.client.proxy(method, path, data);
    this.sendResponse(res, response.status, response);
  }

  /**
   * Route request to appropriate handler
   */
  async route(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    pathname: string,
  ): Promise<boolean> {
    const method = req.method || 'GET';
    const query = this.parseQuery(req.url || '');

    try {
      // GET /api/omniroute/models
      if (method === 'GET' && pathname === '/api/omniroute/models') {
        await this.handleGetModels(res);
        return true;
      }

      // GET /api/omniroute/agent-skills
      if (method === 'GET' && pathname === '/api/omniroute/agent-skills') {
        await this.handleGetAgentSkills(res, query);
        return true;
      }

      // GET /api/omniroute/guardrails
      if (method === 'GET' && pathname === '/api/omniroute/guardrails') {
        await this.handleGetGuardrails(res);
        return true;
      }

      // GET /api/omniroute/docs/codex-cli
      if (method === 'GET' && pathname === '/api/omniroute/docs/codex-cli') {
        await this.handleGetCodexDocs(res);
        return true;
      }

      // POST /api/omniroute/guardrails/test
      if (method === 'POST' && pathname === '/api/omniroute/guardrails/test') {
        const body = await this.parseBody(req);
        await this.handleTestGuardrails(res, body);
        return true;
      }

      // POST /api/omniroute/proxy
      if (method === 'POST' && pathname === '/api/omniroute/proxy') {
        const body = await this.parseBody(req);
        await this.handleProxy(res, body);
        return true;
      }

      return false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Internal server error';
      this.sendResponse(res, 500, {
        success: false,
        error: errorMsg,
        status: 500,
      });
      return true;
    }
  }

  /**
   * Send JSON response
   */
  private sendResponse(
    res: http.ServerResponse,
    statusCode: number,
    data: any,
  ): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}

export function getOmniRouteHandlers(): OmniRouteApiHandlers {
  return new OmniRouteApiHandlers();
}
