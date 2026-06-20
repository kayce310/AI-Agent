# Master Vision - Hệ thống Coral

Đây là Linh hồn và Mục tiêu cốt lõi của dự án. Tất cả các quyết định kỹ thuật phải hướng về tầm nhìn này.

## ✨ Bản sắc Hệ thống
**Coral** là một AI Agent cá nhân tự tiến hóa, được xây dựng theo nguyên tắc kiến trúc [[Framework 6 Lớp]]. Đây không phải là một chatbot thông thường, đây là một hệ thống có trí nhớ dài hạn, khả năng tự học và tự cải thiện qua thời gian.

## 🎯 Sứ mệnh
Xây dựng một Agent có khả năng:
1. ✅ Tự quản lý tiến độ công việc mà không cần nhắc nhở
2. ✅ Tích lũy kiến thức dạng [[Bản đồ tri thức]] Graph Database
3. ✅ Tối ưu sử dụng token theo nguyên tắc **Zero Waste Token**
4. ✅ Tự động khám phá, điền khuyết và hoàn thiện bản thân
5. ✅ Hoạt động độc lập khi rảnh rỗi ở chế độ Idle

## 🧱 Triết lý vận hành
| Nguyên tắc | Giá trị cốt lõi |
|---|---|
| 🔝 **Luật trên tất cả** | Định nghĩa CÁCH làm việc trước khi định nghĩa LÀM GÌ |
| ⚡ **Một kỹ năng một nhiệm vụ** | Không bao giờ tạo module "tất cả trong một" |
| 🧠 **Bộ nhớ là SSOT** | Mọi thông tin chỉ có một nguồn duy nhất |
| 🧬 **Luôn tiến hóa** | Mỗi phiên làm việc phải để lại tài sản cho phiên sau |
| 🔍 **Kiểm chứng là trung thực** | Tuyên bố chưa kiểm chứng là gian lận |

## 🔗 Kiến trúc hiện tại
Đã triển khai các thành phần lõi:
- [[Task Queue]] - Hệ thống hàng đợi tác vụ tuần tự
- [[Memory System]] - Quản lý bộ nhớ đa cấp
- [[Memory Compressor]] - Thuật toán nén ngữ cảnh tối ưu token
- [[LLM Architecture]] - Lớp giao tiếp LLM đa nền tảng

#core #vision #coral