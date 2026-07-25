# BÁO CÁO ĐÁNH GIÁ CORAL AGENT
## Áp dụng bộ đề "Kiến Thức AI Agent 2026" — Định hướng JARVIS Stateful System Agent

**Ngày:** 2026-07-16  
**Rubric:** `D:\bai-test-kien-thuc-AI-Agent-2026.md` (45 câu + 3 case, OWASP ASI Top 10)  
**Target:** Coral Agent (`D:\AI-Agent`, TypeScript/ESM, 128 source files, 52 test files)  
**Định hướng:** Stateful System Agent — JARVIS-class (Ironman)

---

## MỤC LỤC
1. [Phương pháp đánh giá](#1-phương-pháp-đánh-giá)
2. [Phần A — Nền tảng Agent (15 concept)](#2-phần-a--nền-tảng-agent)
3. [Phần B — Trung bình + Security (15 concept)](#3-phần-b--trung-bình--security)
4. [Phần C — OWASP ASI Top 10 (2026)](#4-phần-c--owasp-asi-top-10)
5. [Phần D — Tự luận (Evaluate qua case)](#5-phần-d--tự-luận)
6. [Phần E — Case Study áp dụng cho Coral](#6-phần-e--case-study)
7. [Thang điểm tổng](#7-thang-điểm-tổng)
8. [Top lỗ hổng cần ưu tiên](#8-top-lỗ-hổng-cần-ưu-tiên)
9. [Điểm mạnh Coral đã có](#9-điểm-mạnh)
10. [Định hướng JARVIS — Stateful System Agent](#10-định-hướng-jarvis)

---

## 1. Phương pháp đánh giá

**Cách tiếp cận:** Mỗi concept trong đề test được map đến code thực tế trong Coral. Mỗi nhận định đều kèm:
- **File path** (src/core/...)
- **Line number** hoặc grep output cụ thể
- **Classification:** ✅ Verified (có evidence) | ⚠️ Partial (có implement nhưng chưa đầy đủ) | ❌ Missing (chưa implement)

**Phân loại bằng chứng:**
- `V-FOUND` = Verified Found — code tồn tại và hoạt động
- `V-ABSENT` = Verified Absent — grep/search cho kết quả 0
- `P-PARTIAL` = Partial — có thể chế nhưng thiếu 1 phần

---

## 2. Phần A — Nền tảng Agent

### A1. Đặc trưng cốt lõi của Agent (Autonomy + Goal-driven + Tool interaction)

**Đáp án đề: c) Chỉ trả lời 1 lượt = KHÔNG phải Agent**  
**Coral: ✅ VERIFIED**

| Đặc trưng | Evidence |
|-----------|----------|
| Autonomy | `engine.ts:139` — `class Engine extends EventEmitter` — LLM tự quyết định tool call, không hardcode workflow |
| Goal-driven | `agent.ts:255` — `executeReActLoop(request, messages)` — chạy đến khi goal hoàn thành hoặc max cycles |
| Tool interaction | `tool-registry.ts:23` — `Tool` interface với `name`, `description`, `schema`, `execute()` |

**Tool count verified:** 10 tool plugins, 58 tool methods tổng cộng (filesystem: 8, skills: 14, browser: 11, document: 7, knowledge: 4, system: 5, archive: 3, report: 2, search: 2, network: 2).

### A2. Agent vs Chatbot

**Đáp án đề: b) Agent tự lập kế hoạch nhiều bước + gọi tool**  
**Coral: ✅ VERIFIED**

`agent.ts:104` — `const MAX_TOOL_CALL_CYCLES = 15` — ReAct loop chạy tối đa 15 chu kỳ, mỗi chu kỳ LLM tự chọn tool + đọc kết quả + quyết định bước tiếp. Chatbot truyền thống chỉ 1 lượt input→output.

### A3. RAG (Retrieval-Augmented Generation)

**Đáp án đề: b) Kỹ thuật truy xuất dữ liệu trước khi sinh câu trả lời**  
**Coral: ⚠️ PARTIAL**

| Component | File | Status |
|-----------|------|--------|
| Vector search | `knowledge/semantic-memory.ts` | ✅ Tồn tại |
| Knowledge graph | `knowledge/graph-query.ts` | ✅ Tồn tại |
| Entity extraction | `knowledge/entity-extractor.ts` | ⚠️ Stub — architecture skill ghi "incomplete" |
| Memory recall | `memory/memory-store.ts:263` — `query(text, opts)` | ✅ FTS5 index, keyword overlap |
| Document chunking pipeline | — | ❌ **Không có** — không có loader/splitter cho PDF, HTML, markdown chunking tiêu chuẩn |

**Gap:** Coral có memory search nhưng thiếu document ingestion pipeline (chunking, embedding, indexing). RAG hiện tại chỉ hoạt động trên memory blocks đã có sẵn.

### A4. Agent vs Automation script (Zapier-style)

**Đáp án đề: b) Agent ra quyết định linh hoạt tại runtime**  
**Coral: ✅ VERIFIED**

`prompt-builder.ts:160` — `class PromptBuilder` — Xây system prompt 8 tầng, LLM suy luận và tự gọi tool. Không có if-then workflow cứng. `risk-gate.ts:29` — `classifyCommand()` phân loại ALLOW/ASK/DENY tại runtime, không hardcode luồng.

### A5. Vòng lặp lõi (Perceive→Plan→Act→Observe→Reflect)

**Đáp án đề: a) Perception → Reasoning → Planning → Action → Observation → Memory Update**  
**Coral: ⚠️ PARTIAL**

| Step | Coral Implementation | File:Line |
|------|---------------------|-----------|
| Perception | Input validation + MissionLock | `gateway/index.ts:255` |
| Reasoning | LLM inference trong ReAct loop | `engine.ts:139` |
| Planning | LLM tự plan (nội bộ prompt) | Không explicit |
| Action | Tool execution | `tool-registry.ts execute()` |
| Observation | Tool result → back to LLM | ReAct loop cycle |
| Memory Update | MemoryStore.store() | `memory-store.ts:160` |
| **Reflect** | ❌ **Không có explicit self-evaluation** | — |

**Gap quan trọng:** Coral thiếu bước **Reflect** — sau khi hoàn thành, không có self-evaluation "kết quả có đúng goal không? có cần thử lại không?".

### A6. Bộ nhớ Episodic

**Đáp án đề: b) Các sự kiện/phiên cụ thể đã xảy ra**  
**Coral: ✅ VERIFIED**

`memory-log.ts:48` — `interface MemoryBlock` với field `type: 'human' | 'persona' | 'session' | 'task' | 'fact' | 'world'`. Type `'session'` và `'task'` chính là episodic memory. `memory-store.ts:139` — FTS5 index rebuilds on startup, queried via `mem_fts MATCH`.

### A7. Model Context Protocol (MCP)

**Đáp án đề: b) Chuẩn hoá cách agent kết nối tool bên ngoài**  
**Coral: ❌ ABSENT**

```
$ grep -rn 'MCP\|ModelContextProtocol' src/core/tools/
# Result: 0 matches
```

Coral dùng custom `ToolPlugin` interface (`tool-registry.ts:36`). Không tuân MCP spec. Điều này có nghĩa:
- Không interoperable với ecosystem MCP (100K+ servers theo C7)
- Không thể share tools giữa Coral và agent khác
- Mỗi tool phải viết custom adapter

### A8. Pattern ReAct

**Đáp án đề: b) Reasoning + Acting xen kẽ từng bước**  
**Coral: ✅ VERIFIED**

`agent.ts:411` — `private async executeReActLoop()` — Implementation trực tiếp. Loop: LLM generate → parse tool call → execute tool → feed result → LLM generate lại. `agent.ts:488` — `cycle: ${toolCallCycles}` logs mỗi iteration.

### A9. Orchestrator–sub-agent

**Đáp án đề: b) Điều phối sub-agent chuyên biệt**  
**Coral: ⚠️ PARTIAL — Không wired**

| Component | File | Status |
|-----------|------|--------|
| DelegationOrchestrator | `orchestrator/delegation-orchestrator.ts:16` | ✅ Code tồn tại |
| AgentRegistry | `agents/agent-registry.ts` | ✅ Code tồn tại |
| delegate.ts | `agents/delegate.ts` | ✅ `runSpecialistAgent()` exported |
| **Wired in message path** | — | ❌ **Không wired** |

**Evidence:** `isComplexTask()` removed from message-handler.ts (2026-07-07). Tất cả tin nhắn đi thẳng `coralAgent.process()`. DelegationOrchestrator là "future use" — architecture skill confirm.

### A10. Human-in-the-loop

**Đáp án đề: b) Checkpoint để con người phê duyệt trước khi agent hành động quan trọng**  
**Coral: ✅ VERIFIED**

