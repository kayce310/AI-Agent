# Kỹ năng Định dạng Obsidian (Obsidian Formatting)

## 🎯 Mục tiêu
Chuẩn hóa định dạng markdown để tối ưu Graph Database và liên kết tri thức.

---

## ⚡ Quy tắc BẮT BUỘC

### 1. Wiki-links Obsidian
- ✅ **Dùng**: `[[Tên File]]` để liên kết giữa các trang
- ❌ **CẤM**: `[text](url)` cho liên kết nội bộ

### 2. Tag Standards
- Gắn tag ở **cuối file**: `#category #tag`
- Tag phân cấp: `#parent/child` cho subcategories
- Tối đa 5 tags mỗi file

### 3. Không Emoji trong Tên File
- ✅ `knowledge-management.md`
- ❌ `📚 knowledge-management.md`

---

## 🧬 Graph Weaving - Dệt Mạng Lưới Tri thức

### Quy tắc khi sinh text:

1. **Nhận diện Thực thể Quan trọng**
   - Danh từ riêng (tên người, dự án, công ty)
   - Thuật toán, công thức, khái niệm kỹ thuật
   - Linh kiện phần cứng, module phần mềm
   - Tên file, thư mục trong hệ thống

2. **Bọc trong Wiki-links NGAY LẬP TỨC**
   ```markdown
   // ❌ Text phẳng
   "Thuật toán Euler và PID controller"
   
   // ✅ Graph-linked
   "Thuật toán [[Euler]] và [[PID controller]]"
   ```

3. **Tạo Orphaned Links không do dự**
   - Bọc trong `[[Tên]]` ngay cả khi file chưa tồn tại
   - Agent sau này sẽ tự động điền khuyết

---

## 📋 Checklist Format

- [ ] Wiki-links cho liên kết nội bộ
- [ ] Tags ở cuối file
- [ ] Không emoji trong tên file
- [ ] Thực thể kỹ thuật được link hóa
- [ ] Headings phân cấp rõ ràng (H1 → H2 → H3)

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ Dùng `[text](path)` cho file nội bộ | ✅ Dùng `[[filename]]` |
| ❌ Emoji trong tên file | ✅ Chỉ dùng alphanumeric + hyphens |
| ❌ Quên gắn tags | ✅ Luôn thêm 3-5 tags ở cuối |
| ❌ Để thực thể kỹ thuật ở text phẳng | ✅ Bọc trong `[[wiki-links]]` |
| ❌ Tạo link nhưng không bao giờ điền khuyết | ✅ Để Agent tự động fill orphaned links |

---

## 🔗 Liên kết

- [[knowledge-management]] - Quản lý wiki structure
- [[communication-protocol]] - Giao tiếp không fluff
- [[automation-directives]] - Tự động điền khuyết links

#skill #obsidian #formatting #workflow