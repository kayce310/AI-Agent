# Ollama — Local LLM Runtime

| Field | Value |
|-------|-------|
| **Repo** | github.com/ollama/ollama |
| **License** | MIT |
| **Language** | Go |
| **Install** | `curl -fsSL https://ollama.com/install.sh \| sh` |
| **Key Hook** | Run open-source LLMs locally with one command |

## Core Architecture

1. **Local model runtime** — Download and run open models (Llama, Gemma, Mistral, etc.)
2. **CLI-first**: `ollama run`, `ollama pull`, `ollama launch` — developer-focused UX
3. **Ollama launch** — Integrates with Claude Code, Codex, Copilot CLI, OpenClaw, OpenCode
4. **Client libs**: ollama-python, ollama-js — SDK for programmatic access
5. **API**: OpenAI-compatible endpoint at `localhost:11434`

## Key Innovation vs Kato

| Aspect | Ollama | Kato (current) |
|--------|--------|----------------|
| Purpose | Local LLM runtime + model management | Task orchestration agent |
| Model | Hosts open models locally | Uses Claude via Cline |
| Integration | Hooks into IDEs + agent tools | Works within Cline/IDE |
| UX | One-command model pull + run | Task lists + checkpoints |
| Ecosystem | Ollama launch hub for agents | Single-system agent |

## What Kato Should Borrow

1. **OpenAI-compatible API** — Kato should be able to switch between Ollama (local) and cloud models via a unified adapter
2. **Model-as-service pattern** — Ollama's `ollama launch` for agent integrations is a model for Kato's skill/tool ecosystem
3. **Local-first fallback** — Kato should support Ollama as a local fallback for routine tasks, reserving Claude for complex reasoning

## Applicability to Kato

- **High**: OpenAI-compatible local inference, model management
- **Medium**: Agent ecosystem integrations, `ollama launch` pattern
- **Low**: Model training/finetuning

## Source

README.md (356 lines), dated 2026-05-15