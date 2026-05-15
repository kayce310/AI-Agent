# CrewAI — Multi-Agent Automation Framework

| Field | Value |
|-------|-------|
| **Repo** | github.com/crewAIInc/crewAI |
| **License** | MIT |
| **Language** | Python |
| **Install** | `pip install crewai` |
| **Key Hook** | Fast multi-agent orchestration — independent of LangChain |

## Core Architecture

1. **Crews**: Autonomous agents optimized for collaborative intelligence
2. **Flows**: Enterprise production architecture — granular event-driven control, single LLM calls
3. **Crew Control Plane**: Centralized management, tracing, observability
4. **AMP Suite**: Enterprise bundle for scalable deployment

## Key Innovation vs Kato

| Aspect | CrewAI | Kato (current) |
|--------|--------|----------------|
| Autonomy | Multi-agent crews with role-based collaboration | Single agent with tool calls |
| Orchestration | Event-driven Flows | Linear prompt-engine |
| Control Plane | Cloud control plane (app.crewai.com) | `state.json` + manual |
| Enterprise | AMP Suite — on-prem/cloud, 24/7 support | None |
| Training | 100k+ certified developers | None |
| Independence | Built from scratch, **no LangChain dependency** | Minimal dependencies |

## What Kato Should Borrow

1. **Event-driven flow architecture** — CrewAI Flows enable granular control. Kato's checkpoint system is step-based but not event-driven
2. **Role-based crews** — Multiple agent roles with shared memory/context could scale Kato beyond single-agent
3. **Zero LangChain dependency** — CrewAI's independence validates Kato's minimal dependency approach

## Applicability to Kato

- **High**: Event-driven orchestration, role-based agent design
- **Medium**: Control plane architecture, tracing
- **Low**: Enterprise features (cloud, 24/7 support)

## Source

README.md (807 lines), dated 2026-05-15