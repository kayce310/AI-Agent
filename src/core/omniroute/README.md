/**
 * @file OmniRoute Integration Documentation
 * @created 2026-07-05
 */

# OmniRoute Integration for AI-Agent

## Overview

AI-Agent now includes native integration with OmniRoute, allowing seamless communication with OmniRoute's API endpoints. The integration provides:

- **OmniRoute Client**: HTTP client for communicating with OmniRoute server
- **API Handlers**: REST endpoint handlers exposed through AI-Agent's dashboard server
- **Automatic Retry Logic**: Built-in retry mechanism with exponential backoff
- **Error Handling**: Comprehensive error handling and response normalization

## Architecture

### Components

1. **OmniRouteClient** (`src/core/omniroute/client.ts`)
   - Low-level HTTP client for OmniRoute API
   - Handles retries, timeouts, and error management
   - Provides typed methods for common endpoints

2. **OmniRouteApiHandlers** (`src/core/omniroute/handlers.ts`)
   - REST endpoint handlers for AI-Agent's HTTP server
   - Routes requests to appropriate handler methods
   - Manages request parsing and response formatting

3. **Integration** (`src/core/events/http-server.ts`)
   - Integrated into DashboardServer
   - Mounted at `/api/omniroute/` prefix

## API Endpoints

### Available Endpoints

#### Models
```
GET /api/omniroute/models
```
Lists free models available in OmniRoute.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "provider": "openai",
        "modelId": "gpt-4",
        "displayName": "GPT-4",
        "monthlyTokens": 1000000,
        "creditTokens": 500000,
        "freeType": "limited",
        "poolKey": "openai-free-pool",
        "tos": "https://..."
      }
    ]
  },
  "status": 200
}
```

#### Agent Skills
```
GET /api/omniroute/agent-skills?category=api&area=analytics
```
Get agent skills catalog with optional filtering.

**Query Parameters:**
- `category` (optional): "api" or "cli"
- `area` (optional): specific area/domain

**Response:**
```json
{
  "success": true,
  "data": {
    "skills": [...],
    "count": 42,
    "coverage": {...}
  },
  "status": 200
}
```

#### Guardrails
```
GET /api/omniroute/guardrails
```
List registered runtime guardrails and their status.

**Response:**
```json
{
  "success": true,
  "data": {
    "guardrails": [
      {
        "id": "content-policy",
        "name": "Content Policy",
        "enabled": true,
        "version": "2.1"
      }
    ]
  },
  "status": 200
}
```

#### Test Guardrails
```
POST /api/omniroute/guardrails/test
```
Dry-run the guardrail pipeline.

**Request Body:**
```json
{
  "input": "user prompt",
  "context": {...}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "passed": true,
    "results": [...]
  },
  "status": 200
}
```

#### Codex CLI Documentation
```
GET /api/omniroute/docs/codex-cli
```
Get Codex CLI documentation.

#### Generic Proxy
```
POST /api/omniroute/proxy
```
Generic proxy to any OmniRoute endpoint.

**Request Body:**
```json
{
  "method": "GET",
  "path": "/api/some-endpoint",
  "data": {...}
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
import { getOmniRouteClient } from './core/omniroute/index.js';

const client = getOmniRouteClient();

// Get free models
const models = await client.getFreeModels();
if (models.success) {
  console.log('Available models:', models.data.models);
}

// Get agent skills
const skills = await client.getAgentSkills('api');
if (skills.success) {
  console.log('API skills:', skills.data.skills);
}

// Test guardrails
const testResult = await client.testGuardrails({
  input: 'test prompt'
});
```

### HTTP Client / cURL

```bash
# Get models
curl http://localhost:8766/api/omniroute/models

# Get agent skills
curl http://localhost:8766/api/omniroute/agent-skills?category=api

# Get guardrails
curl http://localhost:8766/api/omniroute/guardrails

# Test guardrails
curl -X POST http://localhost:8766/api/omniroute/guardrails/test \
  -H "Content-Type: application/json" \
  -d '{"input":"test"}'

# Generic proxy
curl -X POST http://localhost:8766/api/omniroute/proxy \
  -H "Content-Type: application/json" \
  -d '{"method":"GET","path":"/api/some-endpoint"}'
```

## Configuration

### Environment Variables

The OmniRoute client looks for these environment variables:

- `OMNIROUTE_BASE_URL` (default: `http://localhost:3000`)
- `OMNIROUTE_TIMEOUT` (default: `10000` ms)
- `OMNIROUTE_RETRIES` (default: `3`)

### Programmatic Configuration

```typescript
import { getOmniRouteClient } from './core/omniroute/index.js';

const client = getOmniRouteClient({
  baseUrl: 'https://omniroute.example.com',
  timeout: 15000,
  retries: 5,
});
```

## Error Handling

All responses follow a standard format:

```json
{
  "success": boolean,
  "data": any,
  "error": string,
  "status": number
}
```

### Status Codes

- `200-299`: Success
- `400`: Bad request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `500`: Server error

### Retry Behavior

The client automatically retries failed requests with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: 100ms delay
- Attempt 3: 200ms delay
- etc.

Only network errors and timeouts are retried. HTTP 4xx/5xx responses are not retried.

## Integration with AI-Agent Components

### Using in Agents

```typescript
import { getOmniRouteClient } from '../omniroute/index.js';

export async function agentWithOmniRoute() {
  const client = getOmniRouteClient();
  
  // Get available skills
  const skills = await client.getAgentSkills();
  
  // Use skills in agent logic
  if (skills.success) {
    // Process skills...
  }
}
```

### Event Tracking

OmniRoute API calls are tracked through the event system:

```typescript
import { EventBus } from '../events/bus.js';

// Track OmniRoute API calls
eventBus.emit('api-call', {
  service: 'omniroute',
  endpoint: '/api/models',
  duration: 150,
  status: 200,
});
```

## Troubleshooting

### Connection Refused

If you get "Connection refused" errors:

1. Verify OmniRoute is running on the configured base URL
2. Check firewall/network settings
3. Verify the `OMNIROUTE_BASE_URL` is correct

### Timeout Errors

If requests timeout:

1. Increase `OMNIROUTE_TIMEOUT` environment variable
2. Check OmniRoute server performance
3. Check network latency

### 401/403 Errors

If you get authentication errors:

1. Verify OmniRoute authentication tokens (if required)
2. Check OmniRoute authorization settings
3. Verify request headers are correct

## Performance Considerations

### Caching

Consider implementing caching for frequently accessed endpoints:

```typescript
const skillsCache = new Map();

async function getAgentSkillsCached() {
  if (skillsCache.has('skills')) {
    return skillsCache.get('skills');
  }
  
  const result = await client.getAgentSkills();
  skillsCache.set('skills', result, 3600000); // 1 hour
  return result;
}
```

### Rate Limiting

Be aware of OmniRoute rate limits and implement appropriate throttling.

## Future Enhancements

- WebSocket support for real-time updates
- GraphQL endpoint support
- Authentication token management
- Advanced caching strategies
- Metrics and monitoring integration
