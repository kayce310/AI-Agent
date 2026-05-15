# Kế Hoạch Phát Triển: Hệ Thống Xử Lý Tài Liệu & Sinh Báo Cáo Thông Minh

> **Trạng thái**: Phase 1 — ✅ 100% HOÀN THÀNH
> **Phase 2**: ✅ 100% HOÀN THÀNH (2026-05-13)
> **Phase 3**: Chưa bắt đầu
> **Tác giả**: Kato Agent
> **Ngày**: 2026-05-13 (updated 15:22)

---

## 🎯 Mục tiêu tổng quan

Xây dựng hệ thống cho phép:
1. **Đọc tài liệu**: PDF (đã fix), DOCX — trích xuất nội dung + công thức
2. **Lưu trữ local**: PDF/DOCX → `.md` archive (đối phó file lớn, không waste token)
3. **Wiki hóa**: trích ý chính → `knowledge/wiki/`, giữ raw đầy đủ → `knowledge/raw-md/`
4. **Sinh báo cáo**: từ sườn + tài liệu + style → text ready-to-copy hoặc file .docx
5. **Đa nền tảng**: tools hoạt động trên Discord, CLI, Telegram (shared tools qua core engine)

---

## 🏗 Kiến trúc module mới

```
src/
├── modules/
│   ├── document/                  # MODULE: Xử lý tài liệu
│   │   ├── parser.ts              # Parser factory (PDF, DOCX)
│   │   ├── pdf-parser.ts          # PDF → text/markdown
│   │   ├── docx-parser.ts         # DOCX → text/markdown
│   │   ├── converter.ts           # Local batch converter script
│   │   └── formula-extractor.ts   # Trích xuất công thức (LaTeX)
│   │
│   ├── report/                    # MODULE: Sinh báo cáo
│   │   ├── generator.ts           # Sinh báo cáo từ sườn + data
│   │   ├── docx-builder.ts        # Tạo file .docx từ template
│   │   ├── template-manager.ts    # Quản lý mẫu báo cáo
│   │   └── style-engine.ts        # Style engine theo loại báo cáo
│   │
│   └── knowledge/
│       └── md-archiver.ts         # Chuyển tài liệu → .md archive
│
└── core/
    └── tools.ts                   # Thêm tools mới (shared, platform-agnostic)
```

---

## 📋 Phase 1: Document Parser Engine (✅ HOÀN THÀNH)

### 1.1 PDF Parser — nâng cấp từ bản đã fix

**Đã hoàn thành:**
- ✅ `read_pdf` tool — đọc nhanh PDF (dùng execSync + temp .mjs + `pdf-parse` v2)
- ✅ Xử lý file 34MB không bị ENAMETOOLONG
- ✅ Hỗ trợ `max_pages` parameter

**Đã hoàn thành thêm:**
- [x] Thêm tool `extract_pdf_to_md`: parse toàn bộ PDF → lưu file `.md` vào `knowledge/raw-md/`
- [x] Tool definition + execution handler trong `tools.ts`
- [x] `converter.ts` — batch convert, list converted files, get summary

**Còn lại (nice-to-have):**
- [ ] `extract_pdf_to_md_full`: cho file lớn (vài trăm trang), parse local → .md, trả summary

### 1.2 DOCX Parser

- [x] Cài đặt: `npm install mammoth`
- [x] File: `src/modules/document/docx-parser.ts`
- [x] Tool `read_docx`: parse file .docx → text, giữ heading/bold/italic/table
- [x] Tool `extract_docx_to_md`: DOCX → .md (definition + execution handler)
- [x] `extract_formulas_docx`: trích xuất công thức MathType/OMML → LaTeX (code sẵn)

### 1.3 Local Converter Script

- [x] File: `src/modules/document/converter.ts`
- [x] Batch convert: `batchConvertDirectory()` quét thư mục → convert all
- [x] Tự động detect: `.pdf` → pdf-parse, `.docx` → mammoth (qua parser.ts factory)
- [x] `listConvertedFiles()` + `getConvertedSummary()`
- [x] Script CLI: `node scripts/convert-doc-to-md.mjs <filepath>` (hỗ trợ --batch)
- [ ] Auto-convert khi có file PDF/DOCX mới trong `knowledge/raw/` (tích hợp vào process_new_raw)

---

## 📋 Phase 2: Wiki & Knowledge Integration (✅ HOÀN THÀNH 2026-05-13)

