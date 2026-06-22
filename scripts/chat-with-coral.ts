/**
 * Chat with Coral directly via its engine
 */
import { Engine, EngineRequest } from '../src/core/engine/engine.js';
import { Logger } from '../src/core/logger.js';
import { DefaultAgentRegistry } from '../src/core/agents/agent-registry.js';
import { ProviderRegistry } from '../src/core/llm/provider-registry.js';
import { ModelAdapter } from '../src/core/llm/model-adapter.js';
import { ToolRegistry } from '../src/core/tools/registry.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function chatWithCoral() {
  const log = new Logger({ minLevel: 'error', json: false });

  // Initialize Coral's engine with all dependencies
  const providerRegistry = new ProviderRegistry();
  const modelAdapter = new ModelAdapter(providerRegistry);
  const agentRegistry = new DefaultAgentRegistry();
  const toolRegistry = new ToolRegistry();

  const engine = new Engine({
    modelAdapter,
    agentRegistry,
    toolRegistry,
    memoryDir: path.join(__dirname, '..', 'knowledge', 'memory'),
    logger: log,
  });

  // Send a complex task
  const request: EngineRequest = {
    messageId: 'test-1',
    text: 'Nghiên cứu thiết bị IoT, so sánh ưu nhược điểm ESP32 vs Raspberry Pi, đề xuất giải pháp tốt nhất cho smart home',
    userId: 'test-tor',
    sessionId: 'chat-session-1',
    userName: 'Tor',
    isNewSession: false,
    attachments: [],
    timestamp: Date.now(),
  };

  console.log('🌊 Gửi yêu cầu phức tạp tới Coral...');
  console.log(`   "${request.text}"`);
  console.log();

  const start = Date.now();
  const response = await engine.process(request);
  const duration = Date.now() - start;

  console.log(`✅ Phản hồi sau ${duration}ms:`);
  console.log('─'.repeat(50));
  console.log(response.text?.substring(0, 1000) || '(empty response)');
  console.log('─'.repeat(50));

  if (response.text) {
    console.log(`\n📊 Độ dài: ${response.text.length} ký tự`);
  }

  await log.end();
}

chatWithCoral().catch(console.error);
