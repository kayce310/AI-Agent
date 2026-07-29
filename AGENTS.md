# Coral Agent — Onboarding

> **Before editing any state-related code (plan, session, task, item, evidence):**
> read `docs/adr/ADR-000-state-principles.md` first. These rules are mandatory, not advisory.
> Violations caused 3 cascading bugs (evidenceLog scope, plan-state derive, concurrency race).

## Project overview

Coral is an AI-powered Telegram bot with layered TypeScript monorepo architecture.
See `CORAL.md` (root) for full architecture guide, module map, known issues, and pitfalls.

## Quick commands

| Action | Command |
|--------|---------|
| Install | `npm install` |
| Run dev | `npx tsx src/scripts/start-telegram.ts` |
| Test | `npx vitest run` |
| Type-check | `npx tsc --noEmit` |
| Baseline | 56 files / 1008 tests / 1 file failed (pre-existing) |
