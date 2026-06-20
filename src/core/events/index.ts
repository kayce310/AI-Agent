/**
 * @file Events Module — Public API
 * @layer core
 * @created 2026-06-20
 */

// Types & Schemas
export * from './types.js';

// Validation
export * from './validator.js';

// Factory
export * from './factory.js';

// Storage
export * from './store.js';

// Bus
export * from './bus.js';

// Logger
export * from './logger.js';

// WebSocket (optional - requires ws package)
export { EventWebSocket } from './websocket.js';

// API
export * from './api.js';
