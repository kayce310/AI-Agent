# Skill System Implementation Plan — v5.0 → v6.0

> **Status**: Draft
> **Author**: Cline Analysis
> **Date**: 2026-05-12
> **Related**: #skill-system #v5.0-evolution #architecture

---

## 1. Kiến trúc mục tiêu (Target Architecture)

### 1.1 So sánh Before/After

```
BEFORE (v5.0):                              AFTER (v6.0):
┌────────────────────┐                      ┌────────────────────┐
│    engine.ts       │                      │    engine.ts       │
│  (ReAct Loop)      │                      │  (Skill-Aware Loop)│
│         │          │                      │         │          │
│         ▼          │                      │         ▼          │
│   tools.ts         │                      │  skill-manager.ts  │
│  (5 tools only)    │                      │  (route → execute) │
│         │          │                      │         │          │
│         ▼          │                      │    ┌──┴──┐        │
│  evolution.ts      │                      │    ▼     ▼         │
│  (error registry)  │                      │ skill  tools.ts    │
│                    │                      │ exec   (legacy)    │
│                    │                      │    │     │         │
│                    │                      │    ▼     ▼         │
│                    │                      │ verify-skill.ts    │
│                    │                      │ (output gate)      │
│                    │                      │    │               │
│                    │                      │    ▼               │
│                    │                      │ evolution.ts       │
│                    │                      │ (feedback loop)    │
└────────────────────┘                      └────────────────────┘
```

### 1.2 Component Tree

```
src/core/skill-system/
├── skill-manager.ts      # Quản lý vòng đời skill
│   ├── register()        # Đăng ký skill từ folder
│   ├── unregister()      # Hủy skill
│   ├── list()            # Danh sách skills
│   └── find()            # Tìm skill phù hợp cho request
│
├── skill-executor.ts     # Execute skill: load → run → verify
│   ├── execute()         # Pipeline chính
│   ├── loadContext()     # Load SKILL.md + templates + examples
│   └── runScript()       # Chạy script nếu có
│
├── skill-registry.ts     # Index skills từ knowledge/skills/
│   ├── indexDir()        # Quét thư mục skills
│   ├── resolveSkill()    # Resolve skill path → skill object
│   └── manifest.ts      # Manifest với SHA-256 verification
│
├── verify-skill.ts       # Verification layer
│   ├── verifyOutput()    # Kiểm tra output quality
│   ├── validateFormat()  # Định dạng output
│   ├── checkCompleteness() # Kiểm tra đầy đủ
│   └── checkConsistency()  # Kiểm tra nhất quán
│
└── types.ts              # Skill-related types

knowledge/skills/          # Skill definitions (thay thế wiki/skills/)
├── index.json            # Registry manifest
├── [skill-category]/
│   ├── [skill-name]/
│   │   ├── SKILL.md      # Intent + Knowledge + Execution
│   │   ├── templates/     # Templates mẫu
│   │   ├── examples/      # Ví dụ output
│   │   ├── verification/  # Checklist + rules
│   │   └── changelog.md   # Lịch sử thay đổi
│   └── ...
└── ...
```

---

## 2. Requirements chi tiết

### 2.1 🔴 P0 — Must Have (Core Foundation)

#### R1: Skill Manager
- **Input**: request với `task` string
- **Output**: skill ID phù hợp hoặc null
- **Logic**: Match task keywords → skill tags/meta → skill executor
- **Interface**:
  ```typescript
  interface SkillManager {
    register(skill: SkillDefinition): void;
    unregister(skillId: string): void;
    list(): SkillSummary[];
    find(task: string): SkillDefinition | null;
  }
  ```

#### R2: Skill Executor Pipeline
- Input: skill ID + request context
- Pipeline: `validate → loadContext → execute → verify → return`
- Mỗi step có error handling riêng
- **Interface**:
  ```typescript
  interface SkillExecutor {
    execute(skillId: string, context: ExecutionContext): Promise<ExecutionResult>;
  }
  
  interface ExecutionContext {
    task: string;
    references?: RequestReference[];
    constraints?: RequestConstraints;
    contextFiles?: string[];
    messages: ChatMessage[];
  }
  
  interface ExecutionResult {
    content: string;
    skillId: string;
    verified: boolean;
    verificationReport?: VerificationReport;
    executionTime: number;
  }
  ```

#### R3: Verification Layer
- Kiểm tra output quality trước khi return
- **Checks**:
  - Format validation (markdown/json/text đúng định dạng)
  - Completeness (không thiếu section)
  - Consistency (không mâu thuẫn nội bộ)
  - Constraint compliance (không vi phạm forbidden patterns)