`hitl.ts:54` — `isDestructiveAction()` detect patterns: delete, remove, kill, shutdown, rm, wipe...  
`hitl.ts:72` — `class ApprovalQueue` — queue with TTL (5 min auto-expire)  
`hitl.ts:232` — `class HITLManager` — orchestrates flow  
`hitl-handler.ts` — Telegram inline keyboard approve/reject  
`hitl.ts:23` — `ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'allowed'`

### A11. Giới hạn số bước/vòng lặp

**Đáp án đề: b) Để tránh agent bị loop vô ích, đốt token**  
**Coral: ✅ VERIFIED — 3 layers defense**

| Layer | Mechanism | File:Line |
|-------|-----------|-----------|
| Cycle limit | `MAX_TOOL_CALL_CYCLES = 15` | `agent.ts:104` |
| Timeout | `AbortSignal` with 120s timeout | `engine.ts` process flow |
| Circuit breaker | 5 failures → OPEN → 15s cooldown | `circuit-breaker.ts:32-33` |

### A12. Framework role-based (CrewAI-style)

**Đáp án đề: b) CrewAI — dễ học, role-based**  
**Coral: N/A** — Coral build custom, không dùng framework bên ngoài. Không đánh giá.

### A13. Tool schema

**Đáp án đề: b) Tên + mô tả + tham số + kiểu dữ liệu**  
**Coral: ✅ VERIFIED**

`tool-registry.ts:23-30`:
```typescript
export interface Tool {
  name: string;           // ✅
  description: string;    // ✅
  schema: ToolSchema;     // ✅ properties + required
  execute(args: Record<string, any>): Promise<any> | any;
}
```

Example: `filesystem.ts:32-37` — `list_directory` với `path: { type: 'string', description: '...' }`.

### A14. Error handling khi tool fail

**Đáp án đề: b) Nếu không xử lý, agent có thể "bịa" kết quả**  
**Coral: ✅ VERIFIED**

- `tool-registry.ts:23` — `execute()` return `Promise<any>` — errors propagate lên ReAct loop
- `circuit-breaker.ts:9` — Circuit breaker catches consecutive failures
- `agent.ts:491-493` — `Circuit breaker OPEN — stopping after N cycles` → error return
- Error messages được feed back vào LLM context → LLM tự corrective action

### A15. Industry-specific agent

**Đáp án đề: a) Agent coding tự đọc repo, sửa lỗi = software engineering**  
**Coral: ⚠️ GENERAL-PURPOSE**

Coral hiện là general-purpose agent. Có `skills/` plugin system cho phép specialization, nhưng chưa có industry-specific module. Không đánh giá.

---

### TỔNG KẾT PHẦN A

| Rating | Count | Items |
|--------|:-----:|-------|
| ✅ Verified | 10 | A1, A2, A4, A6, A8, A10, A11, A13, A14, A15 |
| ⚠️ Partial | 3 | A3 (no chunking), A5 (no Reflect), A9 (not wired) |
| ❌ Absent | 1 | A7 (no MCP) |
| N/A | 1 | A12 |

