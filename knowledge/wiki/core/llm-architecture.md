# 🏗️ Kiến trúc Lõi LLM Universal

---

## 📋 Tổng quan
Lớp lõi LLM được thiết kế để tương thích 100% với MỌI mô hình AI hiện có thông qua giao diện chuẩn OpenAI.

## 🔄 Luồng xử lý dữ liệu
```
Người dùng Discord -> [[discord-bridge]] -> LLMCore -> OpenAI SDK -> Proxy -> AI Model
                                                                 ↓
                                           Claude / Gemini / DeepSeek / Llama / Local AI
```

## ✅ Đặc tính chính
| Đặc tính | Trạng thái |
|----------|------------|
| Tương thích mọi mô hình | ✅ Hoàn thành |
| Configurable BaseURL | ✅ Hoàn thành |
| Áo giáp chống sập | ✅ Hoàn thành |
| Error handling riêng biệt | ✅ Hoàn thành |
| Fallback an toàn | ✅ Hoàn thành |
| Timeout & Retry | ✅ Hoàn thành |

## ⚙️ Các loại lỗi được xử lý
1.  ⏱️ Timeout Error
2.  🚦 Rate Limit (429)
3.  🔌 Server Error (5xx)
4.  ❌ Unknown Error

## 🔌 Hỗ trợ Proxy
- ✅ LiteLLM
- ✅ OpenRouter
- ✅ Ollama
- ✅ LocalAI
- ✅ Bất kỳ Proxy nào tương thích OpenAI API

---
#core #llm #architecture #universal