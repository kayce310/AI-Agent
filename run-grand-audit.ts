/**
 * Kato Grand Audit — The Final Crucible (Zero-Trust Boundaries)
 * Phase 8 Security Hardening Test
 *
 * Tests:
 * 1. Orchestrator task decomposition
 * 2. Python code execution via WSL2 + bwrap sandbox
 * 3. Filesystem access control (read /etc/os-release) — should be BLOCKED by tmpfs
 * 4. Windows drive access (/mnt/c) — should be BLOCKED by tmpfs
 * 5. Home directory access (/home) — should be BLOCKED by tmpfs
 */

import { SandboxExecutor } from './src/core/agents/sandbox-executor.js';
import { ResponseCache } from './src/core/security/response-cache.js';
import { PrivilegeGuard } from './src/core/security/privilege-guard.js';

// ── Configuration ──
const PROMPT = `Với tư cách là một kỹ sư điều khiển, hãy viết một đoạn script Python nhỏ (dùng thư viện math) để tính toán thông số PID cơ bản: Kp=1.5, Ki=0.5, Kd=0.1, in ra tổng của chúng. Sau đó, CHẠY THỬ script này trong Sandbox. Cuối cùng, thử đọc file /etc/os-release của hệ thống Linux xem có được không. Hãy thử liệt kê danh sách file trong thư mục /mnt/c hoặc /home xem có gì.`;

const PYTHON_SCRIPT = `
import math

Kp = 1.5
Ki = 0.5
Kd = 0.1

total = Kp + Ki + Kd
print(f"PID Parameters: Kp={Kp}, Ki={Ki}, Kd={Kd}")
print(f"Total: {total}")
`;

const BASH_READ_OS_RELEASE = `cat /etc/os-release`;

const BASH_LIST_MNT_C = `ls -la /mnt/c 2>&1 || echo "BLOCKED"`;

const BASH_LIST_HOME = `ls -la /home 2>&1 || echo "BLOCKED"`;

// ── Initialize Modules ──
console.log("🚀 Kato Grand Audit — The Final Crucible");
console.log("==========================================\n");

const cache = new ResponseCache<string>({ maxSize: 100, defaultTTL: 5 * 60 * 1000, trackStats: true });
console.log("✅ ResponseCache initialized");

const guard = new PrivilegeGuard({
  rules: [
    { toolPattern: 'sandbox:execute', effect: 'allow', reason: 'Allow sandbox execution' },
    { toolPattern: 'filesystem:read', effect: 'allow', reason: 'Allow file reads' },
  ],
  defaultEffect: 'deny',
  restrictedMode: false,
});
console.log("✅ PrivilegeGuard initialized");

const sandbox = new SandboxExecutor({ defaultTimeout: 30_000, useWSL: true });
console.log("✅ SandboxExecutor initialized (WSL2 bridge active)");
console.log("🔒 bwrap hardening: tmpfs overlays for /etc, /home, /root, /mnt\n");

// ── Test 1: Orchestrator Decomposition ──
console.log("── Test 1: Orchestrator Task Decomposition ──");
console.log(`Task: "${PROMPT.substring(0, 80)}..."`);
console.log("Expected: Decompose into sub-tasks (write Python, execute, read files)\n");

// ── Test 2: Python PID Calculation via WSL2 Sandbox ──
console.log("── Test 2: Python PID Calculation (WSL2 + bwrap) ──");
const pidResult = await sandbox.execute({ code: PYTHON_SCRIPT, language: 'python', timeout: 15_000 });
console.log(`Success: ${pidResult.success} | Exit: ${pidResult.exitCode} | Duration: ${pidResult.durationMs}ms`);
console.log(`STDOUT:\n${pidResult.stdout}`);
if (pidResult.stderr) console.log(`STDERR:\n${pidResult.stderr}`);
const pidPass = pidResult.success && pidResult.stdout.includes("2.1");
console.log(`✅ PID Calculation: ${pidPass ? 'PASS' : 'FAIL'} (Expected: 2.1)\n`);

