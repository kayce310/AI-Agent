# 📚 Kato Knowledge Base Index v4.0

Trung tâm bản đồ tri thức của hệ thống Kato Agent

---

## ⚡ Khởi động Nhanh

```
1. Đọc [[AGENTS]] → Xác định vai trò
2. Tra file này → Tìm skill/resource cần thiết
3. Chỉ tải đúng file cần dùng → Zero Waste Token
```

---

## 📁 Cấu trúc Thư mục

| Thư mục | Mô tả |
|---------|-------|
| [[skills/]] | Kỹ năng modular (SOP) - Mỗi file 1 nhiệm vụ |
| [[agents-skills/]] | Library kỹ năng mở rộng (Reference) |
| [[core/]] | Kiến trúc lõi, tầm nhìn, changelog |
| [[projects/]] | Theo dự án - Mỗi project có state.md |
| [[troubleshooting/]] | Thư viện giải pháp lỗi |
| [[workspace/]] | Trạng thái phiên làm việc |

---

## Agent Skill Library
Location: `knowledge/agents-skills/`
Index: `knowledge/agents-skills/common/_INDEX.md`
       `knowledge/agents-skills/typescript/_INDEX.md`
Rules: `knowledge/agents-skills/agent-skill-standard-rule.md`

Categories:
- common/ (23 skills) — best-practices, debugging, security, TDD, git, v.v.
- typescript/ (4 skills) — language, tooling, security, best-practices

Usage: Load chỉ skill cần thiết theo Zero Waste Token principle.
       Không load toàn bộ library.

---

## 🗺️ Bản đồ Định tuyến

### 🎭 Router & Vai trò
- [[AGENTS]] - Định tuyến vai trò, anti-patterns, quy trình khởi động

### 🧱 Nền tảng
| Skill | Mô tả |
|-------|-------|
| [[skills/coding-standards]] | Module hóa, MCP, fail-fast |
| [[skills/verification-protocol]] | Kiểm chứng, testing, validation |
| [[skills/communication-protocol]] | Ultra-Terse Mode, không fluff |
| [[skills/state-management]] | Data Plane an toàn, state.json, atomic write |

### 📡 Tham chiếu Kiến trúc
| Resource | Mô tả |
|----------|-------|
| [[reference/hermes-agent-analysis]] | Phân tích Hermes Agent (Nous Research v0.14.0) — tham chiếu cho Kato |

### 🧠 Quản trị Tri thức
| Skill | Mô tả |
|-------|-------|
| [[skills/knowledge-management]] | SSOT, differential processing |
| [[skills/obsidian-formatting]] | Wiki-links, graph weaving |

### ⚙️ Xử lý Nâng cao
| Skill | Mô tả |
|-------|-------|
| [[skills/big-data-processing]] | Chunking, orchestrator-worker |
| [[skills/automation-directives]] | O(1) query, self-learning |
| [[skills/security-sandbox]] | Docker isolation, safe execution |

### 🎨 Giao diện
| Skill | Mô tả |
|-------|-------|
| [[skills/ui-vibe-coding]] | Design system, DESIGN.md integration |

### 🧬 Tiến hóa
| Skill | Mô tả |
|-------|-------|
| [[skills/evolution-protocol]] | Changelog, memory commit, state |

---

## 🏗️ Core Architecture

- [[core/master-vision]] - Linh hồn & Tầm nhìn cốt lõi
- [[core/changelog]] - Nhật ký Tiến hóa hệ thống
- [[core/llm-architecture]] - Kiến trúc Lõi LLM Universal
- [[core/task-queue]] - Hệ thống hàng đợi tác vụ

---

## 🌐 Gateway Layer
- `src/core/gateway/` — Gateway Layer
  - `types.ts`: KatoRequest, KatoResponse, PlatformAdapter
  - `index.ts`: KatoGateway class

---

## 🛩️ Project Profiles

- [[projects/ovap-x1]] - Hồ sơ dự án OVAP-X1 Flight Control

---

## 📄 Raw Knowledge Base (Bất biến - Chỉ ĐỌC)

### Control Algorithms
- Geometric Control trên SE(3), STSMC, ADRC, MPC
- Động lực học Multirotor

### Control Allocation
- Thuật toán tối ưu hóa điều khiển
- Giải pháp đa rotor 6DOF

### Technical Documents
- Datasheet phần cứng, bằng sáng chế

---

## 📊 Trạng thái Hệ thống

- **Phiên bản**: v4.0 (Agentic Workspace)
- **KATO.md**: Bootloader siêu nén / Control Plane
- **Skills**: Modular SOPs + Data Plane state manager
- **Triết lý**: Zero Waste Token, Control/Data Plane separation

---
#system #knowledge-base #index #agentic-workspace
