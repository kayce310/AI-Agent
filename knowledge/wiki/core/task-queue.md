# Task Queue Management System

Module quản lý hàng đợi tác vụ tuần tự với khả năng tạm dừng / tiếp tục xử lý an toàn. Đây là thành phần lõi cơ sở của hệ thống [[Coral]].

## Đặc điểm kỹ thuật
- ✅ FIFO Queue chuẩn
- ✅ Xử lý tuần tự **MỘT** task mỗi thời điểm
- ✅ Không block NodeJS Event Loop
- ✅ Pause hoạt động an toàn giữa các task (không ngắt task đang chạy)
- ✅ Event Emitter với toàn bộ lifecycle hooks
- ✅ Lịch sử xử lý hoàn chỉnh với timestamp
- ✅ Hỗ trợ thêm task động khi hàng đợi đang chạy

## Trạng thái Task
| Trạng thái | Mô tả |
|---|---|
| `pending` | Đang chờ trong hàng đợi |
| `running` | Đang thực thi |
| `completed` | Hoàn thành thành công |
| `failed` | Xảy ra lỗi khi thực thi |
| `cancelled` | Đã hủy trước khi chạy |
| `paused` | Hàng đợi đang tạm dừng |

## API Methods
```typescript
enqueue(task: TaskInput): string
start(): void
pause(): void
resume(): void
cancel(taskId: string): boolean
clear(): void
getStatus(): QueueStatus
getHistory(): Task[]
getPendingTasks(): Task[]
```

## Events
- `taskStart` - Khi bắt đầu chạy một task
- `taskComplete` - Khi task hoàn thành thành công
- `taskFail` - Khi task xảy ra lỗi
- `paused` - Khi hàng đợi đã tạm dừng
- `resumed` - Khi hàng đợi tiếp tục chạy
- `queueEmpty` - Khi tất cả task đã được xử lý

## Vị trí file
`src/core/task-queue.ts`

#core #queue #architecture