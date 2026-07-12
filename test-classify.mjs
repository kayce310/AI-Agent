// Test classifyResponse logic — 6 required cases
// Mirrors the classifyResponse() function added to agent.ts

function classifyResponse(content, toolCalls) {
  // 1. NEED_TOOL — highest priority
  if (toolCalls.length > 0) return 'NEED_TOOL';

  // 2. NEED_USER — model is asking user for input
  const needUserPatterns = [
    /bạn có thể/i, /bạn vui lòng/i,
    /could you/i, /can you/i, /please provide/i,
  ];
  if (needUserPatterns.some(p => p.test(content))) return 'NEED_USER';

  // 3. PLANNING vs FINAL_ANSWER
  const planningPatterns = [
    /để tôi/i, /tôi sẽ/i, /đang kiểm tra/i, /đang tìm/i,
    /I'll/i, /let me/i,
  ];
  const isPlanningLike = planningPatterns.some(p => p.test(content));
  if (isPlanningLike) {
    const explanationPatterns = [/để tôi giải thích/i];
    const isExplanation = explanationPatterns.some(p => p.test(content));
    if (isExplanation || content.length > 200) return 'FINAL_ANSWER';
    return 'PLANNING';
  }

  // 4. Everything else is FINAL_ANSWER
  return 'FINAL_ANSWER';
}

// ── Test cases ──
let pass = 0;
let fail = 0;

function testCase(label, content, toolCalls, expected) {
  const result = classifyResponse(content, toolCalls || []);
  const status = result === expected ? 'PASS' : 'FAIL';
  if (status === 'PASS') pass++; else fail++;
  console.log(`${status}: ${label} → ${result} (expected ${expected})`);
}

// Case 1: "Kết quả là X" → FINAL_ANSWER
testCase('Case 1: plain answer', 'Kết quả là 42.', [], 'FINAL_ANSWER');

// Case 2: "Để tôi giải thích..." (long, >200 chars) → FINAL_ANSWER
const longExplanation = 'Để tôi giải thích cơ chế hoạt động của hệ thống này. ' +
  'Nó bao gồm nhiều thành phần tương tác với nhau. ' +
  'Thành phần đầu tiên là bộ xử lý trung tâm, nơi nhận tất cả các yêu cầu. ' +
  'Sau đó, nó phân tích và chuyển tiếp đến các module chức năng thích hợp. ' +
  'Mỗi module có nhiệm vụ riêng và trả về kết quả cho bộ xử lý trung tâm.';
testCase('Case 2: explanation (>200 chars)', longExplanation, [], 'FINAL_ANSWER');

// Case 2b: "Để tôi giải thích..." (short, <200 chars) → FINAL_ANSWER (because has "giải thích")
testCase('Case 2b: short explanation', 'Để tôi giải thích cơ chế này nhé.', [], 'FINAL_ANSWER');

// Case 3: "Để tôi kiểm tra file" + toolCalls=[] → PLANNING
testCase('Case 3: planning action', 'Để tôi kiểm tra file cấu hình.', [], 'PLANNING');

// Case 4: toolCalls=[search_tool] → NEED_TOOL
testCase('Case 4: has tool calls', 'Kết quả là X.', [{function: {name: 'search'}}], 'NEED_TOOL');

// Case 5: "Bạn có thể cho biết thêm không?" → NEED_USER
testCase('Case 5: asking user', 'Bạn có thể cho biết thêm thông tin về vấn đề này?', [], 'NEED_USER');

// Case 6: content="" + toolCalls=[] → FINAL_ANSWER (no crash)
testCase('Case 6: empty content', '', [], 'FINAL_ANSWER');

// Extra: "could you" → NEED_USER
testCase('Extra: could you', 'Could you please provide the details?', [], 'NEED_USER');

// Extra: "Tôi sẽ làm" (short, <200, no explanation) → PLANNING
testCase('Extra: toi se lam', 'Tôi sẽ kiểm tra file log.', [], 'PLANNING');

// Extra: content > 200 chars with planning signal → FINAL_ANSWER (heuristic)
const longPlanning = 'Tôi sẽ kiểm tra toàn bộ hệ thống một cách chi tiết. ' +
  'Tuy nhiên, trước hết tôi cần xem xét cấu hình hiện tại. ' +
  'Sau đó tôi sẽ đối chiếu với yêu cầu của bạn. ' +
  'Cuối cùng tôi sẽ đưa ra kết luận phù hợp nhất với tình huống này. ';
testCase('Extra: long planning (>200 chars)', longPlanning, [], 'FINAL_ANSWER');

console.log(`\n=== RESULTS: ${pass} PASS, ${fail} FAIL ===`);
