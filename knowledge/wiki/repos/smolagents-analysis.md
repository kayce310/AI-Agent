# SmolAgents — HuggingFace Minimal Agent Framework

| Field | Value |
|-------|-------|
| **Repo** | github.com/huggingface/smolagents |
| **Stars** | ~10k+ |
| **License** | Apache 2.0 |
| **Language** | Python |
| **Install** | `pip install "smolagents[toolkit]"` |
| **Key Hook** | "Agents that think in code!" — HuggingFace's minimal (~1,000 lines core) agent library. |

## Core Architecture

### Agent Types
1. **CodeAgent** — writes actions as Python code snippets. Uses **30% fewer steps** than JSON-based agents.
2. **ToolCallingAgent** — classic ReAct agent writing actions as JSON/text blobs.

### CodeAgent Flow (ReAct loop)
1. User task → agent.memory
2. Generate (LLM writes Python code)
3. Execute code → tool calls as Python function calls
4. Loop until `final_answer()` called

### Key Features
- **~1,000 lines core** (`agents.py`) — minimal abstractions
- **Model-agnostic** — supports transformers, LiteLLM (100+ models), OpenAI, Azure, Bedrock, HF Inference, Ollama
- **Modality-agnostic** — text, vision, video, audio
- **Tool-agnostic** — MCP servers, LangChain tools, HF Spaces, Hub tools
- **Sandboxed execution** — E2B, Blaxel, Modal, Docker, Pyodide+Deno
- **CLI** — `smolagent` and `webagent` commands
- **Hub integration** — push/pull agents and tools to HF Hub

### Security
- **Code execution is a security concern** — requires sandbox (E2B, Docker, Modal)
- `LocalPythonExecutor` is NOT a security boundary

## Key Comparisons vs Kato

| Aspect | SmolAgents | Kato (current) |
|--------|------------|----------------|
| Core size | **~1,000 lines** (`agents.py`) | Multiple modules (prompt-builder, state-manager, tool-pruner, skills-index) |
| Agent actions | **Code-first** (Python snippets) | Tool-calling via LLM |
| Model support | **100+ models** (LiteLLM, transformers, OpenAI, etc.) | Single model (Cline provider) |
| Tools | MCP, LangChain, HF Hub, custom | Built-in tool set only |
| Sandboxing | E2B, Docker, Modal, Blaxel | None |
| Hub sharing | Push/pull agents to HF Hub | No sharing mechanism |

## What Kato Should Borrow

1. **CodeAgent pattern** — writing actions as Python code instead of JSON tool calls reduces steps by 30%. Kato's prompt-builder could adopt this.
2. **Model abstraction** — SmolAgents' `InferenceClientModel` / `LiteLLMModel` / `TransformersModel` pattern is clean. Kato's `tools.ts` provider config could mirror this.
3. **MCP tool collection** — SmolAgents natively supports MCP servers as tool sources. Kato should add MCP client integration.
4. **Sandboxed execution** — Kato runs tools without isolation. Docker/E2B sandboxing would improve security.
5. **Minimal core philosophy** — "~1,000 lines" is a design goal Kato should aspire to. Currently Kato's engine modules are growing without strict size discipline.

## Applicability to Kato

- **High**: CodeAgent pattern (code-as-actions), model abstraction layer, MCP tool integration
- **Medium**: Sandboxed execution, minimal core philosophy, CLI for quick agents
- **Low**: HF Hub integration (Kato is local-only), web browsing agent

## Source

README.md (292 lines), smolagents v1.x (HuggingFace, 2025)