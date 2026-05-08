# MATLAB `drawnow('nocancel')` Unsupported

## 🚨 Triệu chứng
- Error message: `Error using drawnow - Unknown command option.`
- Khi xảy ra: callback UI MATLAB gọi `drawnow('nocancel')`, ví dụ trong `visualize_3d/cb_play` của [[OVAP-X1 v1.4]].
- Ảnh hưởng: nút Play/Pause của 3D Digital Twin lỗi callback, animation không điều khiển ổn định.

## 🔍 Nguyên nhân Gốc rễ
1. Một số phiên bản MATLAB không hỗ trợ option `'nocancel'` cho `drawnow`.
2. Việc thêm option theo giả định phiên bản mới tạo lỗi tương thích ngược.

## ✅ Giải pháp
Thay lệnh không tương thích:

```matlab
drawnow('nocancel')
```

bằng lệnh tương thích rộng:

```matlab
drawnow
```

## 🛡️ Phòng ngừa
- Không dùng option MATLAB UI chưa xác nhận tương thích với môi trường chạy hiện tại.
- Khi vá UI callback, ưu tiên API MATLAB phổ biến (`drawnow`, `drawnow limitrate`) thay vì option phụ thuộc version.
- Sau khi sửa, quét lại codebase bằng regex: `drawnow\('nocancel'\)`.

## 🔗 Liên kết
- [[../skills/coding-standards]] - Fail-fast, tương thích môi trường
- [[../skills/evolution-protocol]] - Ghi nhận anti-pattern và cập nhật state
- [[_INDEX]] - Troubleshooting Index

#troubleshooting #matlab #ui #drawnow #ovap
