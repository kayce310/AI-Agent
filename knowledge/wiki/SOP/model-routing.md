# SOP: Model Routing & Multi-Tier Cascade (V5.1)

## 1. Tổng quan
Hệ thống Model Routing của Kato được thiết kế để đảm bảo tính ổn định (Reliability) và tối ưu chi phí (Cost Optimization) thông qua cơ chế **Multi-Tier Cascade**.

## 2. Cơ chế Cascade
Khi một request được gửi đến `Engine`, hệ thống sẽ thực hiện các bước sau:
1. **Lấy danh sách Model**: Truy vấn tất cả model từ `config/providers.json`.
2. **Lọc Cooldown**: Loại bỏ các model đang trong trạng thái "đóng băng" (do lỗi 429 hoặc lỗi hệ thống trước đó).
3. **Sắp xếp theo Tier**: Ưu tiên các model có Tier thấp (Tier 1 > Tier 2 > Tier 3).
4. **Thử nghiệm tuần tự**:
   - Thử model đầu tiên.
   - Nếu thành công: Trả kết quả về Adapter.
   - Nếu thất bại (Timeout, Rate Limit, API Error):
     - Đánh dấu model vào danh sách Cooldown (mặc định 6 giờ).
     - Phát event `cascade` để UI cập nhật trạng thái.
     - Chuyển sang model tiếp theo trong danh sách.

## 3. Cấu hình Tier (config/providers.json)
- **Tier 1 (Premium/Stable)**: Các model mạnh nhất, ít lỗi, dùng cho các tác vụ quan trọng (ví dụ: `claude-3-5-sonnet`).
- **Tier 2 (Standard)**: Các model cân bằng giữa tốc độ và chất lượng (ví dụ: `gpt-4o-mini`).
- **Tier 3 (Free/Fallback)**: Các model miễn phí hoặc giá rẻ, dùng làm phương án dự phòng cuối cùng (ví dụ: `gemini-1.5-flash:free`).

```json
{
  "providers": [
    {
      "name": "9router",
      "tier": 1,
      "models": [
        {"id": "anthropic/claude-3-5-sonnet", "tier": 1, "label": "Claude 3.5 Sonnet"},
        {"id": "google/gemini-1.5-flash:free", "tier": 3, "label": "Gemini Flash Free"}
      ]
    }
  ]
}
```

## 4. Quản lý Cooldown
- Trạng thái Cooldown được lưu trữ trong `knowledge/workspace/state.json`.
- Khi một model bị lỗi 429 (Rate Limit), nó sẽ bị tạm dừng sử dụng trong 6 giờ để tránh spam API và dành quota cho các phiên làm việc sau.

## 5. Giám sát (Monitoring)
- Các Adapter (Discord, CLI) có thể lắng nghe event `cascade` từ Engine để hiển thị cho người dùng biết hệ thống đang thử model nào.
- Log Terminal sẽ hiển thị: `📤 [CASCADE] Attempt X: Using [ModelID] (Tier Y)`.
