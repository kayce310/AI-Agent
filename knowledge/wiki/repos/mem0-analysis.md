# Mem0 — Memory Layer for Personalized AI

| Field | Value |
|-------|-------|
| **Repo** | github.com/mem0ai/mem0 |
| **Stars** | ~25k+ |
| **License** | Apache 2.0 |
| **Language** | Python + TypeScript (CLI) |
| **Install** | `pip install mem0ai` |
| **Key Hook** | "The Memory Layer for Personalized AI" — Y Combinator S24 |

## Core Architecture

### New Memory Algorithm (April 2026)
- **Single-pass ADD-only extraction** — 1 LLM call, no UPDATE/DELETE. Memories accumulate.
- **Agent-generated facts as first-class** — agent-confirmed actions stored with equal weight.
- **Entity linking** — entities extracted, embedded, linked across memories for retrieval boosting.
- **Multi-signal retrieval** — semantic + BM25 keyword + entity matching fused.
- **Temporal reasoning** — time-aware retrieval for current state vs past vs future.

| Benchmark | Old | New | Tokens | Latency |
|-----------|-----|-----|--------|---------|
| LoCoMo | 71.4 | **91.6** | 7.0K | 0.88s |
| LongMemEval | 67.8 | **94.8** | 6.8K | 1.09s |
| BEAM (1M) | — | **64.1** | 6.7K | 1.00s |

### Multi-Level Memory
- **User-level** — remembers preferences across sessions
- **Session-level** — context within a conversation
- **Agent-level** — shared agent state

### Delivery Options
1. **Library** — `pip install mem0ai`, embed directly
2. **Self-Hosted Server** — `docker compose up` with dashboard + auth
3. **Cloud Platform** — managed at app.mem0.ai
4. **CLI** — `npm install -g @mem0/cli` or `pip install mem0-cli`

## Key Comparisons vs Kato

| Aspect | Mem0 | Kato (current) |
|--------|------|----------------|
| Memory storage | **Dedicated memory DB** (embedding + BM25 + entity) | State manager + JSON files |
| Retrieval | Multi-signal: semantic/BM25/entity/time | Simple key-value state lookup |
| Memory algorithm | ADD-only, single-pass LLM extraction | No extraction layer |
| Temporal reasoning | Time-aware retrieval | No temporal awareness |
| Persistence | Cloud or self-hosted DB | JSON files only |
| Evaluation | LoCoMo, LongMemEval, BEAM benchmarks | No benchmarks |

## What Kato Should Borrow

1. **Dedicated memory layer** — Mem0's ADD-only pattern (never overwrite, just accumulate) is superior to Kato's current JSON state mutations.
2. **Multi-signal retrieval** — combining semantic + keyword + entity boosting dramatically improves recall over simple state lookups.
3. **Temporal reasoning** — Kato needs to know "what's the current state" vs "what happened in the past". Mem0 has this built-in.
4. **Memory benchmarks** — LoCoMo/LongMemEval are the standard. Kato has none.
5. **Memory-as-a-service** — Mem0's library/self-hosted/cloud triple option is a great pattern.

## Applicability to Kato

- **High**: Memory layer architecture, ADD-only pattern, multi-signal retrieval, temporal reasoning
- **Medium**: Entity linking, agent-generated fact storage
- **Low**: Cloud platform features (Kato is local-first)

## Source

README.md (249 lines), mem0 v3.x (new memory algorithm April 2026)