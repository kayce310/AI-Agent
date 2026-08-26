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
>
> Coral has completed its baseline audit and the first three hardening stages are **verified**. R0, R1, R2, and R3 are closed with reproducible evidence. R4 has completed its initial audit and scope debate and is currently **SPEC-READY**, with implementation not yet started.
>
> Current hardening is focused on proving the runtime's planning lifecycle under a real engine loop, rather than adding new planning features.

### Current verification state

| Stage  | Status            | Summary                                                         |
| ------ | ----------------- | --------------------------------------------------------------- |
| **R0** | ✅ **VERIFIED**    | Baseline / forensic audit                                       |
| **R1** | ✅ **VERIFIED**    | Execution safety, cancellation, subprocess lifecycle            |
| **R2** | ✅ **VERIFIED**    | Crash / interruption recovery                                   |
| **R3** | ✅ **VERIFIED**    | Global foreground concurrency admission                         |
| **R4** | 📋 **SPEC-READY** | Minimal planning-loop reliability scope; implementation pending |

**Important:** R3's concurrency limit of **N=4 is a test value, not a production capacity claim**. Production capacity has not yet been benchmarked.

<br>

## What is Coral

Coral is an agent runtime that wraps a large language model (Claude, via a local proxy) in a **ReAct execution loop** with the scaffolding a long-running autonomous agent actually needs to be trustworthy:

|                                     |                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🗺️ **Plan lifecycle**              | An explicit, validated state machine — "what is the agent doing right now" is always a well-defined, auditable answer.                                              |
| 📈 **Progress monitor**             | Distinguishes *activity* from *progress* — detects when the agent is running tools without advancing the task, without letting the model grade its own performance. |
| 💾 **Checkpoint & restart safety**  | Interrupted execution is protected by durable checkpoints and recovery invariants verified through crash/restart testing.                                           |
| 🧠 **Consequence memory**           | Recalls what an action led to before, and avoids repeating known failure patterns.                                                                                  |
| 📊 **Dashboard & Telegram control** | Live observability and a conversational control surface.                                                                                                            |
| 🛡️ **Execution governance**        | Hard safety ceilings, cancellation propagation, subprocess lifecycle control, and global foreground concurrency admission.                                          |

<br>

## Architecture

Coral is organized in layers, from the model outward:

```text
Model (LLM)
   ↓
Tool layer            — read/write files, execute commands, HTTP, subprocess management
   ↓
Agent loop (harness)  — ReAct cycle: reason → act → observe, with hard safety ceilings
   ↓
Engine / Orchestrator — multi-session coordination, plan state authority, checkpoint restore,
                        foreground admission control
   ↓
Interface              — Telegram bot, dashboard
```

Cutting across all of these is a **persistence layer** — plan state, checkpoints, and memory — the only thing that survives a restart. Getting the boundary between *logical execution* and *durable state* right is the majority of the hard engineering in this project.

<details>
<summary><strong>Plan state machine</strong></summary>
<br>

Every unit of work Coral does is tracked as a `Plan` with an explicit, validated state machine (`pending → running → completed`, with `stuck`, `paused_limit`, `waiting_user`, `aborted`, and `failed` as recoverable or terminal states).

All transitions go through a single validation gate — nothing is allowed to mutate plan state ad hoc.

The planning infrastructure is already production-active and covered by extensive deterministic unit tests. R4 is deliberately narrower: it does not redesign the planning state machine. Its v1 scope is to verify planning-loop coherence through the real engine loop and preserve the single-active-plan invariant.

</details>

<details>
<summary><strong>Progress monitoring</strong></summary>
<br>

A lightweight, deterministic signal — not an LLM self-assessment — that answers "is the agent actually converging on the goal, or just active?"

It combines authoritative plan-item transitions and novelty of recent tool/evidence actions. When neither signal moves for a bounded window, the agent is nudged, then guided to switch strategy, before the plan is surfaced as stuck — never silently looping.

The underlying stagnation machinery is already covered by deterministic tests; R4 consumes it rather than redesigning it.

</details>

<details>
<summary><strong>Execution safety</strong></summary>
<br>

Coral enforces hard ceilings on tool-call cycles, propagates cancellation (`AbortSignal`) through the execution stack including spawned subprocesses, and protects durable state across interruption.