- Score output 0-100, reject nếu < threshold
- **Interface**:
  ```typescript
  interface VerificationSkill {
    verify(output: string, context: VerificationContext): Promise<VerificationReport>;
  }
  
  interface VerificationReport {
    passed: boolean;
    score: number;
    issues: Array<{
      type: 'format' | 'completeness' | 'consistency' | 'constraint';
      severity: 'error' | 'warning';
      message: string;
      location?: string;
    }>;
  }
  ```

#### R4: Skill Folder Structure
- Mỗi skill là 1 folder với cấu trúc chuẩn:
  ```
  knowledge/skills/write-proposal/
    SKILL.md              # Bắt buộc: định nghĩa skill
    templates/            # Tuỳ chọn: mẫu output
      proposal-template.md
    examples/             # Tuỳ chọn: ví dụ
      example-1.md
    verification/         # Tuỳ chọn: kiểm tra
      checklist.md
      rules.json
    changelog.md          # Tuỳ chọn: lịch sử
  ```

#### R5: SKILL.md Schema
```markdown
# [Skill Name]

## Intent
- Mục tiêu: ...
- Input: ...
- Output: ...
- Thành công được định nghĩa: ...

## Knowledge
- Domain knowledge cần: ...
- Business rules: ...
- Style guide: ...
- References: ...

## Execution
- Steps: ...
- Tools cần: ...
- Templates: ...
- Workflow: ...

## Verification
- Checklist: ...
- Threshold: ...
- Error handling: ...
```

---

### 2.2 🟡 P1 — Should Have (Evolution)

#### R6: Evolution Feedback Loop
- Sau mỗi lần execute skill, ghi nhận:
  - Success/fail rate
  - Verification score
  - Error patterns
- Feedback vào skill design:
  - Auto-update gotchas trong SKILL.md
  - Suggest template improvements
  - Adjust verification thresholds

#### R7: Skill Discovery & Auto-register
- Quét `knowledge/skills/` khi engine init
- Validate từng skill folder (đúng cấu trúc?)
- Build skill index cache
- Báo cáo skill nào invalid + lý do

#### R8: Break tools.ts → Single-purpose Skills
- Phân tách multi-purpose tools:
  - `search_knowledge_graph` → `knowledge/search` skill
  - `write_wiki_page` → `knowledge/write` skill
  - `process_new_raw_data` → `knowledge/process-raw` skill
  - `list_files` + `read_file` → `filesystem/` skills

---

### 2.3 🟢 P2 — Nice to Have

#### R9: Template Rendering Engine
- Load template từ skill folder
- Inject variables từ context
- Hỗ trợ conditional sections
- Output: template đã điền

#### R10: Skill Dependencies
- Skill A có thể depend vào Skill B
- Resolve DAG dependency khi execute
- Cache intermediate results

#### R11: Registry Security (từ autoskills)
- SHA-256 manifest cho mỗi skill
- Review pipeline trước khi activate
- Lockfile cho reproducibility

---

## 3. Phân Phase triển khai

### Phase 1: Foundation (Tuần 1-2)
**Mục tiêu**: Có skill-system cơ bản chạy được end-to-end

| Task | Files | Dependencies |
|------|-------|-------------|
| 1.1 Tạo type definitions | `src/core/skill-system/types.ts` | — |
| 1.2 Xây skill-registry (quét folder + index) | `src/core/skill-system/skill-registry.ts` | 1.1 |
| 1.3 Xây skill-executor (pipeline cơ bản) | `src/core/skill-system/skill-executor.ts` | 1.1, 1.2 |
| 1.4 Xây verify-skill (format + completeness) | `src/core/skill-system/verify-skill.ts` | 1.1 |
| 1.5 Tích hợp vào engine.ts | Sửa `src/core/engine.ts` | 1.2, 1.3, 1.4 |
| 1.6 Tạo 2-3 skill mẫu | `knowledge/skills/write-proposal/`, `knowledge/skills/analyze-code/`, `knowledge/skills/summarize/` | 1.2 |
| 1.7 Xây dựng registry manifest | `knowledge/skills/index.json` | 1.2 |

**Kết quả Phase 1**: engine.ts có thể: phát hiện skill từ task → execute skill → verify output → return verified result

### Phase 2: Verification + Evolution (Tuần 3-4)
**Mục tiêu**: Verification layer hoàn chỉnh + evolution feedback vào skill

| Task | Files | Dependencies |
|------|-------|-------------|
| 2.1 Nâng cấp verification (consistency + constraint) | `src/core/skill-system/verify-skill.ts` | 1.4 |
| 2.2 Kết nối evolution.ts với skill-executor | Sửa `src/core/evolution.ts`, `skill-executor.ts` | 1.3, 1.5 |
| 2.3 Auto-generate gotchas từ error registry | `src/core/skill-system/skill-evolution.ts` | 2.2 |
| 2.4 Add skill discovery + auto-register | `skill-manager.ts` | 1.2 |

**Kết quả Phase 2**: Verification gate ngăn output lỗi. Evolution tự động cập nhật skill design.

