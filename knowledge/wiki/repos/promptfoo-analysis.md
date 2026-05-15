# Promptfoo — LLM Evals & Red Teaming

| Field | Value |
|-------|-------|
| **Repo** | github.com/promptfoo/promptfoo |
| **Stars** | ~15k+ |
| **License** | MIT |
| **Language** | TypeScript/Node.js |
| **Install** | `npm install -g promptfoo` |
| **Key Hook** | "Part of OpenAI" (acquired, remains MIT open source). LLM evals & red teaming CLI. |

## Core Architecture

### Eval Pipeline
1. **Config** — YAML/JS config defining prompts, models, test cases, assertions
2. **Run** — `promptfoo eval` executes test matrix (model x prompt x variant)
3. **Score** — Assertions (exact match, LLM-graded, similarity, regex, custom JS)
4. **View** — `promptfoo view` launches web UI for side-by-side comparison

### Red Teaming
- **Automated vulnerability scanning** — prompt injection, jailbreaking, data leakage
- **Scans** — runs adversarial test suites against LLM endpoints
- **Reports** — security vulnerability reports with severity scores

### Key Features
- **100% local** — prompts never leave machine
- **Multi-provider** — OpenAI, Anthropic, Azure, Bedrock, Ollama, 50+ providers
- **CI/CD integration** — automate eval checks in pipeline
- **Code scanning** — PR-level LLM security/compliance checks
- **Caching** — deduplicates LLM calls for fast iteration

## Key Comparisons vs Kato

| Aspect | Promptfoo | Kato (current) |
|--------|-----------|----------------|
| Purpose | **Testing & evaluation** of prompts/models | Agent orchestration & execution |
| Evals | Built-in eval harness + assertions | No eval system |
| Red teaming | Automated adversarial testing | No security scanning |
| CI/CD | Native CI integration | No CI pipeline |
| Provider matrix | **50+ LLM providers** compared side-by-side | Single provider (Cline's model) |
| Results UI | Web viewer for side-by-side comparison | No results visualization |

## What Kato Should Borrow

1. **Eval harness** — Kato desperately needs a way to test prompts/models. Promptfoo's assertion system (exact match, LLM-graded, similarity) is the gold standard.
2. **Multi-provider matrix testing** — Kato should adopt Promptfoo's pattern of testing across models to validate prompt portability.
3. **Red teaming** — Kato's `tool-pruner.ts` partially addresses tool misuse, but Promptfoo's adversarial testing is far more comprehensive.
4. **Caching layer** — LLM call caching (dedup identical calls) would dramatically improve Kato's eval/test iteration speed.
5. **CI/CD integration pattern** — Promptfoo's approach to embedding evals in CI pipelines is applicable to Kato's reliability goals.

## Applicability to Kato

- **High**: Eval harness, assertion system, multi-provider testing, LLM caching
- **Medium**: Red teaming, CI/CD integration patterns
- **Low**: Web UI (Kato is CLI-first), code scanning for non-LLM repos

## Source

README.md (100 lines), promptfoo v0.x (acquired by OpenAI, remains MIT)