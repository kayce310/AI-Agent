# Langfuse — Open Source LLM Engineering Platform

| Field | Value |
|-------|-------|
| **Repo** | github.com/langfuse/langfuse |
| **License** | MIT |
| **Language** | TypeScript (frontend + backend, ClickHouse) |
| **Install** | Docker / self-hosted |
| **Key Hook** | LLM observability, tracing, evaluation, debugging |

## Core Architecture

1. **Tracing** — Instrument LLM apps, track calls, retrieval, embedding, agent actions
2. **Evaluation** — Built-in evaluation framework, A/B tests, datasets
3. **Observability** — Real-time monitoring, logs, user sessions
4. **Self-hostable** — Can be deployed in minutes using ClickHouse
5. **Collaborative** — Team-wide debugging and monitoring of AI applications

## Key Innovation vs Kato

| Aspect | Langfuse | Kato (current) |
|--------|----------|----------------|
| Focus | Observability + evaluation platform | Task execution agent |
| Tracing | Full LLM call tracing with instrumentation | `evolution.json` for progress |
| Evaluation | Built-in evals, datasets, A/B testing | Manual quality checks |
| Deployment | Docker/self-hosted | Git repo only |
| Collaboration | Team-wide dashboard | Single-user |
| Data | LLM call traces stored in ClickHouse | JSON state files |

## What Kato Should Borrow

1. **Tracing as first-class** — Kato's `evolution.json` is primitive. Langfuse-level tracing would track every tool call, token, latency — enabling self-optimization
2. **Evaluation datasets** — Langfuse's evals could let Kato benchmark its own prompt generation quality over time
3. **Observability console** — A web-based view of Kato's state/session data would be powerful for debugging

## Applicability to Kato

- **High**: Tracing patterns, evaluation framework, observability architecture
- **Medium**: Self-hosted deployment model, ClickHouse data storage patterns
- **Low**: Full platform integration

## Source

README.md (399 lines), dated 2026-05-15