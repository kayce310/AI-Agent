/**
 * @file OmniRoute Integration — Main entry point
 * @layer core
 * @created 2026-07-05
 */

export { OmniRouteClient, getOmniRouteClient } from './client.js';
export type { OmniRouteConfig, OmniRouteResponse } from './client.js';

export { OmniRouteApiHandlers, getOmniRouteHandlers } from './handlers.js';
export type { RequestContext } from './handlers.js';
