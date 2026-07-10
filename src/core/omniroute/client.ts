/**
 * @file OmniRoute Client — HTTP client for communicating with OmniRoute
 * @layer core
 * @created 2026-07-05
 */

import * as http from 'http';

export interface OmniRouteConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface OmniRouteResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export class OmniRouteClient {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: OmniRouteConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3000';
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;
  }

  /**
   * Make HTTP request to OmniRoute
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<OmniRouteResponse<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        return await this.doRequest<T>(method, path, body);
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.retries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      status: 500,
    };
  }

  /**
   * Execute single HTTP request
   */
  private doRequest<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<OmniRouteResponse<T>> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AI-Agent/1.0',
        },
      };

      const req = http.request(url, options, (res) => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({
              success: res.statusCode ? res.statusCode < 400 : false,
              data: parsed,
              status: res.statusCode || 500,
            });
          } catch {
            resolve({
              success: false,
              error: 'Invalid JSON response',
              status: res.statusCode || 500,
            });
          }
        });
      });

      req.on('error', err => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * GET /api/free-models
   */
  async getFreeModels(): Promise<OmniRouteResponse<any>> {
    return this.request('GET', '/api/free-models');
  }

  /**
   * GET /api/agent-skills
   */
  async getAgentSkills(category?: string, area?: string): Promise<OmniRouteResponse<any>> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (area) params.append('area', area);

    const path = `/api/agent-skills${params.toString() ? '?' + params.toString() : ''}`;
    return this.request('GET', path);
  }

  /**
   * GET /api/guardrails
   */
  async getGuardrails(): Promise<OmniRouteResponse<any>> {
    return this.request('GET', '/api/guardrails');
  }

  /**
   * POST /api/guardrails/test
   */
  async testGuardrails(payload: any): Promise<OmniRouteResponse<any>> {
    return this.request('POST', '/api/guardrails/test', payload);
  }

  /**
   * GET /api/docs/codex-cli
   */
  async getCodexCliDocs(): Promise<OmniRouteResponse<any>> {
    return this.request('GET', '/api/docs/codex-cli');
  }

  /**
   * Generic proxy method for any OmniRoute endpoint
   */
  async proxy(method: string, path: string, body?: any): Promise<OmniRouteResponse<any>> {
    return this.request(method, path, body);
  }
}

/**
 * Singleton instance
 */
let clientInstance: OmniRouteClient | null = null;

export function getOmniRouteClient(config?: OmniRouteConfig): OmniRouteClient {
  if (!clientInstance) {
    clientInstance = new OmniRouteClient(config);
  }
  return clientInstance;
}
