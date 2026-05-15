# AgentScope — Production-Ready Agent Framework

| Field | Value |
|-------|-------|
| **Repo** | github.com/agentscope-ai/agentscope |
| **License** | Apache 2.0 |
| **Language** | Python |
| **Install** | `pip install agentscope` |
| **Key Hook** | Built-in ReAct agent, MCP/A2A support, finetuning |

## Core Architecture

1. **Built-in ReAct agent** — reasoning + action loop out of the box
2. **Message Hub** — flexible multi-agent orchestration and workflows
3. **MCP + A2A** — native support for Model Context Protocol and Agent-to-Agent
4. **Built-in**: tools, skills, human-in-the-loop, memory, planning, realtime voice, evaluation, model finetuning
5. **Deployment**: local, serverless cloud, K8s with OTel

## Key Innovation vs Kato

| Aspect | AgentScope | Kato (current) |
|--------|------------|----------------|
| Architecture | ReAct agent + message hub | Linear prompt builder |
| MCP/A2A | **Built-in** | None |
| Finetuning | Built-in model finetuning | N/A |
| Human-in-loop | Integrated steering | Manual |
| Multi-agent | Message hub for workflows | Single agent |
| Deployment | Local/cloud/K8s with OTel | Local only |

## What Kato Should Borrow

1. **MCP + A2A support** — AgentScope has native MCP/A2A which Kato lacks. Critical for interoperability
2. **Message Hub pattern** — Flexible multi-agent orchestration without heavy dependencies
3. **ReAct agent as base** — Built-in reasoning + action loop would simplify Kato's prompt engine

## Applicability to Kato

- **High**: MCP/A2A integration, message hub, ReAct pattern
- **Medium**: Human-in-the-loop steering, skill/tool management
- **Low**: Model finetuning, cloud deployment

## Source

README.md (408 lines), dated 2026-05-15