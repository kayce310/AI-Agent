# Command Architecture — Cross-Platform, Hermes-Inspired

> **Layer:** core/commands
> **Status:** ✅ Implemented (Phase 5)
> **Last updated:** 2026-07-25

---

## 1. Tổng quan kiến trúc

Command system được tách thành **2 lớp**:

```
src/core/commands/           # Lớp core — platform-agnostic
  types.ts                   #   CommandContext, CommandResult, Command interface
  registry.ts                #   CommandRegistry singleton (Hermes-inspired)
  builtins/
    help.ts                  #   /help — tự động từ registry
    status.ts                #   /status — system + dashboard info
    model.ts                 #   /model — chọn/liệt kê model AI
    sessions.ts              #   /sessions — danh sách session

src/modules/<platform>/      # Platform adapter — giữ platform-specific UI
  commands.ts                #   Telegram bridge: core registry + InlineKeyboard
  index.ts                   #   Main adapter, import SessionManager từ core
```

### Nguyên tắc

| Nguyên tắc | Mô tả |
|------------|-------|
| **Platform-agnostic** | Core commands không import grammy/Discord.js — chỉ dùng `CommandContext` |
| **Singleton registry** | `CommandRegistry.getInstance()` — một registry duy nhất toàn bộ app |
| **Auto-register builtins** | help, status, model, sessions tự động register khi getInstance() lần đầu |
| **Platform gating** | Mỗi command có `platforms[]` — registry tự filter theo platform |
| **Availability check** | `checkFn()` — Hermes-inspired runtime gate (VD: check token tồn tại) |
| **Adapter override** | Platform adapter có thể override command bằng register cùng tên (skip nếu đã tồn tại) |

---

## 2. Core Types (`types.ts`)

```typescript
interface CommandContext {
  platform: string;           // 'telegram' | 'discord' | 'cli' | ...
  userId: string;
  channelId: string;
  isAdmin: boolean;
  isAllowed: boolean;
  args: string[];
  platformContext?: Record<string, unknown>;  // platform-specific data
}

interface CommandResult {
  text: string;
  parseMode?: 'markdown' | 'html' | 'none';
  extra?: Record<string, unknown>;
}

interface Command {
  name: string;              // không có slash — "help", "model"
  description: string;
  handler: CommandHandler;   // (ctx: CommandContext) => Promise<CommandResult>
  platforms?: string[];      // [] = tất cả platform
  checkFn?: () => boolean | Promise<boolean>;
  schema?: Record<string, unknown>;
  category?: 'general' | 'session' | 'admin' | 'task' | 'developer';
}
```

---

## 3. CommandRegistry (`registry.ts`)

### API

| Method | Mô tả |
|--------|-------|
| `getInstance()` | Singleton — tự động register builtins khi gọi lần đầu |
| `register(cmd)` | Idempotent — skip nếu đã tồn tại |
| `getCommands(platform?)` | Filter theo platform nếu có |
| `get(name)` | Lấy 1 command theo tên |
| `execute(name, ctx)` | Execute với platform gating + availability check |
| `buildHelpText(platform?, isAdmin?)` | Tự động sinh /help text, grouped by category |

### Flow

```
Platform Adapter
  → buildCoreContext(ctx, args)     # Tạo CommandContext từ platform event
  → CoreRegistry.getInstance()
  → .execute('help', coreCtx)       # Platform gate + checkFn + handler
  → CommandResult.text              # Platform-agnostic text
  → ctx.reply(result.text)          # Platform-specific send
```

### Auto-registered builtins

| Command | Category | Mô tả |
|---------|----------|-------|
| `help` | general | Liệt kê tất cả command theo category |
| `status` | general | System info + dashboard/tunnel status |
| `model` | general | Liệt kê/chọn model AI |
| `sessions` | session | Xem danh sách session (checkpoint-based) |

---

## 4. Platform Adapter Pattern (Hermes-inspired)

### Telegram (`src/modules/telegram/`)

```
TelegramBridge (PlatformAdapter)
  ├── core CommandRegistry (singleton)   → help, status
  └── Telegram CommandRegistry (local)   → model (InlineKeyboard), dashboard, restart...
```

- `help` và `status` delegate hoàn toàn xuống core registry
- `model` giữ Telegram-specific InlineKeyboard UI (vượt trội hơn text-only core version)
- Các command Telegram-specific: `dashboard`, `world`, `list`, `cancel`, `restart`, `new`, `sessions`, `switch`

### Adding a new platform (Discord, CLI, Web...)

```typescript
// 1. Tạo platform adapter
class DiscordAdapter implements PlatformAdapter { ... }

// 2. Build CommandContext từ platform event
function buildCoreContext(msg: DiscordMessage, args: string[]): CommandContext { ... }

// 3. Gọi core registry
const result = await CoreRegistry.getInstance().execute('help', coreCtx);
await msg.reply(result.text);
```

---

## 5. Platform Metadata & PLATFORM_HINTS

### Gateway → Engine flow

```
PlatformAdapter.platformMeta
  → Gateway.handleAdapterMessage()
  → EngineRequest.platformMeta
  → PromptBuilder.buildSystem({ platformMeta })
  → System prompt: "📡 NỀN TẢNG HIỆN TẠI"
```

### PlatformMeta fields

| Field | Type | Example |
|-------|------|---------|
| `maxMessageLength` | number | 4096 (Telegram), 2000 (Discord) |
| `piiSafe` | boolean | true = mask emails, SĐT |
| `platformHint` | string | 'telegram', 'discord', 'slack' |
| `supportsMarkdown` | boolean | Telegram: ✅, CLI: ❌ |
| `supportsImages` | boolean | Telegram: ✅ |

---

## 6. Session Management

`SessionManager` được move từ `src/platform/telegram/` lên `src/core/session-manager.ts` (re-export).

```
src/core/session-manager.ts
  → export { SessionManager, ... } from '../platform/telegram/session-manager.js'

src/modules/telegram/
  → import { SessionManager } from '../../core/session-manager.js'
```

---

## 7. File Map

```
src/core/
├── commands/
│   ├── types.ts              # CommandContext, CommandResult, Command
│   ├── registry.ts           # CommandRegistry singleton + builtin auto-register
│   └── builtins/
│       ├── help.ts           # /help
│       ├── status.ts         # /status (dashboard + tunnel)
│       ├── model.ts          # /model (cross-platform, text-based)
│       └── sessions.ts       # /sessions
├── session-manager.ts        # Re-export từ platform
├── gateway/
│   ├── types.ts              # PlatformAdapter, PlatformMeta, AdapterMessage
│   └── index.ts              # Gateway orchestrator
└── llm/
    └── prompt-builder.ts     # PLATFORM_HINTS injection

src/modules/telegram/
├── index.ts                  # TelegramBridge (PlatformAdapter)
├── commands.ts               # Telegram CommandRegistry + InlineKeyboard
└── session-manager.ts        # Original implementation (source of re-export)
```