### 2.1 Markdown Archiver

**File**: `src/modules/knowledge/md-archiver.ts`

**Tools:**
- [x] `archive_document`: nhận file path → 2 output:
  1. `knowledge/raw-md/<filename>.md` — full text gốc (để tra cứu/trích dẫn)
  2. `knowledge/wiki/<topic>.md` — tóm tắt, ý chính (dùng summary 1000 ký tự đầu)
- [x] `search_archived_md`: tìm kiếm nhanh trong raw-md (regex/grep local)
- [x] `quote_from_source`: trích dẫn chính xác kèm context

**Luồng xử lý archive:**
```
User gửi PDF/DOCX
  → archive_document tool:
    1. Parse file → raw text
    2. Lưu knowledge/raw-md/<hash>.md (full text, có page markers)
    3. Tóm tắt 1000 ký tự đầu → Lưu knowledge/wiki/<topic>.md
    4. Trả về: "Đã lưu. Raw: path, Wiki: path"
```

**Gaps acknowledged:**
- [ ] archive_document: dùng LLM cho summary thay vì raw 1000 chars (hiện tại sync-bound)
- [ ] Tích hợp formula-extractor vào archive pipeline (tự động extract formulas khi archive)

### 2.2 Formula Extraction

**File**: `src/modules/document/formula-extractor.ts`

- [x] Phát hiện công thức trong text (pattern LaTeX, inline equations, greek, matrix)
- [x] Chuyển về format chuẩn: `$$...$$` (display) hoặc `\(...\)` (inline)
- [x] Giữ numbering: `(1)`, `(2)` để trích dẫn (label detection)
- [x] Format formulas thành markdown section MathJax-compatible

---

## 📋 Phase 3: Report Generator (❌ CHƯA BẮT ĐẦU)

### 3.1 Report Generator — Text Output

**File**: `src/modules/report/generator.ts` (chưa tạo)

**Tool**: `generate_report` (chưa có)

**Input:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `outline` | string | Sườn báo cáo (text hoặc path file) |
| `sources` | string[] | Danh sách tài liệu tham khảo (paths) |
| `style` | string | `technical` \| `scientific` \| `daily` \| `custom` |
| `template` | string (opt) | Path file mẫu .docx |
| `strict_citation` | boolean | Bắt buộc trích dẫn từ raw-md |

**Output:**
- Text report ready-to-copy vào Word
- Trích dẫn rõ ràng: `[Nguồn: filename.md, trang X]`
- Công thức ở dạng `$$...$$`
- Format chuẩn để copy-paste không lỗi

### 3.2 DOCX Builder — Native .docx Output

**File**: `src/modules/report/docx-builder.ts` (chưa tạo)

- [ ] Cài đặt: `npm install docx`
- [ ] Tool `build_docx_report`: tạo file .docx từ report text
- [ ] Hỗ trợ: Template, Heading, ToC, formulas, table, image

### 3.3 Style Engine

**File**: `src/modules/report/style-engine.ts` (chưa tạo)

| Style | Mô tả | Format |
|-------|-------|--------|
| `technical` | Báo cáo kỹ thuật | Numbered sections, formal |
| `scientific` | Báo khoa học | Abstract, methods, results, references |
| `daily` | Báo cáo công việc | Bullet points, concise |
| `custom` | Tự định nghĩa | YAML/JSON config |

### 3.4 Template Manager

**File**: `src/modules/report/template-manager.ts` (chưa tạo)

- [ ] Tool `register_template`: user upload .docx mẫu
- [ ] Tool `list_templates`: danh sách template có sẵn
- [ ] Template lưu tại: `knowledge/report-templates/`

---

## 📋 Phase 4: Multi-Platform Tool Registration

**Tools đã có trong `src/core/tools.ts` (14 tools):**
| Tool | Trạng thái |
|------|-----------|
| `list_directory` | ✅ Phase 1 |
| `read_file` | ✅ Phase 1 |
| `search_knowledge_graph` | ✅ Phase 1 |
| `write_wiki_page` | ✅ Phase 1 |
| `read_pdf` | ✅ Phase 1 |
| `read_docx` | ✅ Phase 1 |
| `extract_pdf_to_md` | ✅ Phase 1 |
| `extract_docx_to_md` | ✅ Phase 1 |
| `archive_document` | ✅ Phase 2 |
| `search_archived_md` | ✅ Phase 2 |
| `quote_from_source` | ✅ Phase 2 |
| `fetch_url` | ✅ Phase 1 |
| `process_new_raw` | ✅ Phase 1 |
| `execute_command` | ✅ Phase 1 |