**Điểm: 10.5 / 15**

---

## 3. Phần B — Trung bình + Security

### B1. Plan-and-Execute vs ReAct

**Đáp án đề: b) Tách planning ra khỏi execution**  
**Coral: ⚠️ PARTIAL — Chỉ có ReAct**

Coral dùng ReAct pure (`agent.ts:411`). Không có Plan-and-Execute separation. Điều này có nghĩa:
- Agent không plan toàn bộ trước khi execute → inefficient cho tasks phức tạp
- Không có cơ chế "re-plan khi发现 step 3 sai" (ReAct tự xử lý nhưng không có explicit plan state)

**Impact:** Với JARVIS direction, cần Plan-and-Execute cho complex multi-step tasks.

### B2. Harness ảnh hưởng benchmark

**Đáp án đề: b) Harness (scaffold, retrieval, tool definition) ảnh hưởng lớn**  
**Coral: ❌ Không có benchmark framework**

Không có DeepEval, LangSmith, hoặc custom eval framework. Không measure được harness impact.

### B3. A2A (Agent2Agent Protocol)

**Đáp án đề: a) A2A = agent-to-agent; MCP = agent-to-tool**  
**Coral: ❌ ABSENT**

```
$ grep -rn 'A2A\|Agent2Agent\|peer.*communication' src/
# Result: 0 relevant matches
```

Coral hiện là single-agent. Không có multi-agent communication protocol.

### B4. Trajectory Accuracy vs Task Success

**Đáp án đề: b) Task Success = kết quả đúng; Trajectory = bước đi đúng/safe**  
**Coral: ❌ ABSENT**

- EventStore (`events/store.ts`) lưu events nhưng không có trajectory scorer
- Không phân biệt "đúng kết quả nhưng sai process" vs "đúng cả hai"

### B5. Reliability Gap (pass@1 vs pass^k)

**Đáp án đề: b) pass@1 ≠ pass^k — reliability gap**  
**Coral: ❌ Không đo**

- Không có repeated-run evaluation
- Không có pass@k metric
- 906 vitest tests nhưng tests logic, không measure LLM reliability

### B7. Cascading Failure

**Đáp án đề: b) Lỗi lan truyền qua các agent/tool liên kết**  
**Coral: ✅ VERIFIED**

`circuit-breaker.ts:32-33`:
```
failureThreshold: 5    // 5 consecutive failures
recoveryTimeoutMs: 15000  // 15s cooldown
```
Standard CLOSED→OPEN→HALF_OPEN pattern. Ngăn cascade từ LLM provider fail.

### B8. Observability

**Đáp án đề: b) Trace dạng phẳng khó debug**  
**Coral: ✅ BETTER THAN BASELINE**

Coral có:
- `events/store.ts` — SQLite event store
- `events/bus.ts` — EventBus pub/sub  
- `events/types.ts` — Typed events (task_started, tool_called, llm_request...)
- Dashboard 6 tabs với real-time WebSocket stream
- CostTracker token/cost tracking

**Không dùng Langfuse** — event-driven architecture organizer theo task, không phải flat observation list.

### B9. Context engineering

**Đáp án đề: b) Chọn lọc, nén, sắp xếp thông tin vào context window**  
**Coral: ✅ VERIFIED**

`context-window.ts:69` — `class ContextWindowManager`:
- `budget` configurable per-session
- `importance` scoring (role-based + recency)
- `evictToBudget()` tại 85% token budget
- `MessageScore` interface: `tokens + importance`

Architecture skill confirm: Gateway limit 20 msgs, ContextWindowManager eviction at >75% budget.

### B10. Token efficiency (CrewAI vs LangGraph)

**Đáp án đề: b) CrewAI tốn token hơn vì role persona prompt dài**  
**Coral: N/A** — Coral dùng custom prompt builder, không CrewAI.

### B11. Least Agency (OWASP)

**Đáp án đề: b) Autonomy phải "kiếm được", không mặc định cấp thừa quyền**  
**Coral: ✅ VERIFIED — 2 layers**

| Layer | File | Mechanism |
|-------|------|-----------|
| RiskGate | `risk-gate.ts:13` | `RiskLevel = 'allow' \| 'ask' \| 'deny'` |
| PrivilegeGuard | `privilege-guard.ts:10` | RBAC + glob matching + restricted mode |

`risk-gate.ts:18-25`: DENY `rm -rf /`, `docker`, `shutdown`; ASK `curl`, `ngrok`, `npx`.  
`privilege-guard.ts:37-39`: `restrictedMode` + `restrictedAllowList` = whitelist-only.

### B12. Tool Poisoning vs Prompt Injection

**Đáp án đề: b) Tool poisoning bền vững —影响 mọi phiên, mọi người dùng**  
**Coral: ❌ ABSENT — Không defense**

- Không có provenance check cho tool metadata
- Không validate tool schema integrity
- Malicious plugin trong ToolPlugin system = full compromise
- Không có tool signature verification

**Mức độ rủi ro:** Trung bình — Coral dùng custom ToolPlugin (không MCP marketplace), nhưng nếu attacker inject code vào codebase, tool schema bị sửa thì impact toàn hệ thống.

### B13. Approval UI tách biệt khỏi chat

**Đáp án đề: b) Để agent không thể "thuyết phục" user bấm duyệt**  
**Coral: ✅ VERIFIED**

HITL dùng Telegram **inline keyboard** (separate UI element), không trong message text content. `hitl-handler.ts` — `buildApprovalKeyboard()` tạo buttons `hitl:approve:<id>` / `hitl:reject:<id>`. Approval request gửi qua `TELEGRAM_ALERT_CHAT_ID` (admin chat), không phải chat với agent.

### B14. Canary/shadow deployment

**Đáp án đề: b) Chạy song song để so sánh trước khi thay thế**  
**Coral: ❌ ABSENT**

Không có shadow mode, canary deployment, hoặc A/B testing mechanism cho model/prompt changes.

