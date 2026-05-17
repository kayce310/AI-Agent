# Architecture Gap Closure Plan — PDF Analysis (19-page)

> **Base:** `knowledge/wiki/blueprints/ai-agent-architecture-system-design.md`
> **Current coverage:** ~69% (5/7 pillars ≥80%)
> **Target:** 95%+
> **Generated:** 2026-05-17

---

## Priority Matrix

```
P0 🔴 MUST HAVE (2-3 days)
├── Memory Temporal (Letta-style layered + Mem0 temporal reasoning)
│   ├── memory-temporal.ts — time-indexed block storage
│   ├── memory-agentic.ts — agent tự modify memory
│   ├── world block type cho MemoryStore
│   └── Migration: state.json → temporal log

P1 🟡 SHOULD HAVE (3-5 days)
├── 16 Agentic Design Patterns còn lại
│   ├── dynamic-scaffolding.ts
│   ├── orchestrator-workforce.ts
│   ├── tool-arbiter.ts
│   ├── evaluation.ts
│   ├── supervisor.ts
│   └── 11 patterns khác
├── GNAP protocol (Git-Native Agent Protocol)
│   ├── gnap-queue.ts (Git-push/pull task queue)
│   └── task_queue.md → gnap format

P2 🟢 NICE TO HAVE (later)
├── DSPy prompt optimization (auto-optimize prompts)
├── Prism Scanner (MCP tool supply chain security)
├── The Library (meta-skill package manager)
├── Temporal workflow engine
└── 7-day memory rotation TTL
```

---

## Phase 1: Memory 🔴 (2-3 ngày)

### Files cần tạo:
```
src/core/memory-temporal.ts     — time-indexed block storage
src/core/memory-agentic.ts      — agent tự ghi/đọc/xoá memory
tests/memory-temporal.test.ts
tests/memory-agentic.test.ts
tests/world-block.test.ts
```

### Files cần sửa:
```
src/core/memory-store.ts        — thêm 'world' block type
src/core/types.ts               — thêm WorldBlock interface
```

### Tiêu chí hoàn thành:
- MemoryStore hỗ trợ 7/7 Letta layers (thêm 'world')
- Temporal query: "lấy memory từ tuần trước"
- Agent tự động write/delete memory blocks
- state.json vẫn hoạt động (backward compat)

---

## Phase 2: Patterns 🟡 (3-5 ngày)

### 16 patterns cần thêm:
```
src/core/patterns/dynamic-scaffolding.ts    — auto-generate agent structure
src/core/patterns/orchestrator-workforce.ts — multi-agent coordination
src/core/patterns/tool-arbiter.ts           — tool selection arbitration
src/core/patterns/evaluation.ts             — LLM-as-judge eval
src/core/patterns/supervisor.ts             — supervisor agent monitoring
src/core/patterns/multi-agent.ts            — multi-agent debate
src/core/patterns/agent-workforce.ts        — workforce management
src/core/patterns/self-discovery.ts         — agent tự khám phá capabilities
src/core/patterns/context-compression.ts    — context window optimization
src/core/patterns/memory-augmented.ts       — RAG-enhanced generation
src/core/patterns/human-in-the-loop.ts      — human approval gate
src/core/patterns/chain-of-thought.ts       — structured reasoning
src/core/patterns/tool-augmented.ts         — dynamic tool use
src/core/patterns/self-consistency.ts       — multiple paths → best answer
src/core/patterns/adaptive-thinking.ts      — adjust thinking depth
```

### File tham chiếu:
- `knowledge/wiki/repos/bernstein-analysis.md` — deterministic patterns
- `knowledge/wiki/repos/langchain-analysis.md` — chain patterns
- `knowledge/wiki/repos/crewai-analysis.md` — role-based patterns

---

## Phase 3: GNAP Protocol 🟡 (2 ngày)

### Files:
```
src/core/gnap-queue.ts          — Git-push/pull task queue
src/core/gnap-agent-card.ts     — Signed Agent Card (HMAC)
tests/gnap.test.ts
```

### Tiêu chí:
- Heartbeat loop: git pull → check task → execute → git push
- Audit log = Git history
- Offline-capable

---

## Phases 4+: NICE TO HAVE 🟢

| Component | Files | Notes |
|-----------|-------|-------|
| DSPy optimization | `src/core/dspy-optimizer.ts` | Auto-optimize prompts |
| Prism Scanner | `src/core/prism-scanner.ts` | MCP tool security scan |
| The Library | `src/core/skill-library.ts` | Meta-skill package manager |
| Memory rotation | Thêm vào `memory-store.ts` | 7-day TTL cleanup |

---

## Timeline

```
Week 1:  Memory Temporal + World block + Agentic memory
Week 2:  GNAP protocol + 5 critical patterns
Week 3:  11 remaining patterns
Week 4:  NICE TO HAVE (nếu còn time)
```

## Success Criteria

- [ ] MemoryStore: 7/7 Letta layers, temporal query, agentic write/delete
- [ ] All 21 patterns from Agentic-Design-Patterns implemented
- [ ] GNAP: Git-native task queue operational
- [ ] Tests pass: maintain 440+ baseline
- [ ] `RESUME.md` updated

---

*Generated: 2026-05-17 | Architecture Gap Closure Plan v1.0*