R1 and R2 have been verified. R3 adds a separate **global foreground concurrency admission gate**: at most a configured number of foreground `engine.process()` calls may be active simultaneously; requests beyond the ceiling are rejected immediately.

The R3 gate does not modify the existing per-session single-active-task invariant, the security rate limiter, or the sequential background queue.

</details>

<br>

## Core design principles

These are enforced, not aspirational:

* **Single source of truth.** Plan state lives in one place, mutated through one validated path. Memory, events, and dashboards read from it — they never become a second authority on task progress.
* **No LLM self-grading of safety-critical signals.** Progress, stagnation, and termination are computed deterministically. The model proposes; the system decides.
* **Identity ≠ Lifecycle ≠ Intent.** Knowing *which* plan/session something is (identity) is different from knowing *what state* it's in (lifecycle), which is different from knowing whether it's still what the user actually wants (intent). Conflating these is a recurring source of bugs this project actively guards against.
* **Evidence over narrative.** Every claim of "this works" is expected to carry reproducible evidence — real output, real commit hashes, real OS-level checks — not a summary asserting success.
* **Scope before implementation.** Each hardening stage begins with an audit and explicit scope boundary. Undefined behavior is not silently converted into implementation.
* **Verified does not mean benchmarked.** Passing deterministic acceptance tests proves the specified invariant; it does not automatically establish production capacity, performance, or model-level capability.

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

> Setup instructions are being finalized alongside the remaining hardening work. This section will be filled in once the runtime is stable enough for external use.

<br>

## Roadmap

Coral's hardening work is tracked in stages. **Completed stages are not reopened unless new evidence requires it.**

| Stage  | Focus                                                   | Status                                            |
| ------ | ------------------------------------------------------- | ------------------------------------------------- |
| **R0** | Baseline / forensic audit                               | ✅ **VERIFIED**                                    |
| **R1** | Execution safety & cancellation lifecycle               | ✅ **VERIFIED**                                    |
| **R2** | Crash / interruption recovery                           | ✅ **VERIFIED**                                    |
| **R3** | Global foreground concurrency admission                 | ✅ **VERIFIED**                                    |
| **R4** | Planning-loop reliability — minimal scope (B3 + B4-inv) | 📋 **SPEC-READY**                                 |
| **R5** | Memory architecture                                     | ⏳ Planned                                         |
| **R6** | Observability                                           | 🔄 Partial — dashboard exists; coverage improving |
| **R7** | Production hardening                                    | ⏳ Planned                                         |

### R4 v1 — Current scope

R4 v1 intentionally has a **minimal scope**:

* **R4-F.1 — Planning loop coherence**

  * Verify the planning lifecycle through the actual `engine.process()` loop.
  * Use a controlled/scripted model rather than subjective real-model evaluation.
  * Verify observable end-state, evidence integrity, and valid lifecycle transitions.

* **R4-F.2 — Single active-plan invariant**

  * Preserve the invariant that a session cannot have multiple active plans.
  * Verification is model-independent and based on durable store state.
  * Crash/recovery behavior is included in the acceptance criteria.

Explicitly **out of scope for R4 v1**:

* Model quality of plan/no-plan decisions.
* Subjective decomposition quality.
* Mandatory planning enforcement as a new mechanism.
* Stuck-recovery interaction behavior.
* BehaviorEngine / expressive behavior.
* Per-user planning policy.
* Resume/reuse semantics for `create_plan`.

For the last item, R4 v1 explicitly adopts **hard-reject** when a session already has an active plan. Resume/reuse remains a possible future workstream and is not silently reintroduced through legacy tests.

<br>

## Evidence & engineering discipline

Coral's hardening process intentionally separates **implementation facts**, **product decisions**, and **verification evidence**.

Each stage follows the same pattern:

```text
INITIAL AUDIT
     ↓
SCOPE / ADVERSARIAL REVIEW
     ↓
PRODUCT / SEMANTICS DECISIONS
     ↓
SPEC
     ↓
IMPLEMENTATION
     ↓
NARROW VERIFICATION
     ↓
EVIDENCE
     ↓
VERIFIED / REOPENED
```

A stage is not considered verified merely because code exists or a majority of tests pass. Verification requires the acceptance criteria to be exercised by deterministic evidence, with harness failures distinguished from implementation failures.

<br>

## License

*TBD.*

---

<p align="center"><sub>Built with Claude · governed by internal architecture decision records (ADRs)</sub></p>
