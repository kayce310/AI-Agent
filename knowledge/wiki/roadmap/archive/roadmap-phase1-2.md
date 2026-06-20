# Roadmap Phase 1-2: Tự Động Hóa Nhận Thức (Tool & Skill System)

## Nhiệm vụ hiện tại: Progressive Disclosure

### Mục tiêu
Triển khai cơ chế "Tiết lộ lũy tiến" (Progressive Disclosure) cho skill system của Coral,
học từ Hermes Agent (Nous Research).

### Vấn đề hiện tại
Khi có 38+ skills (11 wiki + 27 agents-skills), load toàn bộ content vào context window
sẽ gây tràn token ngay lập tức. Cần tách metadata khỏi content:
- **Tier 1 (list_skills)**: Chỉ trả name + description + tags (token-efficient)
- **Tier 2 (skill_view)**: Lazy-load full content khi cần
- **Tier 3 (skill_ref)**: Load references/templates on demand

### Phân tích Hermes (skills_tool.py)
Hermes implement progressive disclosure với 3 tools:
1. `skills_list()` — trả về metadata (name, description, tags)
2. `skill_view()` — load full content + references
3. SKILL.md format → YAML frontmatter (name, description, version, platforms, prerequisites)

### Output so sánh
```
Hermes skills_list():
  [{ "name": "axolotl", "description": "...", "version": "1.0.0", "tags": [...] }, ...]

Coral list_skills (hiện tại):
  [{ "slug": "...", "category": "...", "path": "...", "content": "<full SKILL.md>" }]
  
Coral list_skills (mục tiêu):
  [{ "slug": "...", "category": "...", "name": "...", "description": "...", "tags": [...] }]
```
