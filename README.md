<p align="center">
  <img src="./docs/assets/banner-coral-agent.svg" alt="Coral — Autonomous Agent System" width="100%" />
</p>

<p align="center">
  <em>An autonomous agent runtime built on Claude, with a durable plan lifecycle, execution-safety guardrails, and long-term memory.</em>
</p>

<p align="center">
  <a href="#status">Status</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#core-design-principles">Design Principles</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

---

## Status

> 🚧 **Active development — not production-ready.**
> Coral is being hardened for long-running, unattended execution. Core plan lifecycle and progress-detection systems are implemented and tested; execution-safety work (cancellation, subprocess lifecycle, resource limits) is in progress. See [Roadmap](#roadmap).

## What is Coral

Coral is an agent runtime that wraps a large language model (Claude, via a local proxy) in a **ReAct execution loop** with the scaffolding a long-running autonomous agent actually needs to be trustworthy:

- a **plan lifecycle** with an explicit state machine, so "what is the agent doing right now" is always a well-defined, auditable answer
- a **progress monitor** that distinguishes *activity* from *progress* — detecting when the agent is running tools without actually advancing the task, without relying on the model to self-grade its own performance
- **checkpointing and restart safety**, so an interrupted task can resume correctly instead of silently losing or duplicating state
- **consequence memory**, so the agent can recall what an action led to before, and avoid repeating known failure patterns
- integration with Telegram as a control surface, plus a live dashboard for observability

## Architecture

Coral is organized in layers, from the model outward:

```
Model (LLM)
   ↓
Tool layer            — read/write files, execute commands, HTTP, subprocess management
   ↓
Agent loop (harness)  — ReAct cycle: reason → act → observe, with hard safety ceilings
   ↓
Engine / Orchestrator — multi-session coordination, plan state authority, checkpoint restore
   ↓
Interface              — Telegram bot, dashboard
```

Cutting across all of these is a **persistence layer** — plan state, checkpoints, and memory — which is the only thing that survives a restart. Getting the boundary between "logical execution" and "durable state" right is the majority of the hard engineering in this project.

### Plan state machine

Every unit of work Coral does is tracked as a `Plan` with an explicit, validated state machine (`pending → running → completed`, with `stuck`, `paused_limit`, `waiting_user`, `aborted`, and `failed` as recoverable or terminal states). All transitions go through a single validation gate — nothing is allowed to mutate plan state ad hoc. This is deliberate: a single source of truth for "where is this task" is what makes crash recovery, cancellation, and progress-monitoring possible without the system contradicting itself.

### Progress monitoring

A lightweight, deterministic signal — not an LLM self-assessment — that answers "is the agent actually converging on the goal, or just active?" It combines two inputs: authoritative plan-item transitions, and novelty of recent tool/evidence actions (fingerprint-based, no semantic judgment). When neither signal moves for a bounded window, the agent is nudged, then guided to switch strategy, before the plan is surfaced as stuck — never silently looping.

### Execution safety

Coral enforces hard ceilings on tool-call cycles, propagates cancellation (`AbortSignal`) through the full execution stack including spawned subprocesses, and is being audited resource-by-resource (tool cycles, context growth, subprocess lifecycle, concurrency) to guarantee that stopping an operation actually stops everything it started — not just the logical promise chain.

## Core design principles

These are enforced, not aspirational:

- **Single source of truth.** Plan state lives in one place, mutated through one validated path. Memory, events, and dashboards read from it — they never become a second authority on task progress.
- **No LLM self-grading of safety-critical signals.** Progress, stagnation, and termination are computed deterministically. The model proposes; the system decides.
- **Identity ≠ Lifecycle ≠ Intent.** Knowing *which* plan/session something is (identity) is different from knowing *what state* it's in (lifecycle), which is different from knowing whether it's still what the user actually wants (intent). Conflating these is a recurring source of bugs this project actively guards against.
- **Evidence over narrative.** Every claim of "this works" is expected to carry reproducible evidence — real output, real commit hashes, real OS-level checks — not a summary asserting success.

## Getting Started

> Setup instructions are being finalized alongside the execution-safety hardening work. This section will be filled in once the runtime is stable enough for external use.

## Roadmap

Coral's hardening work is tracked in stages:

| Stage | Focus | Status |
|---|---|---|
| R0 | Baseline / forensic audit | ✅ Done |
| R1 | Execution safety & cancellation lifecycle | 🔄 In progress |
| R2 | Crash / interruption recovery | ⏳ Planned |
| R3 | Resource governance (concurrency, budgets) | ⏳ Planned |
| R4 | Planning & behavior reliability | ⏳ Planned |
| R5 | Memory architecture | ⏳ Planned |
| R6 | Observability | 🔄 Partial (dashboard exists, coverage improving) |
| R7 | Production hardening | ⏳ Planned |

## License

_TBD._

---

<p align="center"><sub>Built with Claude · governed by internal architecture decision records (ADRs)</sub></p>
