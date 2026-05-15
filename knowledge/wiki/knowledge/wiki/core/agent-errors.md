# Agent Error Log & Learning Tracker

## 📝 Lỗi hiện tại đã ghi nhận

### Error #1: Hallucinate từ Training Data
- **Thời gian**: 2026-05-14 10:39
- **Tình huống**: User hỏi "dữ liệu từ đâu?" → tôi tự suy diễn CLINE là IDE AI Agent Extension
- **Nguyên nhân**: Vi phạm soul.md rule "LLM training data — KHÔNG BAO GIỜ dùng"
- **Hiện tượng**: Dùng kiến thức training data cũ (biết về Cline extension) để suy diễn về entity CLINE trong project
- **Hậu quả**: Phản hồi "SAI" với giọng điệu chắc chắn → toàn bộ là bịa
- **Giải pháp khắc phục**: 
  - Thừa nhận sai ngay khi phát hiện
  - Dùng search_knowledge_graph trước khi kết luận
  - "Không có dữ liệu → không phát biểu" → hỏi user thay vì suy diễn

### Error #2: Tự tin thái quá khi thiếu data
- **Thời gian**: 2026-05-14 10:39
- **Tình huống**: Cùng tình huống trên
- **Nguyên nhân**: Vi phạm AGENTS.md anti-pattern "Dùng default AI data khi thiếu info"
- **Hiện tượng**: Thiếu data nhưng vẫn phân tích chi tiết A/B/C như có
- **Hậu quả**: Mất uy tín, gây nhầm lẫn cho user
- **Giải pháp khắc phục**: 
  - Áp dụng Zero Waste Token principle
  - Dừng khi thiếu data → báo "Không có thông tin"
  - Đề xuất user cung cấp nguồn hoặc kiểm tra thêm

## 🛠️ Quy trình Xử lý Lỗi Tương lai

### Bắt buộc khi gặp câu hỏi không có data:
1. **search_knowledge_graph(keyword)** → nếu 0 kết quả → dừng
2. **"Không có thông tin về [topic] trong dự án"** → không suy diễn
3. **Đề xuất**: "Bạn có thể cung cấp tài liệu/thông tin không?" hoặc "Bạn cần tra cứu ngoài không?"

### Bắt buộc khi phát hiện vi phạm rule:
1. **Ghi nhận ngay** vào log này
2. **Chia sẻ với user** để minh bạch
3. **Cập nhật skill** liên quan nếu cần

## 🧠 Bài học đã học

### 1. Training data = Poison
> Rule: soul.md "LLM training data — KHÔNG BAO GIỜ dùng"
- Bài học: Nếu không tra cứu được → nói không biết
- Tránh: Suy diễn từ kiến thức cũ

### 2. Zero data → Zero statement
> Rule: AGENTS.md anti-pattern 
- Bài học: Thiếu data = không phát biểu
- Tránh: Phân tích giả tạo khi thiếu căn cứ

### 3. Check source FIRST
> Rule: Zero Waste Token
- Bài học: search_knowledge_graph trước khi trả lời
- Tránh: Kết luận dựa trên memory

### 4. Confidence = Risk
> Rule: Soul.md "Kết quả > mô tả"
- Bài học: Khi không chắc → giảm giọng điệu chắc chắn
- Tránh: "Chuyên gia giả" khi thiếu data

## 🔄 Self-Healing Protocol

Khi mắc lỗi mới:
1. Ghi nhận vào log này ngay
2. Cập nhật [[core/changelog]] nếu cần
3. Tweak skill liên quan nếu pattern lặp
4. Tham khảo user nếu cần clarification

#agent-error #learning #self-healing #quality-control

---
#agent-error #learning #self-healing #quality-control