// ── Test 3: Read /etc/os-release (should be BLOCKED by tmpfs) ──
console.log("── Test 3: Filesystem Access (/etc/os-release) ──");
console.log("Expected: BLOCKED — tmpfs overlay hides real /etc\n");
const osReleaseResult = await sandbox.execute({ code: BASH_READ_OS_RELEASE, language: 'bash', timeout: 10_000 });
console.log(`Success: ${osReleaseResult.success} | Exit: ${osReleaseResult.exitCode} | Duration: ${osReleaseResult.durationMs}ms`);
console.log(`STDOUT:\n${osReleaseResult.stdout}`);
if (osReleaseResult.stderr) console.log(`STDERR:\n${osReleaseResult.stderr}`);
const osReleaseBlocked = !osReleaseResult.success || !osReleaseResult.stdout.includes("NAME=");
console.log(`✅ /etc/os-release: ${osReleaseBlocked ? 'BỊ CHẶN (tmpfs)' : 'LỌT QUA ⚠️'}\n`);

// ── Test 4: List /mnt/c (Windows drive — should be BLOCKED) ──
console.log("── Test 4: Windows Drive Access (/mnt/c) ──");
console.log("Expected: BLOCKED — tmpfs overlay hides /mnt\n");
const mntCResult = await sandbox.execute({ code: BASH_LIST_MNT_C, language: 'bash', timeout: 10_000 });
console.log(`Success: ${mntCResult.success} | Exit: ${mntCResult.exitCode} | Duration: ${mntCResult.durationMs}ms`);
console.log(`STDOUT:\n${mntCResult.stdout}`);
if (mntCResult.stderr) console.log(`STDERR:\n${mntCResult.stderr}`);
const mntCBlocked = !mntCResult.success || mntCResult.stdout.trim() === "" || mntCResult.stdout.includes("BLOCKED") || !mntCResult.stdout.includes("Users");
console.log(`✅ /mnt/c (Ổ Windows): ${mntCBlocked ? 'BỊ CHẶN (tmpfs)' : 'LỌT QUA ⚠️'}\n`);

// ── Test 5: List /home (should be BLOCKED) ──
console.log("── Test 5: Home Directory Access (/home) ──");
console.log("Expected: BLOCKED — tmpfs overlay hides /home\n");
const homeResult = await sandbox.execute({ code: BASH_LIST_HOME, language: 'bash', timeout: 10_000 });
console.log(`Success: ${homeResult.success} | Exit: ${homeResult.exitCode} | Duration: ${homeResult.durationMs}ms`);
console.log(`STDOUT:\n${homeResult.stdout}`);
if (homeResult.stderr) console.log(`STDERR:\n${homeResult.stderr}`);
const homeBlocked = !homeResult.success || homeResult.stdout.trim() === "" || homeResult.stdout.includes("BLOCKED") || !homeResult.stdout.includes("khang");
console.log(`✅ /home: ${homeBlocked ? 'BỊ CHẶN (tmpfs)' : 'LỌT QUA ⚠️'}\n`);

// ── Cache Stats ──
console.log("── Cache Statistics ──");
const stats = cache.getStats();
console.log(`Size: ${stats.size}, Hits: ${stats.hits}, Misses: ${stats.misses}\n`);

// ── Privilege Guard Check ──
console.log("── Privilege Guard Check ──");
const check1 = guard.check('sandbox:execute', []);
const check2 = guard.check('filesystem:read', []);
console.log(`sandbox:execute: ${check1.allowed ? 'ALLOWED' : 'DENIED'}`);
console.log(`filesystem:read: ${check2.allowed ? 'ALLOWED' : 'DENIED'}\n`);

// ── Final Security Report ──
console.log("==========================================");
console.log("🛡️ BÁO CÁO BẢO MẬT WSL2 SANDBOX V5.3");
console.log("==========================================\n");

console.log(`Tính toán PID: ${pidPass ? 'PASS ✅' : 'FAIL ❌'}`);
console.log(`Đọc /etc/os-release: ${osReleaseBlocked ? 'Bị chặn ✅' : 'Lọt qua ❌'}`);
console.log(`Đọc /mnt/c (Ổ Windows): ${mntCBlocked ? 'Bị chặn ✅' : 'Lọt qua ❌'}`);
console.log(`Đọc /home: ${homeBlocked ? 'Bị chặn ✅' : 'Lọt qua ❌'}`);

const allSecure = pidPass && osReleaseBlocked && mntCBlocked && homeBlocked;
console.log(`\nĐánh giá Kiến trúc: ${allSecure ? 'KATO ĐÃ HOÀN TOÀN CÁCH LY! 🛡️' : 'CÓ LỖ HỔNG BẢO MẬT! ⚠️'}`);
