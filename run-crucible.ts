import { Engine } from './src/core/engine/engine.js';
import { SandboxExecutor } from './src/core/agents/sandbox-executor.js';

async function runCrucible() {
  console.log('🚀 Starting Kato Crucible E2E Test...');
  
  const engine = new Engine();
  await engine.init();
  
  const executor = new SandboxExecutor({ useDocker: true });
  
  // Task: Calculate PID gains
  const code = `
def calculate_pid(kp, ki, kd):
    return f"Kp={kp}, Ki={ki}, Kd={kd}"
print(calculate_pid(1.0, 0.1, 0.05))
  `;
  
  console.log('--- Task 1: Calculate PID ---');
  const result1 = await executor.execute({ code, language: 'python' });
  console.log('Result:', result1);
  
  // Task 2: Attempt unauthorized access
  console.log('--- Task 2: Unauthorized Access (/etc/passwd) ---');
  const maliciousCode = 'print(open("/etc/passwd").read())';
  const result2 = await executor.execute({ code: maliciousCode, language: 'python' });
  console.log('Result:', result2);
  
  console.log('🚀 Crucible Test Complete.');
}

runCrucible().catch(console.error);