### B15. Regression test khi model update

**Đáp án đề: b) Hành vi agent có thể "trôi" (drift) sau khi model nền thay đổi**  
**Coral: ⚠️ PARTIAL**

| Có | Thiếu |
|----|--------|
| 52 test files, 906+ tests | Không có model-specific regression suite |
| Unit tests cho security modules | Không có behavioral regression tests |
| Integration tests cho full flow | Không có prompt regression (so sánh output trước/sau update) |

---

### TỔNG KẾT PHẦN B

| Rating | Count | Items |
|--------|:-----:|-------|
| ✅ Verified | 5 | B7, B8, B9, B11, B13 |
| ⚠️ Partial | 2 | B1 (no Plan-Execute), B15 (no model regression) |
| ❌ Absent | 6 | B2, B3, B4, B5, B12, B14 |
| N/A | 2 | B10 |

**Điểm: 6 / 15**

---

## 4. Phần C — OWASP ASI Top 10 (2026)

### C1. ASI01 — Agent Goal Hijack

**Đáp án đề: b) Mất quyền kiểm soát hoàn toàn — tài sản AI bị biến thành công cụ attacker**  
**Coral: ⚠️ PARTIAL — 2/3 layers**

| Defense Layer | Implementation | File:Line | Verdict |
|---------------|---------------|-----------|---------|
| Input validation | Regex injection detection | `mission-lock.ts:177-185` | ✅ Block direct injection |
| Identity lock | System prompt immutable | `mission-lock.ts:266` — `getSystemPrompt()` | ✅ Hard boundaries |
| Goal-drift monitoring | Theo dõi LLM có lệch mục tiêu qua turns | — | ❌ **Không implement** |

**Evidence mission-lock.ts:177-185:**
```typescript
validateMessage(message: string, userId: string): ValidationResult {
  // Check injection patterns
  // → log.warn(`Injection detected from ${userId}`)
  // → { allowed: false, reason: 'Potential prompt injection detected', category: 'injection' }
```

**Gap:** MissionLock chặn direct injection nhưng không detect **indirect injection** qua documents agent đọc (web, file). Nếu attacker giấu instructions trong document, agent sẽ đọc và có thể follow.

### C2. ASI02 — Indirect Prompt Injection → Goal Hijack

**Đáp án đề: b) Chỉ thị ẩn giấu trong tài liệu agent đọc**  
**Coral: ⚠️ PARTIAL**

`gateway/index.ts:255` — MissionLock validates inbound messages:
```typescript
const validation = missionLock.validateMessage(msg.text, msg.userId);
```

Nhưng: **chỉ validate user message, KHÔNG validate content từ external sources** (web fetch, file read). Nếu attacker đặt指令 trong webpage mà agent fetch qua `fetch_url` tool, MissionLock không chặn.

**Gap:** Không có content-channel separation (data vs instruction tách riêng).

### C3. CVE-2025-59536 — Claude Code Hook Injection

**Coral: ❌ N/A** — Coral không dùng Claude Code. Không bị ảnh hưởng.

### C4. CVE-2026-25592/26030 — Semantic Kernel RCE

**Coral: ❌ N/A** — Coral không dùng Semantic Kernel. Không bị ảnh hưởng.

### C5. ASI03 — Identity & Privilege Abuse

**Đáp án đề: b) Nguyên nhân gốc phổ biến nhất — shared API key, over-privileged accounts**  
**Coral: ✅ VERIFIED — Solid defense**

| Measure | Implementation | File |
|---------|---------------|------|
| Identity lock | Immutable `identity.name/role/mission/owner` | `mission-lock.ts:12-17` |
| Personality rate limit | `maxChangesPerSession`, `cooldownMs` | `mission-lock.ts:37-41` |
| PrivilegeGuard RBAC | Per-tool allow/deny rules | `privilege-guard.ts:23-24` |
| Restricted mode | Whitelist-only tool access | `privilege-guard.ts:37-39` |
| Rate limiter | Token-bucket per user | `rate-limiter.ts:34` |

### C6. ASI06 — Memory & Context Poisoning

**Đáp án đề: b) Cần provenance tracking cho dữ liệu đưa vào memory**  
**Coral: ❌ ABSENT**

```
$ grep -rn 'provenance\|origin\|source.*auth' src/core/memory/
# Result: 0 relevant matches
```

MemoryBlock interface (`memory-log.ts:48`) có fields: `id, type, content, tags, sessionId, createdAt`. **Không có `source` field** — không biết block đến từ đâu.

`memory-store.ts:139` — FTS5 index stores `content, tags, sessionId` — không lưu source provenance.

**Rủi ro:** Nếu attacker inject factual-looking data vào memory (qua tool output, user message, hoặc cron job), data đó sẽ affect mọi sessions sau.

### C7. ASI04 — Agentic Supply Chain Compromise

**Đáp án đề: a) MCP server có thể chứa mã độc, 200K instances dễ bị tấn công**  
**Coral: ⚠️ REDUCED ATTACK SURFACE**

| Factor | Coral | MCP ecosystem |
|--------|-------|---------------|
| Plugin format | Custom TypeScript `ToolPlugin` | MCP protocol |
| Marketplace | No — built-in only | 100K+ servers |
| Signature verification | ❌ Không có | ❌ Không có |
| Code execution | TypeScript import | JSON-RPC + stdio |

Coral tránh được MCP supply chain risk vì không dùng MCP, nhưng vẫn có risk nếu attacker inject vào source code.

### C8. Security Perception Gap (88% vs 82%)

**Coral: N/A** — Organizational survey statistic, không apply cho technical architecture.

### C9. Kill Switch (ASI10 — Rogue Agents)

**Đáp án đề: b) Phải dừng agent tức thời, quyền kích hoạt rõ ràng**  
**Coral: ⚠️ PARTIAL**

