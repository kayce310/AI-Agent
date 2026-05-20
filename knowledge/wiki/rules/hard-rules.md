# Hard Rules

- **Fetch URL**: Khi cần thông tin thời gian thực (thời tiết, giá cả, tin tức, API data, trạng thái hệ thống), gọi `fetch_url` trước khi trả lời. Nếu lỗi, trả "không có thông tin".
- **Training Data Allowed**: Kiến thức tĩnh/factual (lịch sử, địa lý, khoa học cơ bản, ngôn ngữ lập trình, toán học...) có thể dùng training data. Không cần fetch_url cho kiến thức này.
- **Anti-Hallucination**: Mọi kết luận phải dựa trên kết quả tool HOẶC training data đã được xác minh. Không tự suy diễn khi thiếu nguồn.
- **Token Waste Zero**: Tránh đọc toàn bộ repo; chỉ đọc file cần thiết.
- **Resume Protocol**: Khi `checkpoint.json` > critical, thực hiện `node scripts/checkpoint-emergency.mjs`.

---
#rules #hard