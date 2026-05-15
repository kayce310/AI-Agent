# LiteLLM — Open Source AI Gateway

| Field | Value |
|-------|-------|
| **Repo** | github.com/BerriAI/litellm |
| **License** | MIT |
| **Language** | Python |
| **Install** | `pip install litellm` |
| **Key Hook** | Unified interface for 100+ LLM providers in OpenAI format |

## Core Architecture

1. **AI Gateway** — Single endpoint for 100+ providers (OpenAI, Anthropic, Gemini, Bedrock, Azure, etc.)
2. **Unified API** — OpenAI-compatible format for all providers
3. **Proxy Server** — Centralized gateway with virtual keys, spend tracking, guardrails, load balancing, admin dashboard
4. **Performance** — 8ms P95 latency at 1k RPS
5. **Enterprise** — Netflix, Stripe, Google ADK, Greptile, OpenHands as adopters

## Key Innovation vs Kato

| Aspect | LiteLLM | Kato (current) |
|--------|---------|----------------|
| Purpose | LLM API gateway — multi-provider proxy | Agent orchestration |
| Provider support | 100+ LLM providers | Claude only (via Cline) |
| API format | Unified OpenAI format | N/A (internal) |
| Auth/Rate-limit | Virtual keys, spend tracking | None |
| Guardrails | Content moderation, load balancing | Manual |
| Admin dashboard | Built-in | None |

## What Kato Should Borrow

1. **Unified model adapter** — LiteLLM's single-interface approach for model calls. Kato should abstract model providers behind an adapter
2. **Virtual keys + spend tracking** — If Kato runs on a team, LiteLLM's virtual key system for cost attribution is essential
3. **Guardrails pattern** — Built-in guardrails (rate limiting, content filtering) would make Kato safer for autonomous operation

## Applicability to Kato

- **High**: Unified model adapter pattern, multi-provider abstraction
- **Medium**: Spend tracking, guardrails, proxy architecture
- **Low**: Full gateway deployment

## Source

README.md (524 lines), dated 2026-05-15