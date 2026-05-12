# Picoclaw Compaction — Kiến trúc Thuật toán

## 1. Trigger (NeedsCompaction)
- So sánh `context_tokens >= ContextThreshold × contextWindow`
- Ngưỡng = phần trăm cửa sổ context (ví dụ 70%)

## 2. Two-Phase Compaction

### Phase 1 — Leaf Compaction (sync, mỗi turn)
- **Mục tiêu**: Nén chunk message liền kề lâu đời nhất → leaf summary
- **Điều kiện chạy**: `msgCount >= LeafMinFanout` hoặc `msgTokens >= LeafChunkTokens`
- **Fresh tail bảo vệ**: `FreshTailCount` items cuối không bị động đến (trừ khi force)
- **Cơ chế chọn chunk**: Duyệt từ đầu, gom message tới khi đạt `LeafChunkTokens` hoặc gặp non-message

### Phase 2 — Condensed Compaction (async, goroutine)
- **Mục tiêu**: Gộp nhiều summaries cùng depth → condensed summary cao hơn
- **Chọn candidate**: Ordinal-aware (ưu tiên) → fallback depth-grouping
- **Dedup**: `sync.Map` để tránh chạy nhiều goroutine cho cùng conversation
- **Vòng lặp**: Chạy tới khi hết candidate hoặc không giảm token

## 3. Token Budget (Ngân sách Token)
- **Default**: `budget = tokensBefore × ContextThreshold`
- **Override**: `CompactInput.Budget` (do caller ấn định)
- **Assembler tính toán**: `remainingBudget = input.Budget - freshTailTokens`
  - Nếu fresh tail > budget → vẫn giữ, log warning
  - Evictable fit hết → keep all
  - Không fit → walk từ newest→oldest, keep tới khi đầy budget

## 4. LLM Summary Generation (3-level Escalation)

### Leaf Summary
- **Level 1**: Prompt normal, target = min(LeafTargetTokens, inputTokens × 0.35), temp=0.3 (retry temp=0)
- **Level 2**: Prompt aggressive, target = min(640, inputTokens × 0.20)
- **Level 3**: Deterministic truncation — cắt đầu content @ 2048 bytes + footer

### Condensed Summary
- **Level 1**: Prompt normal, target tương tự leaf, temp=0.3/0
- **Level 2**: Prompt aggressive, target 640 hoặc 20% input
- **Level 3**: Truncation ghép nội dung @ 2048 bytes

### Yêu cầu output chung
- Plain text, không markdown/formatting
- Track file operations (created/modified/deleted)
- Kết thúc với `"Expand for details about: <list>"`

## 5. Assembly (Đọc context cho LLM)
- Chia context làm 2 phần: **evictable prefix** + **protected fresh tail**
- Fresh tail luôn được giữ (bất chấp budget)
- Kết quả trả về dạng XML `<summary>` có: id, kind, depth, descendant_count, parent refs
- **Depth-aware system prompt**:
  - Nếu `maxDepth >= 2` hoặc `condensedCount >= 2`: cảnh báo heavy compression
  - Ngược lại: thông báo nhẹ "some messages summarized"

## 6. Constants chính (suy luận từ code)
| Constant | Giá trị (ước lượng từ code) |
|---|---|
| `ContextThreshold` | ~0.7 (70% context window) |
| `FreshTailCount` | ~10-20 items |
| `LeafChunkTokens` | ~4000 tokens |
| `LeafTargetTokens` | ~1000 tokens |
| `CondensedTargetTokens` | ~2000 tokens |
| `LeafMinFanout` | 2-3 messages |
| `CondensedMinFanout` | 2-3 summaries |
| `MaxCompactIterations` | ~20 |

## 7. Luồng xử lý tổng quan
```
Receive message
  → NeedsCompaction? (ngưỡng %)
    → Leaf compaction (sync, mỗi turn)
    → Nếu vẫn over budget:
      → Condensed compaction (async goroutine)
        → Loop tới khi under budget hoặc stalled
  → Assemble cho inference:
    → Tách evictable / fresh tail
    → Duyệt budget → keep/trim
    → Build XML + depth-aware system prompt