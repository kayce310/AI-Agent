/**
 * Kato Agent — CLI Mock Test
 * 
 * Chạy: npx tsx scripts/test-engine-cli.ts
 * 
 * Kiểm tra Engine hoạt động không cần Discord.
 * Nếu chạy được → Engine platform-agnostic OK.
 */

import Engine from '../src/core/engine.js';
import { EngineRequest } from '../src/core/types.js';

async function main() {
  console.log('🧪 Kato Engine CLI Test');
  console.log('='.repeat(40));

  // 1. Khởi tạo Engine
  const engine = new Engine();
  await engine.init();

  // 2. Liệt kê models
  const models = engine.listModels();
  console.log(`\n📋 Models available (${models.length}):`);
  models.forEach(m => console.log(`   - ${m}`));

  // 3. Tìm model free (kết thúc bằng ":free")
  const freeModels = models.filter(m => m.endsWith(':free'));
  const claudeModels = models.filter(m => m.toLowerCase().includes('claude'));
  
  // Ưu tiên: Claude free > bất kỳ free nào > model đầu tiên
  let targetModel = claudeModels.find(m => m.endsWith(':free')) 
    || freeModels[0] 
    || models[0];

  console.log(`\n🎯 Targeting model: ${targetModel}`);

  // 4. Gửi request test
  const request: EngineRequest = {
    messages: [
      { role: 'user', content: 'Xin chào! Hãy trả lời bằng 1 câu ngắn: 1+1 bằng mấy?', timestamp: Date.now() }
    ],
    modelId: targetModel,
    agentName: 'Kato',
    protocol: 'CLI Test',
    mentionPrefix: '@Kato',
  };

  console.log(`\n📤 Sending request to engine...`);
  console.log(`   model: ${request.modelId}`);
  
  const response = await engine.process(request);

  console.log(`\n📥 Response:`);
  console.log(`   Model used: ${response.modelUsed}`);
  console.log(`   Provider:   ${response.providerUsed}`);
  console.log(`   Content:    ${response.content.substring(0, 200)}${response.content.length > 200 ? '...' : ''}`);
  
  if (response.providerUsed !== 'none') {
    console.log(`\n✅ TEST PASSED — Engine platform-agnostic OK`);
  } else {
    console.log(`\n⚠️ TEST PARTIAL — All models unreachable (expected if no backend running)`);
  }
}

main().catch(err => {
  console.error('❌ CLI Test failed:', err);
  process.exit(1);
});