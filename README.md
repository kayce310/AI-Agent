<p align="center">
  <img src="./docs/assets/banner-coral-agent.svg" alt="Coral — Autonomous Agent System" width="100%" />
</p>

<p align="center">
  <img alt="status" src="https://img.shields.io/badge/status-active--development-ff6b5c?style=flat-square">
  <img alt="runtime" src="https://img.shields.io/badge/model-Claude%20Sonnet-eee7d9?style=flat-square">
  <img alt="language" src="https://img.shields.io/badge/typescript-121821?style=flat-square&logo=typescript&logoColor=ffb45c">
  <img alt="license" src="https://img.shields.io/badge/license-TBD-9aa5b1?style=flat-square">
</p>

<p align="center">
  <em>An autonomous agent runtime built on Claude, with a durable plan lifecycle, execution-safety guardrails, and long-term memory.</em>
</p>

<p align="center">
  <a href="#status">Status</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#core-design-principles">Design Principles</a> ·
  <a href="#meet-the-companion">Meet the Companion</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#roadmap">Roadmap</a>
</p>

<br>

## Status

> 🚧 **Active development — not production-ready.**
> Coral is being hardened for long-running, unattended execution. Core plan lifecycle and progress-detection systems are implemented and tested; execution-safety work (cancellation, subprocess lifecycle, resource limits) is in progress. See [Roadmap](#roadmap).

<br>

## What is Coral

Coral is an agent runtime that wraps a large language model (Claude, via a local proxy) in a **ReAct execution loop** with the scaffolding a long-running autonomous agent actually needs to be trustworthy:

| | |
|---|---|
| 🗺️ **Plan lifecycle** | An explicit, validated state machine — "what is the agent doing right now" is always a well-defined, auditable answer. |
| 📈 **Progress monitor** | Distinguishes *activity* from *progress* — detects when the agent is running tools without advancing the task, without letting the model grade its own performance. |
| 💾 **Checkpoint & restart safety** | An interrupted task resumes correctly instead of silently losing or duplicating state. |
| 🧠 **Consequence memory** | Recalls what an action led to before, and avoids repeating known failure patterns. |
| 📊 **Dashboard & Telegram control** | Live observability and a conversational control surface. |

<br>

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

Cutting across all of these is a **persistence layer** — plan state, checkpoints, and memory — the only thing that survives a restart. Getting the boundary between *logical execution* and *durable state* right is the majority of the hard engineering in this project.

<details>
<summary><strong>Plan state machine</strong></summary>
<br>

Every unit of work Coral does is tracked as a `Plan` with an explicit, validated state machine (`pending → running → completed`, with `stuck`, `paused_limit`, `waiting_user`, `aborted`, and `failed` as recoverable or terminal states). All transitions go through a single validation gate — nothing is allowed to mutate plan state ad hoc. A single source of truth for "where is this task" is what makes crash recovery, cancellation, and progress-monitoring possible without the system contradicting itself.

</details>

<details>
<summary><strong>Progress monitoring</strong></summary>
<br>

A lightweight, deterministic signal — not an LLM self-assessment — that answers "is the agent actually converging on the goal, or just active?" It combines two inputs: authoritative plan-item transitions, and novelty of recent tool/evidence actions (fingerprint-based, no semantic judgment). When neither signal moves for a bounded window, the agent is nudged, then guided to switch strategy, before the plan is surfaced as stuck — never silently looping.

</details>

<details>
<summary><strong>Execution safety</strong></summary>
<br>

Coral enforces hard ceilings on tool-call cycles, propagates cancellation (`AbortSignal`) through the full execution stack including spawned subprocesses, and is being audited resource-by-resource (tool cycles, context growth, subprocess lifecycle, concurrency) to guarantee that stopping an operation actually stops everything it started — not just the logical promise chain.

</details>

<br>

## Core design principles

These are enforced, not aspirational:

- **Single source of truth.** Plan state lives in one place, mutated through one validated path. Memory, events, and dashboards read from it — they never become a second authority on task progress.
- **No LLM self-grading of safety-critical signals.** Progress, stagnation, and termination are computed deterministically. The model proposes; the system decides.
- **Identity ≠ Lifecycle ≠ Intent.** Knowing *which* plan/session something is (identity) is different from knowing *what state* it's in (lifecycle), which is different from knowing whether it's still what the user actually wants (intent). Conflating these is a recurring source of bugs this project actively guards against.
- **Evidence over narrative.** Every claim of "this works" is expected to carry reproducible evidence — real output, real commit hashes, real OS-level checks — not a summary asserting success.

<br>

## Meet the companion

<table>
<tr>
<td width="220" valign="top">
<img src="./docs/assets/mascot-coral-companion.svg" alt="Coral's dashboard companion avatar" width="200">
</td>
<td valign="top">

Coral's dashboard has a companion avatar the team affectionately calls **Baymax** — inspired by the "big, round, gentle robot" archetype rather than any specific reproduction. It exists to make agent status feel like checking in with a companion, not reading a stack trace: idle, thinking, executing, stuck, done.

The name also became the internal codename for one of the project's hardest bugs — the *"Baymax problem"*: making sure a long-running task survives a restart correctly, without confusing a plan that's merely persisted with a plan that's still actually current. If you see "Baymax" referenced in ADRs or commit history, that's what it's about.

</td>
</tr>
</table>

<br>

## Getting Started

> Setup instructions are being finalized alongside the execution-safety hardening work. This section will be filled in once the runtime is stable enough for external use.

<br>

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

<br>

## License

_TBD._

---

<p align="center"><sub>Built with Claude · governed by internal architecture decision records (ADRs)</sub></p>
