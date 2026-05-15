# Kế Hoạch Ưu Tiên Mới — 2026-05-14

> **Tuân thủ CLINE.md v5.0** | Control Plane Minimal | Zero Waste Token

---

## 🎯 Ưu tiên điều chỉnh

| Mức | Khu vực | Trạng thái |
|-----|---------|-----------|
| 🔴 **CAO** | Phase 3-5: Report Generator + DOCX Builder | ❌ Chưa làm |
| 🔴 **CAO** | Engine optimization (test suite, provider validation, error handling) | ⬜ Pending |
| 🟡 **TRUNG BÌNH** | Token management, health check | ⬜ Pending |
| 🔵 **THẤP** | Bot Discord behavior bugs (#3, #4, #5) | ⬇️ Hạ ưu tiên |
| 🔵 **THẤP** | Document processing (~18 file PDF) | ⬇️ Hạ ưu tiên |

---

## 📋 Phase 3: Report Generator (text) — ƯU TIÊN CAO NHẤT

### 3.1 Style Engine — `src/modules/report/style-engine.ts`
| Task | File | Thời gian |
|------|------|-----------|
| Tạo style-engine.ts với 4 styles: technical, scientific, daily, custom | `src/modules/report/style-engine.ts` | ~30 phút |
| Test format output cho từng style | manual | ~15 phút |

### 3.2 Report Generator — `src/modules/report/generator.ts`
| Task | File | Thời gian |
|------|------|-----------|
| Tạo generator.ts — generate_report tool | `src/modules/report/generator.ts` | ~45 phút |
| Đọc sources từ knowledge/raw-md/ | built-in | — |
| Output text với citations `[Nguồn: file.md]` | built-in | — |
| Thêm tool `generate_report` vào tools.ts | `src/core/tools.ts` | ~15 phút |
| Update prompt builder Rule #4 (báo cáo) | `src/core/prompt-builder.ts` | ~10 phút |
| Update tool-pruner (thêm category report) | `src/core/tool-pruner.ts` | ~5 phút |
| Update llm.ts SYSTEM_PROMPT | `src/core/llm.ts` | ~5 phút |

### 3.3 Template Manager — (tùy chọn, có thể làm sau)
| Task | File | Thời gian |
|------|------|-----------|
| register_template, list_templates | `src/modules/report/template-manager.ts` | ~30 phút |

---

## 📋 Phase 4: DOCX Builder — ƯU TIÊN CAO

### 4.1 DOCX Builder — `src/modules/report/docx-builder.ts`
| Task | Command/File | Thời gian |
|------|-------------|-----------|
| `npm install docx` | terminal | ~2 phút |
| Tạo docx-builder.ts — build_docx_report tool | `src/modules/report/docx-builder.ts` | ~45 phút |
| Thêm tool `build_docx_report` vào tools.ts | `src/core/tools.ts` | ~15 phút |
| Update tool-pruner (category report) | `src/core/tool-pruner.ts` | ~5 phút |

---

## 🛠 ENGINE: Test Suite + Validation — ƯU TIÊN CAO

| Task | File | Thời gian |
|------|------|-----------|
| Provider config validation at boot | `src/core/provider-registry.ts` | ~20 phút |
| Engine test suite chính thức (vitest) | `tests/engine.test.ts` | ~30 phút |
| Error handling: circuit breaker | `src/core/engine.ts` | ~20 phút |

---

## 🟡 TRUNG BÌNH: Token Management + Health Check

| Task | File | Thời gian |
|------|------|-----------|
| Token management optimization | `src/core/engine.ts` | ~20 phút |
| Health check monitor | `src/modules/monitor/` | ~30 phút |

---

## 🔵 THẤP: Bot Behavior + Document Processing

| Task | Ghi chú |
|------|---------|
| Bot hallucinate count (bug #3) | Chờ phiên sau |
| Bot hỏi lại user (bug #4) | Chờ phiên sau |
| Bot báo sai tool crash (bug #5) | Chờ phiên sau |
| Xử lý ~18 file PDF trong blueprints/ | Chờ phiên sau |

---

## 📊 Tổng quan thời gian dự kiến

| Phase | Tasks | Thời gian |
|-------|-------|-----------|
| 🔴 Phase 3: Report Generator | 6 tasks | ~2 giờ |
| 🔴 Phase 4: DOCX Builder | 4 tasks | ~1 giờ |
| 🔴 Engine: Test + Validation | 3 tasks | ~1 giờ |
| 🟡 Token + Health Check | 2 tasks | ~1 giờ |
| 🔵 Bot + Documents | 4 tasks | ⏸️ Tạm dừng |

---

## ✅ CLINE.md Compliance Check

| Rule | Trạng thái |
|------|-----------|
| Đọc AGENTS.md trước khi suy diễn | ✅ Đã đọc đầu phiên |
| Tra index.md tải skill cần dùng | ✅ state-management, coding-standards |
| state-manager đọc/ghi state | ✅ state.json updated |
| Chuyển READY | ✅ lifecycle: READY |
| Zero Waste Token | ✅ Chỉ đọc file cần thiết |
| Để lại tài sản mỗi phiên | ✅ Plan này, changelog, code |
| Mỗi phiên cập nhật changelog | ✅ Done |
| Blueprint scan/mark | ✅ processed-files.json cleaned |

---

**Kế hoạch được tạo:** 2026-05-14 13:36
**Phiên bản:** v1.0