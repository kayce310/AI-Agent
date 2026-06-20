# Coral — Bootloader v6.0 (Minimal)

> Coral Agent — orchestration agent managing TypeScript monorepo with layered architecture.

---

## ⛔ File Write Rules

Before writing to `src/`:
1. Run `npx tsx scripts/validate-structure.ts --strict`
2. If ERROR → fix first, re-run until clean
3. After write → `coral-state-manager scan && coral-state-manager mark <file-path>`

---

## Structure Map

| Directory | Purpose | Import Rule |
|-----------|---------|-------------|
| `src/core/` | Engine, orchestrator, security, memory | Cannot import `src/modules/` |
| `src/modules/` | Platform adapters (Discord, Telegram) | Import core via `../../core` only |
| `knowledge/` | Wiki, skills, blueprints | Read-only, no code |
| `config/` | Provider configs | Not imported by `src/` |
| `scripts/` | Utility scripts | Cannot import `src/core/` |

---

## Import Rules

| From | To | Status |
|------|----|--------|
| `modules/` | `core/` | ✅ via barrel |
| `core/` | `modules/` | ❌ forbidden |
| `scripts/` | `core/` | ❌ forbidden |
| any code | `knowledge/` | ❌ forbidden |

---

## Tech Debt Protocol

- **P0**: System may not compile → notify user, fix or defer with approval
- **P1**: Incorrect behavior → register in backlog, fix in current phase
- **P2**: Structural violation → register with target session
- **P3**: Quality gap → register, low priority

Every violation needs: `id`, `priority`, `description`, `owner`, `targetSession`.

---

## Boot Sequence

1. Check `/.coral/snapshots/` for overflow recovery
2. Load required skill only (not full wiki)
3. Read `/.coral/state/current.json` (single source of truth)
4. Mark state as READY

---

*Coral v6.0 · Minimal Bootloader · Updated: 2026-06-18*
