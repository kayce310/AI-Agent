# ADR-002: MemoryTemporal Retention & Single-Store

**Status:** Accepted
**Date:** 2026-08-03
**Relates to:** ADR-000 (state principles)

## Context

Boot RAM >2GB. Root cause (measured, probe + tasklist):

- `engine.ts` created **two** `MemoryTemporal` instances on the same `logDir`
  (`temporalMemory` + `agenticMemory`). Each instance replays the full
  append-log into RAM: 480MB of JSON (store.log 245MB + snapshot.json 235MB,
  470,963 blocks / 1,093,291 ops). Measured: +357MB heapUsed per instance,
  +715MB heapUsed for two (probe with `--expose-gc`).
- `maxRetentionDays: 30` was declared but never enforced — no eviction, no
  cap. All 470k blocks live forever in a `Map`.
- `checkAndRotate()` existed but had no caller — single 245MB log file.
- Boot copy `globalMemoryStore.getAll() → temporalMemory.addBlock()` re-added
  the same blocks to the append-log on **every** restart (amplification).

## Decision

1. **Single episodic store.** Remove `agenticMemory`; all writes go through
   `temporalMemory`. One source of truth (ADR-000 §3.1).
2. **Retention policy enforced.** `MemoryTemporal.cleanupExpired()` — called
   once from `engine.init()` (the single production boot path): drop blocks
   older than `maxRetentionDays` (30), then cap the newest `maxBlocks` (5000,
   mirroring `MemoryStore`). When anything is evicted, `MemoryLog.compact()`
   writes a fresh snapshot and deletes old logs — the snapshot becomes the
   source of truth, so the next boot replays a small file, not 480MB.
3. **Log maintenance wired up.** After each `addBlock`: `shouldRotate() →
   rotate()` and `shouldSnapshot() → createSnapshot()` (pattern already used
   by `MemoryStore`).
4. **Boot copy removed.** Temporal is a journal from boot onward; semantic
   memory stays in `globalMemoryStore` (cap 5000, ADR-000 separation of
   concerns).

## Consequences

- Boot RAM: replay drops from ~1.3GB peak (2 × 480MB parse) to snapshot
  (~5MB) + recent log entries. Expected idle WS well below current ~466MB.
- Episodic memory keeps only the last 30 days / 5000 blocks. Zero readers
  today (verified: no caller of `getTemporalMemory`/`getAgenticMemory` /
  `query`/`getRecentBlocks`), so eviction loses no recall. When episodic
  recall is wired into prompts (Jarvis roadmap), retention values can be
  revisited.
- `getAgenticMemory()` removed (dead, 0 callers).

## Not doing (yet)

- SQLite for episodic storage — no read layer exists; migration belongs with
  the query/recall feature (YAGNI).
