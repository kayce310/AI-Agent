# PROGRESS_V1_FINAL.md

## 1. Progress Monitor làm gì?
Progress Monitor theo dõi và ghi nhận các tín hiệu (signal) cùng với cơ chế độ dõi độ đè (stagnation detection) để xác định tiến độ của các nhiệm vụ trongProgress V1.

## 2. Progress Monitor tuyệt đối không làm gì?
Progress Monitor **không** chịu trách nhiệm về hồi phục (recovery), lựa chọn nhiệm vụ (task selection), ghiép (supersede) hay kế hoạch lại (replan). Nó chỉ dừng (terminates) tại tín hiệu và độ đè, không sở hữu các chức năng phục hồi hay kế hoạch lại.

## 3. Lifecycle authority nằm ở đâu?
Luthority của lifecycle nằm trong lớp quản lý tín hiệu và bộ phát hiện độ đè, các thành phần này xác định thời điểm nào một tiến trình được xem là dừng hoặc dính đền.

## 4. Tại sao Recovery/Replan chưa thuộc V1?
Vì Progress V1 chỉ tập trung vào việc theo dõi và phát hiện độ dừng, không bao gồm chức năng hồi phục hay kế hoạch lại; những chức năng này nằm ngoài phạm vi V1.

## 5. Gap còn lại là gì và được chuyển thành roadmap riêng nào?
Gap còn lại là việc định hình chi tiết “Task Identity” và “Task Boundary”. Chúng được di chuyển vào roadmap riêng gọi là **CORAL TASK IDENTITY / TASK BOUNDARY**.

---

**Kết luận:** Progress V1 đã đạt được một điểm dừng hợp lý; không nên “feature creep” thêm Recovery Ladder vào V1 chỉ vì signal đã có. Hành động tiếp theo là đóng tài liệu/architecture checkpoint này, sau đó tách Task Identity / Task Boundary thành một workstream độc lập.