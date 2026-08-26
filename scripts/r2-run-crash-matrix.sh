#!/usr/bin/env bash
# R2 Step 5 — crash-injection test matrix v2 (real processes, real crash, real restart).
# Children mirror production wiring: getCheckpoint() SINGLETON + cwd-based default dirs.
# Runs against production dist artifacts. Output = raw log for docs/evidence/R2/.
set -u
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
EV="$ROOT/docs/evidence/R2"
ART="$EV/artifacts"
OUT="$EV/crash-injection-results.txt"
mkdir -p "$ART"
: > "$OUT"

log() { echo -e "$@" | tee -a "$OUT"; }

log "=== R2 CRASH-INJECTION RESULTS ==="
log "date: $(date -Iseconds)"
log "node: $(node --version)"
log "git HEAD: $(git rev-parse HEAD)"
log "branch: $(git branch --show-current)"
log ""

pass=0; fail=0
assert() { # assert <name> <0|1> [<detail>]
  if [ "$2" = "1" ]; then log "PASS: $1 ${3:-}"; pass=$((pass+1));
  else log "FAIL: $1 ${3:-}"; fail=$((fail+1)); fi
}

FIXBASE="$ROOT/.r2-fixtures"
rm -rf "$FIXBASE"; mkdir -p "$FIXBASE"

# ---------- S1: uncaughtException → singleton flushSync → exit(1) ----------
log "--- S1: crash handler best-effort flush (§A) ---"
S1="$FIXBASE/s1"; mkdir -p "$S1"
node scripts/r2-crash-child.mjs s1-flush-on-uncaught "$S1" >>"$OUT" 2>&1
S1_RC=$?
log "child exit code: $S1_RC"
[ "$S1_RC" = "1" ] && A=1 || A=0
assert "s1.exit-code-1" $A
CPFILE=$(ls "$S1"/knowledge/checkpoints/cp-req-s1-*.json 2>/dev/null | head -1)
[ -n "$CPFILE" ] && B=1 || B=0
assert "s1.checkpoint-flushed-before-exit" $B "file=$(basename "${CPFILE:-none}")"
if [ -n "$CPFILE" ] && node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$CPFILE" 2>>"$OUT"; then C=1; else C=0; fi
assert "s1.flushed-json-valid(atomic)" $C
TOOL_ST=$(node -e "
const s=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'));
const st=s.cycles[s.cycles.length-1].toolStatus;
console.log(st['tool-A']==='completed' && st['tool-B']==='running' ? 'OK':'BAD');
" "$CPFILE" 2>>"$OUT")
[ "$TOOL_ST" = "OK" ] && D=1 || D=0
assert "s1.toolStatus-completed+running-preserved" $D
cp "$CPFILE" "$ART/s1-flushed-checkpoint.json" 2>/dev/null

# ---------- S3: restart in SAME fixture → load + recover, no duplicate ----------
log ""
log "--- S3: restart loads persisted state + recovery annotations (§B/§D) ---"
node scripts/r2-crash-child.mjs s3-no-dup-restart "$S1" >"$ART/s3-restart.out" 2>&1
S3_RC=$?
cat "$ART/s3-restart.out" >>"$OUT"
RES=$(grep -o 'CHILD_RESULT=.*' "$ART/s3-restart.out" | head -1 | sed 's/CHILD_RESULT=//')
log "child exit code: $S3_RC result: $RES"
EXISTING=$(node -e "try{console.log(JSON.parse(process.argv[1]).existing)}catch(e){console.log('')}" "$RES")
RECOVERED=$(node -e "try{console.log(JSON.parse(process.argv[1]).recovered)}catch(e){console.log('')}" "$RES")
[ "$S3_RC" = "0" ] && E=1 || E=0
assert "s3.restart-loads-checkpoint-no-crash" $E
[ "$EXISTING" = "req-s1" ] && F=1 || F=0
assert "s3.active-task-reused-not-duplicated(Fix-C)" $F "active=$EXISTING"
[ "$RECOVERED" = "1" ] && G=1 || G=0
assert "s3.recovery-annotation-applied" $G
# R2 §B: recovery annotation persisted iff result shows recovered:1 (loader process marked it)
[ "$RECOVERED" = "1" ] && H=1 || H=0
assert "s3.recovery-persisted-in-memory-state" $H

# ---------- S4: background interrupted-vs-requeue policy (§C) ----------
log ""
log "--- S4: background task recovery semantics (§C) ---"
S4="$FIXBASE/s4"; mkdir -p "$S4"
# Phase 1: writer creates running task
node scripts/r2-crash-child.mjs s4-bg-writer "$S4" >"$ART/s4-writer.out" 2>&1
cat "$ART/s4-writer.out" >>"$OUT"
# Phase 2: seed checkpoint WITHIN FIXTURE (same singleton memory as loader will use)
node scripts/r2-crash-child.mjs s4-seed "$S4" >>"$OUT" 2>&1
# Phase 3: loader boots, inits CP (loads seed), then TQ → should see proven → interrupted
node scripts/r2-crash-child.mjs s4-bg-loader "$S4" >"$ART/s4-loader.out" 2>&1
S4L_RC=$?
cat "$ART/s4-loader.out" >>"$OUT"
R4=$(grep -o 'CHILD_RESULT=.*' "$ART/s4-loader.out" | head -1 | sed 's/CHILD_RESULT=//')
log "loader exit code: $S4L_RC result: $R4"
INT=$(node -e "try{console.log(JSON.parse(process.argv[1]).interrupted)}catch(e){console.log('')}" "$R4")
REQ=$(node -e "try{console.log(JSON.parse(process.argv[1]).requeued)}catch(e){console.log('')}" "$R4")
PROG=$(node -e "try{console.log(JSON.parse(process.argv[1]).progress||'')}catch(e){console.log('')}" "$R4")
PROV=$(node -e "try{console.log(JSON.parse(process.argv[1]).provenCompleted)}catch(e){console.log('')}" "$R4")
[ "$INT" = "1" ] && I=1 || I=0
assert "s4.partial-completion→interrupted(NOT auto-requeued)" $I "provenCompleted=$PROV"
[ "$REQ" = "0" ] && J=1 || J=0
assert "s4.no-silent-full-rerun" $J
echo "$PROG" | grep -q "NOT auto-requeued" && K=1 || K=0
assert "s4.progress-message-explicit" $K

# ---------- S4-control: no proven completion → legacy requeue preserved ----------
log ""
log "--- S4-control: no-proven-completion → legacy requeue ---"
S5="$FIXBASE/s5"; mkdir -p "$S5"
node scripts/r2-crash-child.mjs s4-bg-writer "$S5" >/dev/null 2>&1
node scripts/r2-crash-child.mjs s4-bg-loader "$S5" >"$ART/s4-control.out" 2>&1
RC=$(grep -o 'CHILD_RESULT=.*' "$ART/s4-control.out" | sed 's/CHILD_RESULT=//')
log "control result: $RC"
RQ2=$(node -e "try{console.log(JSON.parse(process.argv[1]).requeued)}catch(e){console.log('')}" "$RC")
[ "$RQ2" = "1" ] && L=1 || L=0
assert "s4ctrl.no-proof→legacy-requeued" $L

# ---------- Summary ----------
log ""
log "=== SUMMARY: $pass PASS / $fail FAIL ==="
rm -rf "$FIXBASE"
[ "$fail" = "0" ] && exit 0 || exit 1
