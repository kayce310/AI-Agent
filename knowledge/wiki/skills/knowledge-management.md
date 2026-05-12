# Kỹ năng Quản trị Tri thức (Knowledge Management)

## 🎯 Mục tiêu
Quản lý knowledge base hiệu quả,Zero Waste Token, không redundancy.

---

## ⚡ Nguyên tắc Cốt lõi

### 1. SSOT (Single Source of Truth)
- Mỗi loại dữ liệu chỉ tồn tại ở **1 nơi duy nhất**
- Không copy-paste thông tin giữa các file
- Link thay vì duplicate

### 2. Phân cấp Thư mục BẮT BUỘC
```
knowledge/
├── raw/              # BẤT BIẾN - Chỉ ĐỌC, không sửa
├── wiki/             # Của Agent - Tự do ghi chép
│   ├── projects/     # Theo dự án (mỗi project có state.md)
│   ├── troubleshooting/ # Giải pháp lỗi độc lập
│   ├── core/         # Kiến trúc lõi
│   └── skills/       # Kỹ năng modular
└── blueprints/       # Ý tưởng mới (chờ đồng hóa)
```

### 3. Differential Processing
- Chỉ xử lý file CHƯA có trong `processed_log.md`
- Sau khi xử lý → Ghi tên file vào log
- Không bao giờ xử lý lại file cũ (trừ khi có yêu cầu)

---

## 🗺️ Quy trình Truy xuất (Thứ tự BẮT BUỘC)

```
1. Đọc index.md trước
2. Chỉ đọc đúng file liên quan đến vấn đề
3. Chỉ mở code file khi thực sự cần
```

❌ **CẤM TUYỆT ĐỐI**: Đọc toàn bộ codebase khi làm việc với vấn đề cũ

---

## 📋 Checklist Khi Tạo File Mới

- [ ] File có thuộc đúng thư mục không?
- [ ] Đã thêm link vào index.md chưa?
- [ ] Có dùng wiki-links Obsidian không?
- [ ] Có tag ở cuối file không?
- [ ] Có duplicate thông tin từ file khác không?

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ Sửa file trong raw/ | ✅ Chỉ đọc, ghi insight vào wiki/ |
| ❌ Đọc toàn bộ codebase | ✅ Tra index → đọc đúng file cần |
| ❌ Copy-paste thông tin giữa files | ✅ Dùng wiki-links, giữ SSOT |
| ❌ Quên cập nhật index.md | ✅ Luôn update index sau khi tạo file |
| ❌ Xử lý lại file đã có在processed_log | ✅ Chỉ xử lý file mới |

---

## 🔗 Liên kết

- [[obsidian-formatting]] - Định dạng markdown chuẩn
- [[big-data-processing]] - Xử lý file lớn với chunking
- [[evolution-protocol]] - Ghi nhận kiến thức mới

#skill #knowledge #workflow #sop