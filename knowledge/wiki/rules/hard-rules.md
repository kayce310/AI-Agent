# Hard Rules

- **Fetch URL**: Khi có thông tin thực tế, luôn gọi `fetch_url` trước khi trả lời. Không dùng training data. Nếu lỗi, trả "không có thông tin".
- **Anti-Hallucination**: Mọi kết luận phải dựa trên kết quả tool. Không tự suy diễn.
- **Training-Data Prohibition**: Không sử dụng dữ liệu training. Chỉ dùng dữ liệu thu thập từ tool.
- **Token Waste Zero**: Tránh đọc toàn bộ repo; chỉ đọc file cần thiết.
- **Resume Protocol**: Khi `checkpoint.json` > critical, thực hiện `node scripts/checkpoint-emergency.mjs`.

---
#rules #hard