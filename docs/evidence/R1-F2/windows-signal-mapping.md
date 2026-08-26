# Windows Signal Behavior Mapping — R1-F.2

Scope: `src/core/tools/process.ts` (R1-F.2), Node.js `child_process` on win32.

## Mapping table

| Call | What Node does on win32 | OS-level result | Graceful phase? |
|---|---|---|---|
| `child.kill()` / `child.kill('SIGTERM')` | signal argument ignored → TerminateProcess on direct child | Immediate forceful death of DIRECT child only | No |
| `child.kill('SIGKILL')` | TerminateProcess on direct child | Identical to SIGTERM above | No |
| `child.kill(anything ≠ 0)` | unconditional termination | identical | No |
| `taskkill /F /PID <pid>` | external tool | Forceful kill of one process | No |
| `taskkill /F /T /PID <pid>` | external tool | Forceful kill of ENTIRE descendant tree (root + all children) | No |

Typical exit code after any of these: `1`.

## Consequences encoded in R1-F.2 implementation

1. **SIGTERM ≡ SIGKILL for the direct child on win32.** There is no observable
   difference in timing or semantics (verified empirically: evidence T8,
   both die ≤1500 ms, delta ≤1200 ms).
2. **The SIGTERM → 5 s grace → escalation ladder normally completes at stage 1
   on win32** — a process cannot survive TerminateProcess, so the escalation
   timer (`KILL_GRACE_PERIOD_MS = 5000`) is a safety net, not an observable
   stage. The escalation branch itself is verified against a REAL live process
   via the exported production function `scheduleKillEscalation` (evidence T7:
   real `ping` victim killed by the production timer body after the grace).
3. **On win32, escalation uses `taskkill /F /T` instead of `kill('SIGKILL')`.**
   Since SIGKILL would only hard-kill the same direct child that just survived
   an already-fatal SIGTERM (a contradiction on this platform), the meaningful
   escalation is tree-wide forceful termination so no descendant can outlive it.
4. **Killing the direct child does NOT kill descendants.** With
   `spawn(cmd, {shell:true})`, the tracked PID is cmd.exe; its node children
   survive and become orphans when cmd.exe dies. Verified empirically
   (evidence T5). This gap is closed ONLY by Mechanism 2 (`tree: true`),
   which issues `taskkill /F /T /PID` (evidence T4: root AND worker PIDs both
   confirmed absent from tasklist).

## POSIX note (documented limitation)

POSIX tree kill is NOT implemented in R1-F.2 scope. On non-win32,
`tree: true` falls back to signaling the direct child only and returns
`method: 'direct-child-only'`, `tree_kill: false` with an explanatory note.

## Reference

- Node.js docs: https://nodejs.org/api/child_process.html#subprocesskillsignal
  ("On Windows ... the signal argument is ignored ... the process will be
  killed forcefully and abruptly", exit code non-zero).
- Empirical verification: `docs/evidence/R1-F2/results.json` (T4, T5, T7, T8),
  produced by `docs/evidence/R1-F2/r1-f2.test.cjs`.
