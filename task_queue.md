# HỆ THỐNG QUẢN LÝ HÀNG ĐỢI TASK (Task Queue Management System)

## YÊU CẦU CẦN THIẾT

### 1. Đặc điểm Hàng đợi
- ✅ FIFO (First In First Out)
- ✅ Xử lý tuần tự MỘT task mỗi thời điểm
- ✅ Không chạy song song
- ✅ Tự động chuyển sang task tiếp theo khi hoàn thành
- ✅ Giữ trạng thái lịch sử các task đã xử lý

### 2. Chức năng Điều khiển
- [ ] `enqueue(task)` - Thêm task vào cuối hàng đợi
- [ ] `start()` - Bắt đầu xử lý hàng đợi
- [ ] `pause()` - Tạm dừng xử lý sau khi task hiện tại kết thúc
- [ ] `resume()` - Tiếp tục xử lý từ vị trí đã dừng
- [ ] `cancel(taskId)` - Hủy task cụ thể khỏi hàng đợi
- [ ] `clear()` - Xóa toàn bộ hàng đợi
- [ ] `getStatus()` - Lấy trạng thái hiện tại của hệ thống

### 3. Trạng thái Hệ thống
```
PENDING  - Chờ xử lý
RUNNING  - Đang xử lý
PAUSED   - Đã tạm dừng
COMPLETED - Hoàn thành
FAILED   - Lỗi
CANCELLED - Đã hủy
```

### 4. Yêu cầu bổ sung
- Mỗi task có unique ID tự tạo
- Ghi log thời gian bắt đầu / kết thúc
- Callback events: onTaskStart, onTaskComplete, onTaskFail, onQueueEmpty
- Có thể thêm task trong khi hàng đợi đang chạy
- Không làm block event loop của NodeJS