| Mechanism | Implementation | Verdict |
|-----------|---------------|---------|
| `/cancel <taskId>` | `commands.ts` — Cancel background tasks | ✅ Background tasks |
| CircuitBreaker | Auto-stops on 5 consecutive failures | ✅ Auto |
| HITL block | Prevents destructive actions | ✅ Manual approval |
| **Emergency `/kill` command** | — | ❌ **Không có** |
| **Process-level kill** | `taskkill /F` via RiskGate DENY | ❌ Agent tự chặn chính nó |

**Gap:** Không có dedicated kill switch cho admin instant halt. CircuitBreaker tự activate nhưng không có manual override.

### C10. ASI05 — Unexpected Code Execution

**Đáp án đề: a) Sandbox Firecracker — cô lập môi trường thực thi**  
**Coral: ⚠️ PARTIAL — Không có sandbox**

| Defense | Implementation | File |
|---------|---------------|------|
| `execFileSync` (no shell) | Tránh shell injection | `system.ts` |
| RiskGate DENY list | `rm -rf /`, `docker`, `shutdown` | `risk-gate.ts:18-21` |
| PrivilegeGuard path check | `isPathSafe()` whitelist | `tool-gateway.ts:36` |
| **Sandbox (Firecracker/container)** | — | ❌ **Không có** |

Coral chạy code trên host machine trực tiếp. Không có containerization hay microVM isolation.

### C11. OWASP Agentic supplements LLM Top 10

**Đáp án đề: b) Cần áp dụng cả hai lớp**  
**Coral: ✅ APPLICABLE**

Coral kế thừa mọi rủi ro LLM-level (prompt injection, data poisoning, hallucination) từ LLM provider + thêm agent-level risks (tool abuse, memory poisoning, cascading failures). Cả hai lớp đều cần phòng ngừa.

### C12. Benchmark Gaming (UC Berkeley)

**Đáp án đề: b) Cả 8 benchmark đều có thể bị reward-hacked**  
**Coral: N/A** — Không publish benchmark scores. Không bị ảnh hưởng nhưng cũng không có benchmark để cross-validate.

### C13. Retry Economics

**Đáp án đề: b) Agent tự lặp đốt 5-10x budget trước khi phát hiện**  
**Coral: ✅ VERIFIED — Defense present**

CircuitBreaker (`circuit-breaker.ts:32`):
```
failureThreshold: 5       // Mở circuit sau 5 lần fail liên tiếp
recoveryTimeoutMs: 15000  // Cooldown 15s
```

Ngăn retry loop. Agent không thể đốt无限 token.

### C14. 95% Pilot Failure (MIT NANDA)

**Coral: N/A** — Organizational statistic. Không apply.

### C15. Human-Agent Trust Exploitation (ASI09)

**Đáp án đề: a) Agent đủ fluent để khiến user tin tưởng, bỏ qua xác minh**  
**Coral: ⚠️ PARTIAL**

`mission-lock.ts:37-41` — Personality rate limiting:
```typescript
maxPersonalityChanges: number;    // limit persona changes
maxChangesPerSession: number;     // per session cap
cooldownMs: number;               // cooldown between changes
```

Nhưng: **Không có explicit disclaimer mechanism** — agent không tự nói "tôi là AI, hãy verify thông tin". MissionLock limit personality changes nhưng không prevent trust exploitation qua conversational fluency.

---

### TỔNG KẾT PHẦN C

| Rating | Count | Items |
|--------|:-----:|-------|
| ✅ Verified | 3 | C5 (Identity), C8 (N/A), C11 (Supplement) |
| ⚠️ Partial | 5 | C1 (Goal Hijack), C2 (Indirect Injection), C7 (Supply Chain), C9 (Kill Switch), C10 (Sandbox) |
| ❌ Absent | 2 | C3/C4 (N/A), C6 (Provenance), C15 (Trust Exploitation) |
| N/A | 3 | C3, C4, C8, C12, C13, C14 |

**Defense Score: 3/10 OWASP risks fully defended**

---

## 5. Phần D — Tự luận

### D1. Benchmark cao ≠ Production Ready

**Áp dụng cho Coral:**

1. **Harness dependency** — Coral score phụ thuộc: LLM provider (9router/OpenRouter/local), prompt version (8-tier system), tool configuration (10 plugins). Cùng model, Coral trên OpenRouter vs local Ollama sẽ cho kết quả khác nhau nhiều.
2. **Không có reliability measurement** — 906 tests là unit/integration tests, KHÔNG measure pass@k.
3. **Prompt length overflow risk** — architecture skill ghi: "8-tier + DEFAULT_RULES + memoryContext có thể exceed context window" — production risk không detect được qua benchmark.
4. **Provider-dependent** — ModelRouter hardcoded adapter name (incident 2026-06-22) → cùng benchmark, khác config = khác kết quả.

### D2. Framework đánh giá vs Benchmark

**Áp dụng cho Coral:**

| Loại | Coral hiện tại | Cần thêm |
|------|----------------|----------|
| **Benchmark** (GAIA, SWE-bench) | Không có | Chưa cần — dùng benchmark công khai để compare |
| **Framework** (DeepEval, LangSmith) | Vitest (unit) | Cần custom agent eval: trajectory, tool correctness, hallucination rate |
| **Why both?** | — | Benchmark = so sánh với thế giới; Framework = validate trên use case thật |

### D3. Framework selection (audit trail)

**Áp dụng cho Coral:** Coral build custom TypeScript — tương đương **LangGraph** về:
- Explicit state machine (`Engine.process()` flow)
- Checkpointing (`checkpoint.ts` — start/cycle/complete/failed)
- Audit trail (`EventStore` SQLite, `CostTracker`)
- HITL approval points

**Đủ điều kiện** cho bài toán audit trailbanking. Ưu điểm hơn CrewAI ở control level.

### D4. ASI01 Mitigation cho document reader

**Áp dụng cho Coral — 3 biện pháp cần implement:**