**Tools chưa có (cần Phase 3-4):**
| Tool | Phase |
|------|-------|
| `generate_report` | Phase 3 |
| `build_docx_report` | Phase 3 |
| `register_template` | Phase 3 |
| `list_templates` | Phase 3 |
| `convert_batch_docs` | Phase 4 |

**Prompt Builder:**
- [x] Đã update hướng dẫn 14 tools trong workflow
- [ ] Thêm quy tắc trích dẫn trong system prompt
- [ ] Thêm format output cho báo cáo

---

## 📋 Phase 5: Dependencies

### Thêm vào `package.json`:
```json
{
  "mammoth": "^1.8.0",         // ✅ DOCX → text parser (installed)
  "docx": "^8.5.0",            // ❌ Native .docx generator (chưa cài)
  "marked": "^15.0.0"          // ❌ MD → text (chưa cài)
}
```

### Dependencies đã có:
```json
{
  "pdf-parse": "^2.4.5"       // ✅ PDF parser (đã fix)
}
```

---

## 📊 Luồng xử lý chi tiết

### Flow 1: User gửi tài liệu PDF/DOCX
```
User: "Đọc file này" + attach PDF
  → LLM quyết định: archive_document(path, topic?)
  → executeToolCall('archive_document')
     → Converter.parse → raw text
     → Lưu knowledge/raw-md/<file>.md
     → Ghi summary → knowledge/wiki/<topic>.md
  → Trả về: "Đã xử lý. Raw: ..., Wiki: ..."
```

### Flow 2: User yêu cầu viết báo cáo (❌ chưa implement)
```
User: "Viết báo cáo kỹ thuật..."
  → LLM gọi generate_report(outline, sources, style)
  → Đọc sources từ knowledge/raw-md/
  → Áp dụng style engine
  → Output text với citations
```

### Flow 3: User muốn file .docx (❌ chưa implement)
```
User: "Tạo file .docx từ báo cáo này..."
  → LLM gọi build_docx_report(content, template)
  → docx-builder.ts tạo file
  → Lưu tại knowledge/output/report_<date>.docx
```

---

## 🚀 Kế hoạch thực thi

### ✅ Buổi 1: PDF Parser nâng cấp + DOCX Parser (Phase 1)
1. ✅ Thêm tool `extract_pdf_to_md`
2. ✅ Cài mammoth + code DOCX parser
3. ✅ Thêm tool `read_docx`, `extract_docx_to_md`
4. ✅ Thêm script local `convert-doc-to-md.mjs`
5. ✅ Tạo `knowledge/raw-md/` directory
6. ✅ Prompt builder cập nhật (hướng dẫn tools)
7. ✅ Changelog + workspace state updated

### ✅ Buổi 2: Wiki Integration + Formula Extraction (Phase 2)
1. ✅ Code `md-archiver.ts` với `archive_document` tool
2. ✅ Code `search_archived_md` và `quote_from_source`
3. ✅ Code `formula-extractor.ts`
4. ✅ Update tools.ts + llm.ts + prompt-builder với 3 tools mới
5. ✅ Tạo `knowledge/raw-md/_index.md`
6. ✅ Changelog + plan updated

### ⏳ Buổi 3: Report Generator (text)
1. [ ] Code `style-engine.ts`: 4 styles
2. [ ] Code `generator.ts`: generate_report tool
3. [ ] Code `template-manager.ts`: register_template, list_templates
4. [ ] Test với báo cáo kỹ thuật + công thức

### ⏳ Buổi 4: DOCX Builder (native .docx)
1. [ ] Cài `docx` npm package
2. [ ] Code `docx-builder.ts`: build_docx_report tool
3. [ ] Test template matching
4. [ ] Test copy-paste vào Word không lỗi

---

## ✅ Success Criteria

1. **PDF 100 trang** parse trong < 10 giây local
2. **DOCX có công thức** parse chính xác, giữ LaTeX
3. **Trích dẫn** từ raw-md chính xác đến từng paragraph
4. **Báo cáo text** copy-paste vào Word không lỗi font/công thức
5. **File .docx** mở trong Word 2016+ hiển thị đúng
6. **Multi-platform**: tools hoạt động từ Discord, CLI, Telegram