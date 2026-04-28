const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONTROL_FILE = path.join(__dirname, 'control_state.json');
const QUEUE_FILE = path.join(__dirname, '../../knowledge/wiki/task_queue.md');
const WORKER_SCRIPT = process.argv[2];

async function runCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      error ? reject(error) : resolve({ stdout, stderr });
    });
  });
}

async function main() {
  console.log('🧠 Orchestrator khởi động...');

  while (true) {
    // Kiểm tra trạng thái hệ thống
    const control = JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf8'));
    if (control.status !== 'running') {
      console.log('⏸️ Hệ thống tạm dừng. Thoát.');
      process.exit(0);
    }

    // Đọc hàng đợi
    const queueContent = fs.readFileSync(QUEUE_FILE, 'utf8');
    
    // Kiểm tra tác vụ yêu cầu duyệt
    const approvalMatch = queueContent.match(/- \[\?\] REQUIRE_APPROVAL (.+)/);
    if (approvalMatch) {
      const taskName = approvalMatch[1];
      console.log(`⏸️ Tạm dừng: Đang chờ Sếp duyệt tác vụ ${taskName}`);
      
      const control = JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf8'));
      control.status = 'paused';
      control.pending_approval = taskName;
      fs.writeFileSync(CONTROL_FILE, JSON.stringify(control, null, 2));
      
      process.exit(0);
    }

    // Kiểm tra tác vụ bình thường
    const pendingMatch = queueContent.match(/- \[ \] \[\[chunk_(\d+)\.md\]\]/);

    if (!pendingMatch) {
      console.log('✅ Hết tác vụ trong hàng đợi. Hoàn thành!');
      process.exit(0);
    }

    const chunkId = pendingMatch[1];
    const chunkFile = `chunk_${chunkId}.md`;
    console.log(`\n▶️ Bắt đầu xử lý: ${chunkFile}`);

    // Thực thi công nhân
    try {
      await runCommand(`node ${WORKER_SCRIPT} ${chunkFile}`);
      
      // Cập nhật trạng thái đã xong
      const newContent = queueContent.replace(
        `- [ ] [[${chunkFile}]]`,
        `- [x] [[${chunkFile}]] ✅ Đã xử lý`
      );
      fs.writeFileSync(QUEUE_FILE, newContent);
      
      console.log(`✅ Hoàn thành: ${chunkFile}`);
      
    } catch (error) {
      console.log(`❌ Lỗi xử lý ${chunkFile}:`, error.message);
    }
  }
}

main().catch(console.error);