### Phase 3: Migration + Optimization (Tuần 5-6)
**Mục tiêu**: Chuyển toàn bộ tools.ts thành skills + optimization

| Task | Files | Dependencies |
|------|-------|-------------|
| 3.1 Break tools.ts thành skills | `tools.ts` → `skills/` | 1.1, 1.2 |
| 3.2 Template rendering engine | `src/core/skill-system/template-engine.ts` | 1.2 |
| 3.3 Skill dependencies | `skill-manager.ts` | 1.3 |
| 3.4 Performance tuning | `skill-executor.ts`, `engine.ts` | all |

---

## 4. Yêu cầu kỹ thuật (Non-functional)

### 4.1 Performance
- Skill registry load < 200ms (cold start)
- Skill execution overhead < 50ms (so với direct LLM call)
- Verification check < 100ms
- Template rendering < 20ms

### 4.2 Error Handling
- Skill not found → fallback to legacy engine.ts behavior
- Verification fail → retry với adjusted parameters (max 2 lần)
- All verification fails → return result với warning flag, không block
- Evolution error registry vẫn hoạt động song song

### 4.3 Backward Compatibility
- engine.ts v5.0 API không thay đổi
- tools.ts vẫn hoạt động song song trong phase 1-2
- Request không có `task` → skip skill system → legacy behavior

### 4.4 Testing
- Unit test cho mỗi verification check
- Integration test cho skill pipeline
- Migration test: cùng input → v5.0 output ≈ v6.0 output

---

## 5. Critical Decisions

### 5.1 Skill matching strategy
```
Option A: Keyword matching (nhanh, dễ)
  - task string → skill tags → match
  - Pros: 0 LLM call, deterministic
  - Cons: Không handle được task phức tạp

Option B: LLM-based routing (chính xác)
  - task string → LLM → skill ID
  - Pros: Xử lý được task phức tạp
  - Cons: Tốn 1 LLM call, có thể inconsistent

→ **Chọn A trước, B sau** (Phase 1 dùng keyword, Phase 3 add LLM routing)
```

### 5.2 Verification threshold
```
- Phase 1: threshold = 0 (tắt verify, chỉ log)
- Phase 2: threshold = 50 (warn nhưng không block)
- Phase 3: threshold = 70 (block nếu dưới 70)
```

### 5.3 Skill storage
```
- Phase 1: File system (knowledge/skills/)
- Phase 2: Cache + File system
- Phase 3: Optional DB backend
```

---

## 6. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| Verification quá strict → block output tốt | High | Medium | Configurable threshold, fallback mode |
| Skill matching sai → execute sai skill | Medium | Low | Phase 2: double-check với LLM |
| Migration tools.ts → skills gây regression | High | Low | Giữ tools.ts song song trong Phase 1-2 |
| Performance overhead từ skill layer | Medium | Low | Benchmark mỗi phase, optimize nếu >50ms overhead |
| Team không quen skill folder structure | Low | Medium | Script auto-generate skill scaffold |

---

## 7. File thay đổi / tạo mới

### New files
```
src/core/skill-system/
  types.ts              (R1)
  skill-manager.ts      (R1, R7)
  skill-executor.ts     (R2)
  skill-registry.ts     (R7)
  verify-skill.ts       (R3)
  skill-evolution.ts    (R6)
  template-engine.ts    (R9)

knowledge/skills/
  index.json            (R7)
  write-proposal/
    SKILL.md + templates/ + examples/ + verification/ + changelog.md  (R4, R5)
  analyze-code/
    SKILL.md + ...
  summarize/
    SKILL.md + ...
```

### Modified files
```
src/core/engine.ts      — Tích hợp skill-executor vào ReAct loop
src/core/types.ts       — Thêm skill-related types
src/core/tools.ts       — Giữ nguyên trong Phase 1-2, migrate Phase 3
src/core/evolution.ts   — Kết nối với skill-evolution.ts
```

---

## 8. Success Criteria

### Phase 1 hoàn thành khi:
- [ ] engine.process() có thể detect và execute skill từ `task` field
- [ ] Output được verify (format + completeness) trước khi return
- [ ] 3 skill mẫu hoạt động end-to-end
- [ ] Legacy behavior vẫn hoạt động khi không có skill match
- [ ] Performance overhead < 100ms

### Phase 2 hoàn thành khi:
- [ ] Verification score > 70 block output quality thấp
- [ ] Evolution tự động update gotchas vào skill
- [ ] Skill auto-register khi folder thay đổi
- [ ] Error rate giảm 30% so với Phase 1 baseline

### Phase 3 hoàn thành khi:
- [ ] tools.ts đã được break thành skills hoàn toàn
- [ ] Template engine hoạt động
- [ ] Skill dependencies resolve được
- [ ] Performance overhead < 50ms