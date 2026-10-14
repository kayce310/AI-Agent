# ADR-005: Unified Policy Contract — Role Authorization, Risk Classification & Security Invariants

> **Status:** Accepted / Policy Contract  
> **Date:** 2026-10-14  
> **Layer:** Core Security (`src/core/security/`, `src/core/gateway/`, `src/core/memory/`)  
> **Related ADRs:** `ADR-000-state-principles.md`, `ADR-003-consequence-memory.md`

---

## 1. Context & Motivation

Kiến trúc bảo mật và Human-in-the-Loop (HITL) trước đây của Coral gặp 3 vấn đề căn bản:
1. **Lẫn lộn giữa Lỗi vận hành và Rủi ro bảo mật:** `ConsequenceReadPath` tự động nâng quyền các thao tác thông thường (`read_file`, `update_plan`) lên `require_hitl` chỉ vì công cụ đó có số lần thất bại lịch sử trong 7 ngày $\ge 3$. Điều này làm tê liệt luồng hội thoại và phản hồi của Agent đối với các câu hỏi tra cứu thông thường.
2. **Đồng nhất hóa sai lệch giữa Admin và Approver:** Mọi quyền quản trị bị gắn cứng với một tài khoản duy nhất, không tách biệt năng lực thực thi (`admin`) với năng lực phê duyệt rủi ro (`hitl_approver`).
3. **Phân loại rủi ro theo chuỗi ký tự thô (Naive String Match):** `isDestructiveAction` chỉ kiểm tra chuỗi tĩnh (`rm `, `delete`), không phân tích ngữ cảnh lệnh thực tế, phạm vi tác động (blast radius) hay tính khả đảo (reversibility).

Tài liệu này chuẩn hóa **Unified Policy Contract** gồm 3 tầng kiểm định độc lập, ma trận phân quyền 4 mức rủi ro (R0–R3), và nguyên tắc ngăn chặn Consequence Memory xâm phạm chính sách an ninh.

---

## 2. Kiến Trúc 3 Tầng Kiểm Định Độc Lập (3-Layer Pipeline)

Mọi `ToolCall` từ Agent bắt buộc phải đi qua tuần tự 3 tầng kiểm soát trước khi được thực thi:

