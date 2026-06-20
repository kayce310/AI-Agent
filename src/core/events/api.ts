/**
 * @file Event API — REST endpoints for event data
 * @layer core
 * @created 2026-06-20
 */

import { EventBus } from './bus.js';

export interface EventApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class EventApi {
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  /**
   * GET /api/events/recent
   */
  getRecent(limit: number = 50): EventApiResponse {
    try {
      const events = this.bus.getRecent(limit);
      return { success: true, data: events };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * GET /api/events/task/:taskId
   */
  getByTask(taskId: string): EventApiResponse {
    try {
      const events = this.bus.getByTask(taskId);
      return { success: true, data: events };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * GET /api/events/stats
   */
  getStats(): EventApiResponse {
    try {
      const stats = this.bus.getCountByType();
      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
