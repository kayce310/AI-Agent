/**
 * free-claude-proxy — OpenRouter Proxy Server (CommonJS)
 * 
 * Nhận request OpenAI-compatible format → forward đến OpenRouter API.
 * Chạy: set OPENROUTER_API_KEY=sk-or-xxx && node server.cjs
 * 
 * Test: curl http://localhost:8082/v1/chat/completions ...
 */

const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 8082;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

const OR_HOST = 'openrouter.ai';
const OR_PATH = '/api/v1/chat/completions';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || !req.url.includes('/v1/chat/completions')) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Only POST /v1/chat/completions is supported' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const requestBody = JSON.parse(body);
      const model = requestBody.model || 'anthropic/claude-3.5-sonnet';

      console.log(`[PROXY] → OpenRouter: model=${model}`);

      const postData = JSON.stringify({
        model: model,
        messages: requestBody.messages,
        temperature: requestBody.temperature ?? 0.7,
        max_tokens: requestBody.max_tokens ?? 4096,
        stream: false,
      });

      const options = {
        hostname: OR_HOST,
        path: OR_PATH,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'HTTP-Referer': 'http://localhost:8082',
          'X-Title': 'Kato Agent Proxy',
        },
      };

      const proxyReq = https.request(options, (proxyRes) => {
        let proxyBody = '';
        proxyRes.on('data', chunk => proxyBody += chunk);
        proxyRes.on('end', () => {
          console.log(`[PROXY] ← OpenRouter: status=${proxyRes.statusCode}`);
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(proxyBody);
        });
      });

      proxyReq.on('error', (err) => {
        console.error(`[PROXY] ❌ Error:`, err.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: { message: `Proxy error: ${err.message}`, type: 'proxy_error' } }));
      });

      proxyReq.write(postData);
      proxyReq.end();

    } catch (err) {
      console.error(`[PROXY] ❌ Parse error:`, err.message);
      res.writeHead(400);
      res.end(JSON.stringify({ error: `Invalid JSON: ${err.message}` }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ free-claude-proxy running on http://localhost:${PORT}`);
  console.log(`🔑 OpenRouter API Key: ${OPENROUTER_API_KEY ? '✓ loaded' : '✗ MISSING'}`);
  console.log(`📋 Test: curl http://localhost:${PORT}/v1/chat/completions ...`);
});