```
                      Tool Call (name, args, context)
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TẦNG 1: IDENTITY & ROLE AUTHORIZATION                                   │
│ - Xác thực danh tính người dùng (userId, source channel)                │
│ - Kiểm tra Role (user | admin) đối chiếu với Tool Capability Allowed     │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ PASS (Role được phép dùng Tool)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TẦNG 2: SECURITY INVARIANTS (Bất biến bất khả xâm phạm)                 │
│ - Path Traversal (truy cập ngoài WORKSPACE_ROOT)                       │
│ - Secret Exfiltration (đọc file token, private key, providers.json)     │
│ - Identity Spoofing (giả mạo role trong metadata/args)                  │
│ ──► VI PHẠM: BLOCK TUYỆT ĐỐI (Admin bấm Approve cũng KHÔNG được vượt)   │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ PASS (Không vi phạm bất biến)
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ TẦNG 3: RISK CLASSIFICATION & HITL DECISION                             │
│ - Phân tích ngữ cảnh thực tế (Action, Target Scope, Blast Radius)       │
│ - Xếp loại mức rủi ro: R0, R1, R2, R3                                   │
│   ├── R0 / R1 ──► Cho phép thực thi ngay (Allow)                        │
│   ├── R2 ───────► Kích hoạt HITL (Yêu cầu Approver ký duyệt)            │
│   │                     │                                               │
│   │                     ├── Approved ──► Re-Validate Invariants ──► Run │
│   │                     └── Rejected/Expired ───────────────────► Abort │
│   └── R3 ───────► BLOCK (Rủi ro vượt ngưỡng cho phép)                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phân Loại Rủi Ro (4-Tier Risk Taxonomy)

| Cấp độ | Định nghĩa | Công cụ / Thao tác tiêu biểu | Chính sách xử lý |
| :---: | :--- | :--- | :--- |
| **R0** | **Read-only / Orchestration**<br>Thao tác chỉ đọc, tra cứu thông tin, lập kế hoạch hoặc quản lý session. Không làm thay đổi trạng thái hệ thống. | `read_file`, `list_directory`, `search_files`, `grep_search`, `read_symbol`, `view_structure`, `web_search`, `fetch_url`, `update_plan`, `manage_plan`, `memory_search`, `todo_read`. | **ALLOW mặc định** theo role.<br>**Tuyệt đối KHÔNG kích hoạt HITL.** |
| **R1** | **Reversible Mutations**<br>Thay đổi trong phạm vi hẹp bên trong workspace, có thể hoàn tác dễ dàng hoặc kiểm soát được bằng git. | Tạo mới / sửa file trong workspace, chạy `npm test`, `npm run build`, chạy script thử nghiệm trong sandbox. | **ALLOW** cho User & Admin trong workspace.<br>Không HITL mặc định. |
| **R2** | **Significant / Hard-to-reverse**<br>Tác động đáng kể, khó hoàn tác, thay đổi cấu hình môi trường hoặc có khả năng ảnh hưởng dịch vụ chung. | Xóa file/thư mục, ghi đè hàng loạt file, kill process dùng chung, cài đặt package hệ thống, `git push --force`, trigger deploy, sửa `package.json` / `.env`. | **Bắt buộc HITL** khi policy yêu cầu.<br>Hiển thị rõ đối tượng, phạm vi và hậu quả trước khi xác nhận. |
| **R3** | **Critical Security Invariants Violation**<br>Hành vi bị cấm tuyệt đối, đe dọa an toàn máy chủ hoặc ranh giới bảo mật cốt lõi. | Path traversal ra ngoài workspace, đọc secret/credentials, giả mạo danh tính, xóa database diện rộng, drop table, xóa backup. | **BLOCK TUYỆT ĐỐI.**<br>Không có nút bấm hay quyền Admin nào có thể phê duyệt. |

---

## 4. Ma Trận Phân Quyền (Role × Action × Target Scope)

```
┌───────────────────────────────────────┬─────────────┬─────────────┬───────────────────────────┐
│ Nhóm Thao Tác / Đối Tượng             │ User Thường │ Admin       │ HITL Requirement          │
├───────────────────────────────────────┼─────────────┼─────────────┼───────────────────────────┤
│ Đọc file trong workspace, tìm kiếm    │ Cho phép    │ Cho phép    │ KHÔNG                     │
│ Lập kế hoạch, update_plan, memory     │ Cho phép    │ Cho phép    │ KHÔNG                     │
│ Tạo / sửa file trong workspace        │ Cho phép    │ Cho phép    │ KHÔNG (R1)                │
│ Chạy lệnh read/test trong workspace   │ Allowlist   │ Mở rộng     │ KHÔNG                     │
│ Cài đặt package / sửa dependency      │ Chặn        │ Cho phép    │ CÓ (R2)                   │
│ Xóa file / thư mục trong workspace    │ Chặn        │ Cho phép    │ CÓ (R2)                   │
│ Kill process do phiên mình tạo        │ Cho phép    │ Cho phép    │ KHÔNG                     │
│ Kill process hệ thống / dùng chung    │ Chặn        │ Cho phép    │ CÓ (R2)                   │
│ Git commit nội bộ                     │ Cho phép    │ Cho phép    │ KHÔNG (R1)                │
│ Git push / Deploy ra môi trường ngoài │ Chặn        │ Cho phép    │ CÓ (R2)                   │
│ Đọc secret, token, private config     │ CHẶN        │ CHẶN        │ Không áp dụng (R3)        │
│ Path traversal ra ngoài workspace     │ CẤM         │ CẤM         │ BLOCK TUYỆT ĐỐI (R3)      │
│ Xóa database, xóa backup diện rộng   │ CẤM         │ CẤM         │ BLOCK TUYỆT ĐỐI (R3)      │
└───────────────────────────────────────┴─────────────┴─────────────┴───────────────────────────┘
```

---

## 5. Tách Rời Admin Role và HITL Approver Capability

Nhằm đảm bảo kiến trúc mở rộng và nguyên tắc Four-Eyes (nguyên tắc kiểm soát chéo):
- **Role `admin`:** Đại diện cho quyền hạn thực thi các công cụ quản trị (manage users, manage services, execute privileged tasks).
- **Capability `hitl_approver`:** Đại diện cho quyền ký số / phê duyệt yêu cầu nhạy cảm từ hàng đợi HITL.
- **Quy tắc phân ly (Separation of Duty):**
  - Mặc định khởi tạo cá nhân: Một người có thể nắm cả 2 quyền.
  - Ràng buộc an toàn: Với các thao tác rủi ro cao (R2 blast radius lớn), approver không được tự duyệt yêu cầu do chính mình khởi tạo nếu hệ thống có $\ge 2$ admin.

---

## 6. Đánh Giá Lệnh Shell Theo Ngữ Nghĩa (`execute_command`)

Không đánh giá lệnh shell thuần túy qua so khớp từ khóa cố định (`rm`, `kill`, `sudo`):
1. **Phân tích AST & Tokenizer:** Tách lệnh thành:
   - Binary / Utility thực thi (`git`, `npm`, `rm`, `cat`, `node`).
   - Cờ lệnh (`-f`, `-r`, `--force`).
   - Đường dẫn đích (Target paths).
2. **Kiểm tra Shell Chaining & Piping:** Mọi chuỗi chứa `|`, `&&`, `;`, backtick hoặc `$()` phải được phân rã thành từng sub-command để đánh giá độc lập.
3. **Quy tắc Fail-Closed:** Nếu bộ phân tích không xác định được đích tác động hoặc không thể mô hình hóa phạm vi ảnh hưởng (ví dụ: lệnh obfuscated, eval động) $\rightarrow$ **Coi là rủi ro R2 (yêu cầu HITL) hoặc R3 (Block)**, không bao giờ tự động cho qua.

---

## 7. Giới Hạn Của Consequence Memory (Decoupling Policy)

`ConsequenceStore` và `ConsequenceReadPath` được giới hạn nghiêm ngặt theo các nguyên tắc sau:
1. **Không Tự Động Nâng Cấp Quyền (No Privilege Escalation):**
   - Consequence Memory **chỉ là bộ nhớ quan sát lịch sử lỗi/thành công**, không phải cơ quan ban hành chính sách an ninh (Security Policy Authority).
2. **Quy Tắc Miễn Nhiễm Với Safe Tools (Safe Tools Immunity):**
   - Các công cụ thuộc nhóm **R0** (`read_file`, `search_files`, `update_plan`, v.v.) **miễn nhiễm tuyệt đối với trạng thái `require_hitl` do số đếm lỗi**.
   - Kể cả khi một công cụ đọc fail 100 lần (do file không tồn tại), Consequence Memory chỉ được phép sinh ra hint:
     `[Consequence] Suggest: File không tồn tại hoặc lỗi lặp lại. Đề xuất đổi hướng giải quyết.`
   - Tuyệt đối không được chuyển `action` sang `require_hitl`.
3. **Thanh Lọc Lỗi Khi Hoạt Động Bình Thường (Self-Healing / Decay):**
   - Các bản ghi `rejected_by_gate` sinh ra do huỷ timeout không được tích luỹ vô tận để biến thành `maxPolicy = require_hitl` vĩnh viễn trong tương lai.

---

## 8. Hợp Đồng Re-Validation Sau Phê Duyệt (Post-Approval Invariant)

Khi một yêu cầu HITL được người dùng bấm `Approve`:
1. Quyết định duyệt chỉ giải phóng Token cho **chính xác `toolCallId` và bộ tham số `argsDigest` đã được phê duyệt**.
2. Trước khi gọi hàm thực thi công cụ, Runtime Guard phải chạy lại **Tầng 2 (Security Invariants)**:
   - Kiểm tra lại xem đường dẫn có bị trỏ lệch ra ngoài workspace hay không.
   - Nếu phát hiện tham số bị thay đổi giữa lúc duyệt và lúc chạy $\rightarrow$ **Hủy bỏ thực thi ngay lập tức (Tamper Protection)**.

---

## 9. Kế Hoạch Triển Khai (Action Items)

- [ ] **Phase 1 (Guard Refactor):** Sửa `resolveDecision` trong `consequence-read-path.ts` chặn đứng việc gán `require_hitl` cho toàn bộ danh mục R0 bất kể `maxPolicy` lịch sử.
- [ ] **Phase 2 (Command Classifier):** Tích hợp bộ parser lệnh shell đơn giản xác định blast radius cho `execute_command`.
- [ ] **Phase 3 (Unified Guard Hook):** Tổ chức lại `PrivilegeGuard` thành 3 tầng: `Role Guard` $\rightarrow$ `Invariant Guard` $\rightarrow$ `Risk Policy (HITL) Guard`.
- [ ] **Phase 4 (Test Matrix):** Xây dựng bộ test toàn diện theo ma trận `Role × Action × Target Scope × Risk Level`.
