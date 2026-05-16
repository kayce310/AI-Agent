# Fix: DeepSeek reasoning_content Error

**Ngày**: 2026-05-16  
**Nguyên nhân**: Request thiếu trường `reasoning_content` khi dùng thinking mode  
**Trạng thái**: ✅ Fixed

---

## 🔍 Triệu chứng

```json
[ERROR] [400]: {
  "error": {
    "message": "Error from provider (DeepSeek): The `reasoning_content` in the thinking mode must be passed back to the API.",
    "type": "invalid_request_error"
  }
}
```

---

## 🛠️ Hướng dẫn fix

### Bước 1: Xác định request có bật thinking mode không

```typescript
// src/utils/deepseek-utils.ts

interface DeepSeekRequest {
  model: string;
  messages: Message[];
  reasoning_content?: string;  // ← THIẾU
  // các trường khác...
}

function hasThinkingMode(request: DeepSeekRequest): boolean {
  // Cách 1: Check model name chứa "reasoning" hoặc "think"
  if (request.model?.includes('reasoning') || 
      request.model?.includes('think')) {
    return true;
  }
  
  // Cách 2: Check request có custom header
  const hasHeader = request.headers?.['x-deepseek-thinking'] === 'true';
  
  return hasHeader || false;
}
```

### Bước 2: Thêm reasoning_content vào request

```typescript
// src/providers/deepseek.ts

async function callDeepSeek(request: DeepSeekRequest) {
  // Nếu là thinking mode → phải có reasoning_content
  if (hasThinkingMode(request)) {
    // Lấy từ conversation history
    const lastAssistantMsg = request.messages
      .filter(m => m.role === 'assistant')
      .pop();
    
    if (lastAssistantMsg?.reasoning_content) {
      // Gán vào request gốc để pass back
      request.reasoning_content = lastAssistantMsg.reasoning_content;
    } else if (!request.reasoning_content) {
      // Nếu không có → return early hoặc throw error rõ ràng
      throw new Error(
        'DeepSeek thinking mode requires reasoning_content from previous response'
      );
    }
  }
  
  return await opencodeClient.chat.completions.create(request);
}
```

### Bước 3: Parse response để extract reasoning_content

```typescript
// src/utils/deepseek-utils.ts

interface DeepSeekResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      reasoning_content?: string;  // ← Có thể có
    };
  }>;
}

function extractReasoningContent(response: DeepSeekResponse): string | undefined {
  const message = response.choices?.[0]?.message;
  return message?.reasoning_content;
}
```

### Bước 4: Lưu vào conversation context

```typescript
// src/context/conversation-manager.ts

function saveAssistantMessage(
  messages: Message[], 
  response: DeepSeekResponse
) {
  const choice = response.choices[0];
  const newMessage: Message = {
    role: 'assistant',
    content: choice.message.content,
  };
  
  // Quan trọng: Lưu reasoning_content nếu có
  if (choice.message.reasoning_content) {
    (newMessage as any).reasoning_content = 
      choice.message.reasoning_content;
  }
  
  messages.push(newMessage);
}
```

---

## ✅ Checklist

- [ ] Thêm trường `reasoning_content?: string` vào DeepSeekRequest interface
- [ ] Check thinking mode trước khi gọi API
- [ ] Pass back reasoning_content từ messages trước đó
- [ ] Extract reasoning_content từ response
- [ ] Lưu reasoning_content vào conversation context
- [ ] Test với model `deepseek-v4-flash-free`

---

## 📁 Files cần sửa

| File | Thay đổi |
|------|----------|
| `src/types/deepseek.ts` | Thêm interface |
| `src/providers/deepseek.ts` | Logic pass back |
| `src/utils/response-parser.ts` | Extract reasoning_content |
| `src/context/manager.ts` | Lưu vào messages |

---

## 🔗 Related

- [[troubleshooting/9router-combo-fallback]] - Fix double routing
- [[troubleshooting/_INDEX]] - All troubleshooting

---
#troubleshooting #deepseek #9router #fix