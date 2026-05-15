/**
 * Emergency Checkpoint — được gọi khi token budget > criticalThreshold (240k)
 * hoặc tool call fail. 
 * 
 * Chức năng:
 * 1. Update checkpoint.json với emergencySaved = true
 *  ️2. Git add + commit tất cả thay đổi hiện tại
 * 3. Ghi vào evolution.json emergency event
 * 4. Auto-cleanup khi task hoàn thành (reason = "task_complete")
 * 
 * Usage: node scripts/checkpoint-emergency.mjs [reason]
 *   reason: "token_critical" | "tool_fail" | "overflow_detected" | "user_request" | "task_complete"
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const PROJECT_ROOT = process.cwd(); // should run from project root
const CHECKPOINT_PATH = path.join(PROJECT_ROOT, 'knowledge/workspace/checkpoint.json');
const STATE_PATH = path.join(PROJECT_ROOT, 'knowledge/workspace/state.json');
const EVOLUTION_PATH = path.join(PROJECT_ROOT, 'knowledge/workspace/evolution.json');

function getTimestamp() {
  return new Date().toISOString();
}

function readJSON(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Auto-cleanup checkpoint khi tất cả task đã hoàn thành.
 * Reset bộ đếm, session history, completed/pending steps về trạng thái sạch.
 */
function autoCleanup(checkpoint, timestamp) {
  console.log(`🧹 AUTO-CLEANUP: All tasks complete — resetting checkpoint counters`);

  checkpoint.session = {
    id: checkpoint.session?.id || 'clean-session',
    originalSessionId: null,
    resumeCount: 0,
    lastResumedAt: null,
    sessionHistory: []
  };

  checkpoint.progress = {
    overallPhase: '✅ COMPLETED',
    overallProgress: '100%',
    currentStep: null,
    completedSteps: [],
    pendingSteps: [],
    failedSteps: []
  };

  checkpoint.context = {
    ...checkpoint.context,
    currentEstimateUsage: 0,
    filesModifiedThisSession: [],
    lastToolResult: null,
    lastToolTime: null,
    emergencySaved: false
  };

  checkpoint.checkpoint = {
    ...checkpoint.checkpoint,
    lastSavedAt: timestamp,
    totalSaves: 0,
    lastEmergencyReason: null,
    isEmergency: false
  };

  checkpoint.resumeInstructions = {
    mustReadFilesFirst: [],
    mustVerifyState: [],
    assumeContextLost: false
  };

  // Ghi lại milestone vào meta
  checkpoint.meta.lastCompletedAt = timestamp;
  checkpoint.meta.lastCompletedSummary = 'All tasks completed — checkpoint auto-cleaned';

  return checkpoint;
}

/**
 * Kiểm tra xem tất cả task đã hoàn thành chưa
 * Dựa trên: pendingSteps rỗng VÀ completedSteps có items
 */
function isAllTasksComplete(checkpoint) {
  const pending = checkpoint.progress?.pendingSteps || [];
  const completed = checkpoint.progress?.completedSteps || [];
  return pending.length === 0 && completed.length > 0;
}

