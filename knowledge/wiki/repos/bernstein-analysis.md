# Bernstein — Deterministic Multi-Agent CLI Orchestrator

| Field | Value |
|-------|-------|
| **Repo** | github.com/chernistry/bernstein |
| **Stars** | ~361, forks 37 |
| **License** | Apache 2.0 |
| **Language** | Python |
| **Install** | `pipx install bernstein` |
| **Key Hook** | Regulated / on-prem / audit — "Compliance team sign-off" |

## Core Architecture

1. **Decompose**: 1 LLM call breaks goal into tasks (roles, owned files, completion signals)
2. **Spawn**: Agents in isolated **git worktrees** — parallel per task, main branch stays clean
3. **Verify**: Janitor checks concrete signals (tests pass, files exist, lint clean)
4. **Merge**: Verified work lands in main; failed → retry or route to different model

## Key Innovation vs Kato

| Aspect | Bernstein | Kato (current) |
|--------|-----------|----------------|
| Orchestrator | **Deterministic Python** (zero LLM scheduling) | LLM-driven via prompt builder |
| Agent isolation | Git worktrees | Single state machine |
| Audit chain | HMAC-SHA256 per step (RFC 2104), signed agent cards (JWS), per-artefact lineage | No chain-of-custody |
| Sandboxes | Worktree, Docker, E2B, Modal | N/A |
| CLI adapters | **44** third-party wrappers | 1 (Claude/Cline) |
| RAG | SQLite FTS5 + BM25 | N/A |
| Skill packs | Progressive disclosure (17 built-in) | Skills index manager |
| YAML workflows | `bernstein workflow run` | N/A |

## What Kato Should Borrow

1. **Deterministic zero-LLM scheduling** — Bernstein uses 1 LLM call to decompose, then pure Python. Kato uses LLM for everything. **Adopt**: decompose-first, then execute deterministically.
2. **Repository-level orchestration** — agents in isolated worktrees. Kato operates in a single repo state.
3. **HMAC audit chain** — every scheduling decision logged, replayable, tamper-evident. Critical for Kato's reliability.
4. **Multiple agent adapters** — Bernstein supports 44 agents. Kato only supports Claude/Cline. **Adopt**: abstract AgentAdapter interface, add support for Gemini CLI, Codex, etc.
5. **Janitor verification** — "janitor" role checks tests/lint/types before merge. Kato has `tool-pruner.ts` but no pre-merge gate.

## Applicability to Kato

- **High**: Audit trail, deterministic scheduling, multi-agent orchestration
- **Medium**: Git worktree isolation, sandbox backends, skill packs
- **Low**: Cloud/regulated deployment features (Kato runs locally)

## Source

README.md (603 lines), dated 2026-05-15, v1.10.7