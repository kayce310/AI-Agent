# [2026-05-11 23:31] - Install 9router (AI Router & Token Saver)

## Changes
- Added: [[../projects/9router]] - Project profile for 9router v0.4.29.
- Added: `9router/` directory - Cloned from https://github.com/decolua/9router.
- Added: `.env` config for 9router (copied from .env.example).
- Added: Node dependencies installed (568 packages).
- Verified: `npm run dev` starts at http://localhost:20128 (Next.js 16.2.6, webpack).
- Verified: Dashboard loads ✓, DB driver better-sqlite3 ✓.

## Integration Notes
- Port: 20128 (dashboard + API tại `http://localhost:20128/v1`)
- 9Router RTK Token Saver bổ trợ Zero Waste Token của Kato: nén tool_output runtime thay vì chỉ tối ưu layer kiến trúc.
- 9Router Caveman Mode tương thích với [[../skills/communication-protocol]] Ultra-Terse Mode.
- Có thể dùng 9Router làm endpoint proxy cho các AI tools (Cline, Claude Code...) qua OpenAI-compatible API.

## Anti-Patterns Learned
- ❌ Chạy build Next.js trên Windows gặp EPERM do symlink folder (`Application Data`).
- ✅ Dùng `npm run dev` thay vì build để test, tránh lỗi filesystem Windows.

## Verification Notes
- `cmd /c "cd /d d:\AI-Agent\9router && npm install"` passed (568 packages, 4 moderate vulns).
- `npx next dev --webpack --port 20128` started successfully, dashboard accessible at localhost:20128.
- Login page renders, API POST /api/auth/login returns 401 (expected - chưa config credentials).