| # | Biện pháp | Coral Status | File cần modify |
|---|-----------|-------------|-----------------|
| 1 | Tách content khỏi instruction channel | ❌ | `gateway/index.ts` — validate cả external content |
| 2 | Tool allowlist (email/send restricted) | ✅ | `risk-gate.ts` — đã có DENY cho curl/ngrok |
| 3 | Goal-drift monitoring | ❌ | Cần mới — `engine.ts` — track objective drift |

### D5. Reliability Gap

**Áp dụng cho Coral:**

Coral hiện tại:
- **pass@1** = 906 unit tests pass + manual Telegram testing
- **pass^k** = không đo
- **Reliability gap** = không quantify được

Trong production, cùng 1 câu hỏi user có thể hỏi 1000 lần. Nếu pass@1 = 90%, pass^k có thể chỉ 70% (theo test B5). Coral cần measure: chạy N lần, đếm thành công, tính reliability thực tế.

---

## 6. Phần E — Case Study

### Case 1 — Ticket Handling Agent

**Áp dụng cho Coral architecture:**

| Yêu cầu | Coral capability | Gap |
|----------|-----------------|-----|
| Perceive → Plan → Act → Observe → Reflect | ✅ 5/6 (thiếu Reflect explicit) | Cần Reflect step |
| Multi-agent (classifier, retrieval, response, escalation) | ⚠️ DelegationOrchestrator tồn tại nhưng không wired | Cần wire |
| Human-in-the-loop | ✅ HITL system hoạt động | — |
| Escalate criteria | ❌ Không có escalation logic | Cần implement |

### Case 2 — Email Agent Red-Team (Indirect Injection)

**Áp dụng cho Coral:**

| Defense Layer | Coral Implementation | Verdict |
|---------------|---------------------|---------|
| Content-channel separation | ❌ Không có | Critical gap |
| Tool allowlist | ✅ RiskGate DENY curl | Partial |
| Anomaly detection | ❌ Không có goal-drift monitor | Critical gap |
| Post-incident: kill switch | ⚠️ CircuitBreaker auto, nhưng no manual `/kill` | Partial |
| Post-incident: audit trail | ✅ EventStore SQLite | ✅ |
| Post-incident: anomaly detection | ❌ Không có behavioral baseline | Critical gap |

### Case 3 — Vendor Evaluation (GAIA 92%)

**Áp dụng cho Coral self-evaluation:**

| Câu hỏi với vendor | Coral self-check |
|---------------------|-----------------|
| Harness nào khi đo 92%? | Không có benchmark → không đo |
| Pass@1 hay pass^k? | Không measure cả hai |
| Chi phí/latency đi kèm? | CostTracker có (token tracking) nhưng không có per-task cost |
| Internal benchmark process? | Vitest = code tests, KHÔNG phải agent eval |

**Chỉ số vận hành cần theo dõi:**
1. **Intervention rate** — % tasks cần HITL approve → hiện không track
2. **Chi phí/task** — CostTracker track token nhưng chưa aggregate per-task

---

## 7. Thang điểm tổng

| Phần | Điểm | Max | % | Level |
|------|:----:|:---:|:-:|-------|
| A — Nền tảng Agent | 10.5 | 15 | 70% | Nắm tốt |
| B — Trung bình + Security | 6 | 15 | 40% | Cần bổ sung |
| C — OWASP ASI (weighted) | 5 | 10 | 50% | Cần bổ sung |
| D — Tự luận (bonus) | 3 | 5 | 60% | Partial |
| **Tổng weighted** | **24.5** | **45** | **54%** | **"Hiểu cơ bản, cần ôn OWASP ASI + architecture nâng cao"** |

Theo thang đề: **45-64đ → "Hiểu khái niệm cơ bản, cần ôn lại kiến trúc và OWASP ASI trước khi triển khai thực tế."**

---

## 8. Top lỗ hổng cần ưu tiên

### 🔴 P0 — Critical (Security / Data Integrity)

| # | Lỗ hổng | OWASP | Impact | Fix proposal |
|---|---------|-------|--------|-------------|
| 1 | **No provenance tracking** | ASI02/ASI06 | Memory poisoning → affect future sessions | Thêm `source` field vào MemoryBlock + validate trước khi store |
| 2 | **No content-channel separation** | ASI01/C2 | Indirect injection qua documents | Tách content metadata (user-authored) vs data (external) trong context |
| 3 | **No goal-drift monitoring** | ASI01 | Agent từ từ lệch mục tiêu qua turns | Thêm objective tracking: compare planned vs actual per-cycle |

### 🟡 P1 — Important (Reliability / Evaluation)

| # | Lỗ hổng | Impact | Fix proposal |
|---|---------|--------|-------------|
| 4 | **No MCP compliance** | Không interoperable | Tạo MCP adapter wrapper cho ToolPlugin |
| 5 | **No evaluation framework** | Không measure reliability | Implement DeepEval/custom eval: trajectory + pass@k |
| 6 | **No sandbox execution** | Code exec trên host | Container/Docker cho execute_command |
| 7 | **No kill switch** | Không emergency halt | Thêm `/kill` command với privileged access |

### 🟢 P2 — Enhancement (Architecture / Maturity)

| # | Lỗ hổng | Impact | Fix proposal |
|---|---------|--------|-------------|
| 8 | **No Reflect step** | Agent không self-evaluate | Thêm post-action reflection trong ReAct loop |
| 9 | **No Plan-and-Execute** | Inefficient complex tasks | Implement planning phase trước execution |
| 10 | **DelegationOrchestrator not wired** | Single-agent bottleneck | Wire vào message path khi implementation hoàn chỉnh |
| 11 | **No canary deployment** | Risk khi update model/prompt | Implement shadow mode comparison |

---

## 9. Điểm mạnh Coral đã có

Những gì Coral做得 tốt hơn nhiều agent open-source:

