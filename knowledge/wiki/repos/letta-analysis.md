# Letta (formerly MemGPT) — Self-Improving AI Agents with Memory

| Field | Value |
|-------|-------|
| **Repo** | github.com/letta-ai/letta |
| **Stars** | Formerly MemGPT (MemGPT ~10k+ stars before rebrand) |
| **License** | Apache 2.0 |
| **Language** | Python (backend) + TypeScript (client SDK) |
| **Install** | `pip install letta-client` or `npm install @letta-ai/letta-client` |
| **Key Hook** | "Build AI with advanced memory that can learn and self-improve over time." |

## Core Architecture

### Memory Blocks
- **Structured memory** via labeled blocks (e.g. `human`, `persona`)
- Blocks store persistent context that agents reference continuously
- Separates **identity** (persona) from **user data** (human) from **world knowledge**

### Agent Model
- **Stateful agents** — maintain conversation state + memory across sessions
- **Skills system** — pre-built behaviors for coding, web search, file operations
- **Subagents** — hierarchical decomposition of complex tasks
- **Model-agnostic** — works with any LLM (recommends Opus 4.5, GPT-5.2)

### Delivery Options
1. **Letta Code** (`npm install -g @letta-ai/letta-code`) — local terminal agents
2. **Letta API** — cloud-hosted stateful agents via REST + SDK
3. **Self-hosted** — Docker compose stack (optional)

## Key Comparisons vs Kato

| Aspect | Letta | Kato (current) |
|--------|-------|----------------|
| Memory model | **Labeled memory blocks** (human/persona/world) | JSON state manager |
| Agent architecture | Stateful agents with memory persistence | Single state machine |
| Agent hierarchy | **Subagents** for task decomposition | Single agent |
| Skills | Pre-built skills for memory/coding/web | Skills index manager |
| Deployment | CLI + Cloud API + self-hosted | Local-only CLI |
| SDK | Python + TypeScript client SDK | N/A (Cline-bound) |

## What Kato Should Borrow

1. **Memory blocks pattern** — separating `human`, `persona`, `world` into labeled blocks is cleaner than Kato's flat JSON state. Enables structured persistent memory.
2. **Subagents** — hierarchical decomposition (parent agent spawns subagents) is a better pattern than Kato's flat tool-calling loop for complex multi-step tasks.
3. **Skills-as-code bundling** — Letta ships pre-built skills as npm/pip packages. Kato could adopt this pattern for plugin distribution.
4. **Stateful agent API pattern** — `client.agents.create()` + `client.agents.messages.create()` is a clean abstraction Kato's engine module could model.

## Applicability to Kato

- **High**: Memory blocks pattern, stateful agent API, subagent decomposition
- **Medium**: Skills-as-code bundling, model-agnostic architecture
- **Low**: Cloud API features (Kato is local-first), CLI toolchain

## Source

README.md (122 lines), Letta (forked from MemGPT, rebranded 2025-2026)