function main() {
  const reason = process.argv[2] || 'emergency_unknown';
  const timestamp = getTimestamp();

  // ── TRƯỜNG HỢP ĐẶC BIỆT: Task Complete → auto-cleanup ──
  if (reason === 'task_complete') {
    console.log(`🎯 TASK COMPLETE — Running auto-cleanup`);
    
    let checkpoint = readJSON(CHECKPOINT_PATH) || {};
    checkpoint = autoCleanup(checkpoint, timestamp);
    writeJSON(CHECKPOINT_PATH, checkpoint);
    
    // Git commit milestone
    try {
      execSync('git add -A', { encoding: 'utf8', stdio: 'pipe' });
      execSync(`git commit -m "[CLEANUP] task complete — checkpoint auto-reset" --allow-empty`, { encoding: 'utf8', stdio: 'pipe' });
      console.log(`✅ Git committed cleanup milestone`);
    } catch (err) {
      console.log(`ℹ️  Git commit skipped: ${err.message}`);
    }

    console.log(`\n🧹 CHECKPOINT AUTO-CLEANED — Ready for next task`);
    return;
  }

  // ── KIỂM TRA AUTO-CLEANUP TRƯỚC KHI EMERGENCY ──
  const checkpointBefore = readJSON(CHECKPOINT_PATH);
  if (checkpointBefore && isAllTasksComplete(checkpointBefore)) {
    console.log(`🎯 All tasks detected as complete — auto-cleaning before emergency save`);
    const cleaned = autoCleanup(checkpointBefore, timestamp);
    writeJSON(CHECKPOINT_PATH, cleaned);
    console.log(`✅ Checkpoint cleaned. Proceeding with emergency save skipped.`);
    return;
  }

  // ── EMERGENCY NORMAL ──
  const commitMsg = `[EMERGENCY] checkpoint-${timestamp.slice(0, 10)}-${reason}`;

  console.log(`🚨 EMERGENCY CHECKPOINT — Reason: ${reason}`);
  console.log(`⏱  Timestamp: ${timestamp}`);

  // 1. Update checkpoint.json
  const checkpoint = readJSON(CHECKPOINT_PATH) || {};
  const prevUsage = checkpoint.context?.currentEstimateUsage || 'unknown';
  checkpoint.checkpoint = checkpoint.checkpoint || {};
  checkpoint.checkpoint.lastSavedAt = timestamp;
  checkpoint.checkpoint.totalSaves = (checkpoint.checkpoint.totalSaves || 0) + 1;
  checkpoint.checkpoint.lastEmergencyReason = reason;
  checkpoint.checkpoint.isEmergency = true;
  checkpoint.context = checkpoint.context || {};
  checkpoint.context.emergencySaved = true;
  checkpoint.context.lastToolResult = { status: 'emergency_save', reason, timestamp };

  writeJSON(CHECKPOINT_PATH, checkpoint);
  console.log(`✅ checkpoint.json updated (save #${checkpoint.checkpoint.totalSaves})`);

  // 2. Git operations
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    if (status) {
      execSync('git add -A', { encoding: 'utf8', stdio: 'pipe' });
      execSync(`git commit -m "${commitMsg}" --allow-empty`, { encoding: 'utf8', stdio: 'pipe' });
      console.log(`✅ Git committed: "${commitMsg}"`);
    } else {
      console.log(`ℹ️  No changes to commit`);
      execSync(`git commit --allow-empty -m "${commitMsg} (no changes)"`, { stdio: 'pipe' });
      console.log(`✅ Empty commit: "${commitMsg}"`);
    }

    // Update checkpoint dependencies
    checkpoint.dependencies = checkpoint.dependencies || {};
    checkpoint.dependencies.lastGitCommit = commitMsg;
    checkpoint.dependencies.lastGitCommitAt = timestamp;
    writeJSON(CHECKPOINT_PATH, checkpoint);
  } catch (err) {
    console.error(`❌ Git operation failed: ${err.message}`);
    console.log(`ℹ️  Continuing — checkpoint already saved`);
  }

  // 3. Ghi evolution.json
  let evolution = readJSON(EVOLUTION_PATH) || { errors: [] };
  evolution.errors = evolution.errors || [];
  evolution.errors.push({
    id: `SYS-EMERGENCY-${timestamp}`,
    type: 'SYSTEM',
    code: 'CONTEXT_OVERFLOW_EMERGENCY',
    fingerprint: `checkpoint-emergency-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    severity: 'CRITICAL',
    context: {
      reason,
      prevUsage,
      saveCount: checkpoint.checkpoint.totalSaves,
      resumeCount: checkpoint.session?.resumeCount || 0,
    },
    message: `Emergency checkpoint triggered: ${reason}`,
    contextSnippet: `prevUsage: ${prevUsage}, saveCount: ${checkpoint.checkpoint.totalSaves}, commit: ${commitMsg}`,
  });
  writeJSON(EVOLUTION_PATH, evolution);
  console.log(`✅ evolution.json updated (total errors: ${evolution.errors.length})`);

  console.log(`\n🔐 EMERGENCY CHECKPOINT COMPLETE`);
  console.log(`   Git commit: ${commitMsg}`);
  console.log(`   Next: user sẽ resume bằng RESUME.md`);
}

main();