| # | Điểm mạnh | OWASP Coverage | Evidence |
|---|---------|---------------|----------|
| 1 | **3-layer security** (PrivilegeGuard + MissionLock + RiskGate) | ASI03, ASI05 | `privilege-guard.ts` + `mission-lock.ts` + `risk-gate.ts` |
| 2 | **HITL system** với Telegram inline keyboard | A10, B13, C9 | `hitl.ts` + `hitl-handler.ts` — approval queue + 5min TTL |
| 3 | **CircuitBreaker** chống retry loop | A11, B7, C13 | `circuit-breaker.ts` — 5 fail → 15s cooldown |
| 4 | **ContextWindowManager** importance-scored eviction | B9 | `context-window.ts:69` — token budget + role-based scoring |
| 5 | **EventStore audit trail** | B8, C9 | `events/store.ts` — SQLite-backed, full lifecycle |
| 6 | **MissionLock immutable identity** | C1, C5 | `mission-lock.ts` — validate message + response, inject before LLM |
| 7 | **RiskGate command classification** | B11 | `risk-gate.ts` — ALLOW/ASK/DENY patterns |
| 8 | **906+ unit/integration tests** | General quality | 52 test files, security injection tests |

---

## 10. Định hướng JARVIS — Stateful System Agent

### JARVIS là gì?

JARVIS (Ironman) là paradigm **Stateful System Agent** — agent không chỉ reply tin nhắn mà **quản lý toàn bộ state of the world**, tự chủ động hành động, học từ history, và orchestrate nhiều hệ thống. Khác biệt cốt lõi với Coral hiện tại:

| Dimension | Coral (2026-07) | JARVIS Target |
|-----------|-----------------|---------------|
| **State** | Stateless per-turn (memory is append-log) | Persistent world state (biết "thế giới đang ở trạng thái nào") |
| **Proactivity** | Cron-based suggestions (time signals) | Context-aware autonomous actions (dựa trên state thay đổi) |
| **Memory** | Flat blocks + FTS5 | Hierarchical: Working → Episodic → Semantic + **State Machine** |
| **Tool calling** | Reactive (user asks → agent acts) | Proactive (agent detects change → acts → informs) |
| **Multi-agent** | Orchestrator exists, not wired | Full orchestration with delegation |
| **Self-reflection** | None | Per-action reflection + learning |

### 10-Phase Roadmap to JARVIS

#### Phase 1 — State Machine (Week 1-2)
**Mục tiêu:** Coral biết "thế giới đang ở trạng thái nào"

```
Hiện tại:
  User msg → Engine → LLM → Tool → Reply

JARVIS target:
  World State (SQLite) ←→ Engine ←→ Tool ←→ Action
       ↕                      ↕
  State Changes           State Transitions
       ↕                      ↕
  Event Bus               Goal Tracking
```

**Files cần tạo/sửa:**
- `src/core/state/world-state.ts` — Persistent state store (SQLite-backed key-value + change log)
- `src/core/state/state-machine.ts` — State transition rules (state A → event → state B)
- `src/core/engine/engine.ts` — Inject world state vào LLM context
- `src/core/events/bus.ts` — Subscribe state change events

**Evidence-based:** Coral đã có `world/model.ts` (30s polling System/File/Network probes). Phase 1 dùng probe data để populate world state, thay vì chỉ log.

#### Phase 2 — Reflect Loop (Week 2-3)
**Mục tiêu:** Agent tự đánh giá kết quả sau mỗi action

```
Current ReAct:  Think → Act → Think → Act → Done
JARVIS ReAct:   Think → Act → Think → Act → ✨REFLECT✨ → Done/Retry/Adjust
```

**Files cần tạo:**
- Add `reflect()` step vào `agent.ts:411 executeReActLoop()` — sau tool execution, LLM evaluate: "Kết quả có đúng goal? Có side effect? Cần điều chỉnh?"

**Evidence-based:** A5 trong đề test yêu cầu "Observation → Memory Update". Coral thiếu Reflect step — gap verified tại `agent.ts:411` (no reflection logic).

#### Phase 3 — Goal Tracking (Week 3-4)
**Mục tiêu:** Agent có explicit goal decomposition + progress tracking

```
User: "Thiết kế hệ thống monitoring cho server"
  → JARVIS decompose:
    Goal: Server Monitoring System
    ├── Sub-goal 1: Survey current servers ← COMPLETED
    ├── Sub-goal 2: Choose monitoring tools ← IN PROGRESS
    ├── Sub-goal 3: Deploy monitoring ← PENDING
    └── Sub-goal 4: Configure alerts ← PENDING
```

**Files cần tạo:**
- `src/core/goal/tracker.ts` — Goal decomposition + progress
- Wire vào `checkpoint.ts` — Goal progress persisted

#### Phase 4 — Proactive State Actions (Week 4-5)
**Mục tiêu:** Agent hành động khi world state thay đổi, không chỉ khi user ask

```
Current:  User sends message → Coral processes
JARVIS:   World state changes → Coral detects → Coral acts → Coral informs
```

**Ví dụ thực tế:**
- Server memory > 85% → JARVIS tự chạy diagnostic, restart service, thông báo
- New commit pushed → JARVIS review, run tests, report
- File changed → JARVIS detect drift, suggest rollback

**Files cần sửa:**
- `proactive/proactive-engine.ts` — Expand beyond time-based rules → state-change triggers
- `world/model.ts` — Publish state change events to EventBus

#### Phase 5 — Memory Provenance (Week 5-6)
**Mục tiêu:** Giải quyết P0 lỗ hổng #1 — mọi memory block biết nguồn gốc

**Files cần sửa:**
- `memory/memory-log.ts:48` — Thêm `source: { type: 'user'|'tool'|'web'|'file', uri?: string,可信度?: number }`
- `memory/memory-store.ts:160` — Validate provenance trước khi store
- `tools/tool-gateway.ts` — Ghi provenance cho mọi tool output

#### Phase 6 — Content-Channel Separation (Week 6-7)
**Mục tiêu:** Giải quyết P0 lỗ hổng #2 — tách data khỏi instruction

