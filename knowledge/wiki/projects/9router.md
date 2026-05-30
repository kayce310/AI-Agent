# 9Router - AI Router & Token Saver

## Thông tin Dự án
- **URL**: https://github.com/decolua/9router
- **Version**: 0.4.29
- **Tech Stack**: Next.js 16.2.6, React 19, Tailwind CSS v4, Express, better-sqlite3/sql.js, zustand
- **Trạng thái**: ✅ Đã cài đặt & chạy tại `http://localhost:20128`

## Vị trí
- Thư mục: `9router/` (ngoài Kato workspace root)
- Port: 20128
- Mode hiện tại: Dev server đang chạy

## Mục đích
- Router AI request đến 40+ providers & 100+ models
- RTK Token Saver: nén tool_output (git diff, grep, ls...) tiết kiệm 20-40% input tokens
- Caveman Mode: tiết kiệm đến 65% output tokens
- Smart 3-Tier Fallback: Subscription → Cheap → FREE
- Format translation: OpenAI ↔ Claude ↔ Gemini ↔ Cursor ↔ Kiro ↔ Vertex

## Liên kết với Kato Agent
- 9Router cung cấp **RTK Token Saver** bổ trợ cho **Zero Waste Token** của Kato Agentic Workspace
- 9Router **Caveman Mode** tương thích với **Ultra-Terse Mode** (communication-protocol.md)
- Cả 2 đều hướng đến tối ưu token - Kato ở layer kiến trúc (modular SOP, lazy loading), 9Router ở layer network (nén tool_output runtime)

## Tài nguyên
- [[../index]] - Bản đồ tri thức tổng
- [[../core/changelog]] - Nhật ký tiến hóa
- [9Router README](https://github.com/decolua/9router)

#project #9router #ai-router #token-saver