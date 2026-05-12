import { TaskQueue } from './src/core/task-queue';

// Demo hệ thống hàng đợi
const queue = new TaskQueue();

// Đăng ký events
queue.on('taskStart', task => {
  console.log(`🚀 Bắt đầu task: ${task.name}`);
});

queue.on('taskComplete', (task, result) => {
  console.log(`✅ Hoàn thành: ${task.name} | Kết quả: ${result}`);
});

queue.on('taskFail', (task, error) => {
  console.log(`❌ Lỗi task: ${task.name} | ${error.message}`);
});

queue.on('paused', () => {
  console.log('⏸️ Hàng đợi đã tạm dừng');
});

queue.on('resumed', () => {
  console.log('▶️ Hàng đợi tiếp tục chạy');
});

queue.on('queueEmpty', () => {
  console.log('🟢 Tất cả task đã hoàn thành! Hàng đợi trống');
});

// Thêm task test
console.log('=== THÊM CÁC TASK VÀO HÀNG ĐỢI ===');

queue.enqueue({
  name: 'Task 1: Đọc file 1',
  execute: async () => {
    await new Promise(r => setTimeout(r, 1000));
    return 'Nội dung file A';
  }
});

queue.enqueue({
  name: 'Task 2: Xử lý dữ liệu',
  execute: async () => {
    await new Promise(r => setTimeout(r, 1500));
    return 'Đã xử lý 120 bản ghi';
  }
});

queue.enqueue({
  name: 'Task 3: Ghi file log',
  execute: async () => {
    await new Promise(r => setTimeout(r, 800));
    return 'Đã ghi log thành công';
  }
});

console.log('=== BẮT ĐẦU CHẠY HÀNG ĐỢI ===');
queue.start();

// Demo PAUSE sau 2 giây
setTimeout(() => {
  console.log('\n📢 GỬI LỆNH TẠM DỪNG...');
  queue.pause();
  
  // RESUME sau 3 giây
  setTimeout(() => {
    console.log('\n📢 GỬI LỆNH TIẾP TỤC...');
    queue.resume();
  }, 3000);
  
}, 2000);