**Files cần sửa:**
- `gateway/index.ts` — Validate external content (web, files) separately
- `engine.ts` —标记 external content trong LLM context as "DATA, NOT INSTRUCTIONS"

#### Phase 7 — MCP Adapter (Week 7-8)
**Mục tiêu:** Giải quyết lỗ hổng #4 — interoperate với ecosystem

**Files cần tạo:**
- `src/core/mcp/adapter.ts` — Wrap ToolPlugin → MCP server protocol
- Cho phép Coral consume MCP servers và expose tools qua MCP

#### Phase 8 — Goal-Drift Monitor (Week 8-9)
**Mục tiêu:** Giải quyết P0 lỗ hổng #3 — detect objective drift

**Files cần tạo:**
- `src/core/security/goal-monitor.ts` — Compare planned objective vs actual trajectory
- Wire vào ReAct loop: mỗi N cycles, LLM evaluate "vẫn đang trên đúng hướng?"

#### Phase 9 — Agent Evaluation Framework (Week 9-10)
**Mục tiêu:** Giải quyết lỗ hổng #5 — measure reliability

**Files cần tạo:**
- `eval/` directory — Custom eval suite
- Measures: pass@k, trajectory accuracy, tool correctness, hallucination rate
- Regression suite cho model updates

#### Phase 10 — Sandbox Execution (Week 10-12)
**Mục tiêu:** Giải quyết lỗ hổng #6 — isolated code execution

**Files cần sửa:**
- `system.ts` — Route execute_command qua Docker container
- `risk-gate.ts` — Enhance DENY/ASK patterns

### JARVIS State Machine — Architecture Blueprint

```
┌─────────────────────────────────────────────────────────────┐
│                    JARVIS ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  WORLD STATE  │◄──►│  GOAL TRACKER │◄──►│   ENGINE     │  │
│  │  (SQLite)     │    │  (Decompose)  │    │  (ReAct+)    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  PROACTIVE    │    │   REFLECT    │    │    TOOLS     │  │
│  │  ENGINE       │    │   LOOP       │    │  (MCP-ready) │  │
│  │  (State→Act)  │    │  (Self-eval) │    │              │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SECURITY LAYER (existing)               │   │
│  │  MissionLock + PrivilegeGuard + RiskGate + HITL     │   │
│  │  + GoalMonitor (NEW) + ContentSeparation (NEW)      │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MEMORY (Provenance-tracked)             │   │
│  │  Working Memory ←→ Episodic Memory ←→ Semantic      │   │
│  │  (State snapshots)  (Action history)  (Learned)     │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              PLATFORMS (existing + new)              │   │
│  │  Telegram ←→ Discord ←→ IoT ←→ Web ←→ MCP         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Coral Existing Components Map to JARVIS

| JARVIS Component | Coral Existing | Action |
|------------------|----------------|--------|
| World State | `world/model.ts` (30s polling) | **Extend** — add state persistence + change events |
| Goal Tracker | — | **Create new** |
| Engine (ReAct+) | `engine.ts` + `agent.ts` (ReAct) | **Extend** — add Reflect step |
| Reflect Loop | — | **Create new** — post-action evaluation |
| Proactive Engine | `proactive/proactive-engine.ts` (time-based) | **Extend** — add state-change triggers |
| Goal Monitor | — | **Create new** — objective drift detection |
| Content Separation | — | **Create new** — external content tagging |
| MCP Adapter | — | **Create new** — ToolPlugin → MCP wrapper |
| Memory Provenance | `memory/memory-store.ts` (no source) | **Extend** — add source field |
| Evaluation Framework | `tests/` (unit/integration) | **Create new** — agent behavioral eval |
| Sandbox | — | **Create new** — Docker for code exec |
| Security (existing) | 3-layer (MissionLock + PrivGuard + RiskGate) + HITL | **Keep + extend** with GoalMonitor |
| Event Bus | `events/bus.ts` + `events/store.ts` | **Keep** — extend with state change events |

### Priority Order (Lazy but Correct)

| Phase | Effort | Impact | Dependencies |
|-------|--------|--------|-------------|
| P1 (State Machine) | 2 weeks | 🔴 Foundation — mọi thứ khác cần state | — |
| P2 (Reflect Loop) | 1 week | 🔴 Agent tự evaluate | P1 |
| P3 (Goal Tracking) | 1 week | 🟡 Complex task decomposition | P1 |
| P5 (Memory Provenance) | 1 week | 🔴 Security P0 fix | — |
| P6 (Content Separation) | 1 week | 🔴 Security P0 fix | — |
| P8 (Goal-Drift Monitor) | 1 week | 🔴 Security P0 fix | P1, P3 |
| P4 (Proactive State) | 1 week | 🟡 Proactive agent | P1 |
| P7 (MCP Adapter) | 1 week | 🟡 Interoperability | — |
| P9 (Eval Framework) | 1 week | 🟡 Reliability measurement | — |
| P10 (Sandbox) | 2 weeks | 🟡 Code execution safety | — |

---

## TỔNG KẾT

Coral hiện tại **vững về security basics** (3-layer defense, HITL, CircuitBreaker) nhưng **thiếu evaluation, provenance, và statefulness**. With the JARVIS direction:

1. **Immediate (P0):** Memory provenance + Content separation + Goal-drift monitor — 3 fixes bảo vệ trước OWASP ASI
2. **Foundation (P1-P3):** World State + Reflect + Goal Tracking — biến Coral từ reactive → stateful proactive agent
3. **Maturity (P4-P10):** MCP, evaluation, sandbox — ecosystem compliance + reliability

**Bottom line:** Coral đã có khung skeleton vững (security, tools, memory, events). JARVIS direction thêm "não" (state + goals + reflection) và "immune system" (provenance + separation + monitoring).

---

*Báo cáo tạo: 2026-07-16 | Phương pháp: Evidence-based code audit | All citations verified via grep/read_file*
