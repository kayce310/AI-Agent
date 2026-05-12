# Picoclaw Storage — Kiến trúc Lưu trữ & Truy xuất

## 1. Bảng SQLite chính

### conversations
- `conversation_id` PK autoincrement, `session_key` UNIQUE
- Dùng session key để định danh conversation (không lộn xộn nhiều ID)

### messages
- `message_id` PK, `conversation_id` FK, `role`, `content`, `reasoning_content`, `token_count`, `created_at`
- **Tối ưu**: Lưu sẵn `token_count` để không cần tính lại khi assemble

### message_parts
- `part_id` PK, `message_id` FK, `type` (text/tool_use/tool_result/media), `text`, `name`, `arguments`, `tool_call_id`, `media_uri`, `mime_type`, `ordinal`
- **Module hóa**: Không nhồi nhét tool calls vào content string, tách riêng parts để dễ query/filter

### summaries
- `summary_id` TEXT PK (hash từ content + timestamp), `conversation_id` FK
- `kind` (leaf/condensed), `depth`, `content`, `token_count`
- Metadata: `earliest_at`, `latest_at`, `descendant_count`, `descendant_token_count`, `source_message_token_count`
- **Key insight**: Depth và descendant tracking cho phép biết summary đã qua bao nhiêu lần nén

### summary_parents
- `summary_id` + `parent_summary_id` → DAG (đồ thị có hướng)
- Cho phép truy xuất subtree bằng recursive CTE

### summary_messages
- `summary_id` + `message_id` + `ordinal` → nối leaf summary với messages gốc
- **Expand tool**: Khi LLM cần xem message gốc, dùng bảng này để truy xuất

### context_items — Bảng quan trọng nhất
- `conversation_id` + `ordinal` PK, `item_type` (message/summary), `summary_id`/`message_id`, `token_count`
- **Chỉ lưu pointer (ID) + token_count**, không lưu nội dung
- **Ordinal dạng sparse**: Dùng `OrdinalStep` (1000) để chèn summary vào midpoint giữa range bị xóa
- Khi hết gap → resequence toàn bộ (đánh số lại với negative temp ordinals)

## 2. Cơ chế truy xuất tối ưu (Assemble)

### Luồng:
1. `GetContextItems()` → SELECT context_items WHERE conversation_id ORDER BY ordinal → chỉ lấy pointer (message_id / summary_id) + token_count
2. `resolveItem()` → Lazy load message/summary full content từ bảng tương ứng
3. Chia evictable prefix / protected fresh tail
4. Áp budget → walk newest→oldest, keep tới khi đầy budget

### Tối ưu bộ nhớ:
- **Chỉ load metadata trước**: GetContextItems không join messages/summaries, chỉ lấy ordinal + type + ID + token_count
- **Lazy resolution**: Chỉ resolve full content khi thực sự cần (trong Assembler)
- **Token count pre-calculated**: messages.token_count, summaries.token_count được tính sẵn khi insert

## 3. FTS5 Full-Text Search

### 2 virtual tables:
- `summaries_fts` (summary_id, content) — tokenize="trigram" (hỗ trợ CJK)
- `messages_fts` (message_id, content) — tokenize="trigram"

### Trigger đồng bộ:
- AFTER INSERT/UPDATE/DELETE trên summaries/messages → tự động cập nhật FTS
- Không cần code xử lý thủ công, tránh sai lệch dữ liệu

### Search modes:
- **FTS5**: Dùng MATCH + bm25 ranking, ưu tiên nếu có kết quả
- **LIKE fallback**: LIKE %% query khi FTS5 không trả về kết quả
- Filter: conversation_id, role, time range

## 4. Context Item Management

### Append (ghi mới):
- `GetMaxOrdinal()` → tìm ordinal cao nhất → `max + OrdinalStep` cho item mới
- Resolve token_count tự động nếu không được cung cấp

### Replace (khi compact):
- `ReplaceContextRangeWithSummary`: Xóa range ordinal, chèn summary tại midpoint
- `ReplaceContextItemsWithSummary`: Xóa các items theo summary_id list (dùng khi không contiguous)
- **Midpoint strategy**: `(startOrd + endOrd) / 2` — giảm thiểu resequence
- **Resequence fallback**: Khi gap bị exhausted → move toàn bộ temp negative → insert summary → renumber

### Xoá batch:
- `DeleteMessagesAfterID`: Atomic transaction xoá messages + cascade context_items, message_parts, summary_messages
- `ClearConversation`: Xoá toàn bộ conversation + các bảng liên quan

## 5. Transaction & Consistency

- Hầu hết operations dùng transaction (BeginTx → defer Rollback → commit)
- `isUniqueViolation` xử lý race condition khi tạo conversation
- Cascade delete được xử lý thủ công (SQLite cascade triggers không dùng), đảm bảo thứ tự child→parent

## 6. Luồng ghi hội thoại điển hình
```
Receive message
  → AddMessage (INSERT messages + token_count)
  → AppendContextMessage (INSERT context_items + resolve token_count)
  → (Nếu cần) AddMessageWithParts: transaction gồm INSERT messages + INSERT message_parts
```

## 7. Tối ưu cho memory/performance
| Kỹ thuật | Lợi ích |
|---|---|
| Pre-calculated token_count | Không scan content khi assemble |
| context_items chỉ lưu pointer | Có thể scan 100k items mà không nặng |
| Ordinal sparse + midpoint insert | Giảm resequence (chỉ khi gap exhausted) |
| Lazy resolve trong Assembler | Chỉ load message/summary khi đã quyết định giữ |
| FTS5 trigger sync | Đảm bảo search index luôn đồng bộ |