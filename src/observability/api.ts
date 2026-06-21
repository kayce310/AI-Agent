/**
 * Observability API: REST endpoints for dashboard
 * - GET /api/observability/events - Query events
 * - GET /api/observability/metrics - Get metrics snapshot
 * - GET /api/observability/health - Health check
 * - GET /api/observability/sessions - List active sessions
 */

import { Router, Request, Response } from 'express';
import EventStore from './event-store';
import MetricsCollector from './metrics-collector';

export function createObservabilityRouter(
  eventStore: EventStore,
  metricsCollectors: Map<string, MetricsCollector>
): Router {
  const router = Router();

  /**
   * GET /api/observability/events?sessionId=X&limit=100&cursor=Y&type=tool_call
   * Query events for a session with pagination
   */
  router.get('/events', async (req: Request, res: Response) => {
    try {
      const { sessionId, limit = 100, cursor, type } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const { events, nextCursor } = await eventStore.query(sessionId, {
        limit: Math.min(Number(limit) || 100, 1000),
        cursor: cursor as string | undefined,
        type: type as any,
      });

      res.json({
        sessionId,
        events,
        nextCursor,
        count: events.length,
        timestamp: Date.now(),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/observability/metrics?sessionId=X
   * Get aggregated metrics snapshot
   */
  router.get('/metrics', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const collector = metricsCollectors.get(sessionId);
      if (!collector) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const snapshot = await collector.getSnapshot();
      res.json(snapshot);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/observability/events-by-type?sessionId=X&type=tool_call&limit=50
   * Get events filtered by type
   */
  router.get('/events-by-type', async (req: Request, res: Response) => {
    try {
      const { sessionId, type, limit = 50 } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }

      if (!type) {
        return res.status(400).json({ error: 'type required' });
      }

      const { events } = await eventStore.query(sessionId, {
        limit: Math.min(Number(limit) || 50, 500),
        type: type as any,
      });

      res.json({
        sessionId,
        type,
        events,
        count: events.length,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/observability/events-by-time?sessionId=X&start=T1&end=T2
   * Get events in time range
   */
  router.get('/events-by-time', async (req: Request, res: Response) => {
    try {
      const { sessionId, start, end } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const startTime = start ? Number(start) : Date.now() - 3600000; // Last hour
      const endTime = end ? Number(end) : Date.now();

      const { events } = await eventStore.query(sessionId, {
        limit: 1000,
        startTime,
        endTime,
      });

      res.json({
        sessionId,
        timeRange: { start: startTime, end: endTime },
        events,
        count: events.length,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/observability/health?sessionId=X
   * Get latest health check for session
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const { events } = await eventStore.query(sessionId, {
        limit: 1,
        type: 'health_check',
      });

      if (!events.length) {
        return res.json({
          sessionId,
          status: 'unknown',
          message: 'No health check recorded',
        });
      }

      const healthEvent = events[0];
      res.json({
        sessionId,
        status: (healthEvent.data as any).status,
        checks: (healthEvent.data as any).checks,
        memory: (healthEvent.data as any).memory,
        uptime: (healthEvent.data as any).uptime,
        timestamp: healthEvent.timestamp,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/observability/sessions
   * List all active sessions
   */
  router.get('/sessions', async (req: Request, res: Response) => {
    try {
      const metrics = await eventStore.getMetrics();

      res.json({
        activeSessions: Array.from(metricsCollectors.keys()),
        totalSessions: metrics.totalSessions,
        totalEvents: metrics.totalEvents,
        timestamp: Date.now(),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/observability/dashboard?sessionId=X
   * Get comprehensive dashboard data
   */
  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const collector = metricsCollectors.get(sessionId);
      if (!collector) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const [snapshot, recentEvents, healthEvent] = await Promise.all([
        collector.getSnapshot(),
        eventStore.query(sessionId, { limit: 20 }),
        eventStore.query(sessionId, { limit: 1, type: 'health_check' }),
      ]);

      res.json({
        sessionId,
        timestamp: Date.now(),
        metrics: snapshot.summary,
        recentEvents: recentEvents.events,
        health: healthEvent.events.length > 0
          ? {
              status: (healthEvent.events[0].data as any).status,
              checks: (healthEvent.events[0].data as any).checks,
              memory: (healthEvent.events[0].data as any).memory,
            }
          : null,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/observability/export?sessionId=X
   * Export all events for session (JSON)
   */
  router.get('/export', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const events = await eventStore.export(sessionId as string);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="events-${sessionId}.json"`);
      res.json({ sessionId, events, count: events.length });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * POST /api/observability/verify-ordering?sessionId=X
   * Verify event ordering for session
   */
  router.post('/verify-ordering', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId required' });
      }

      const result = await eventStore.verifyOrdering(sessionId);

      res.json({
        sessionId,
        isValid: result.isValid,
        gaps: result.gaps,
        timestamp: Date.now(),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/observability/status
   * Global observability status
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const metrics = await eventStore.getMetrics();

      res.json({
        status: 'operational',
        activeSessions: metricsCollectors.size,
        totalEvents: metrics.totalEvents,
        recentEvents: metrics.recentEvents.slice(0, 10),
        timestamp: Date.now(),
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}

export default createObservabilityRouter;
