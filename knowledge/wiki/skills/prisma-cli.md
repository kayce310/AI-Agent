# Prisma CLI Reference

> **Nguồn:** [prisma/skills](prisma/skills/prisma-cli)
> **Commit:** `741a74f`
> **Generated:** 2026-05-03

> **Review:** ✅ approved

---



Complete reference for all Prisma CLI commands. This skill provides guidance on command usage, options, and best practices for current Prisma releases.

### When to Apply

Reference this skill when:
- Setting up a new Prisma project (`prisma init`)
- Generating Prisma Client (`prisma generate`)
- Running database migrations (`prisma migrate`)
- Managing database state (`prisma db push/pull`)
- Using local development database (`prisma dev`)
- Debugging Prisma issues (`prisma debug`)

### Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Setup | HIGH | `init` |
| 2 | Generation | HIGH | `generate` |
| 3 | Development | HIGH | `dev` |
| 4 | Database | HIGH | `db-` |
| 5 | Migrations | CRITICAL | `migrate-` |
| 6 | Utility | MEDIUM | `studio`, `validate`, `format`, `debug`, `mcp` |

### Command Categories

| Category | Commands | Purpose |
|----------|----------|---------|
| Setup | `init` | Bootstrap new Prisma project |
| Generation | `generate` | Generate Prisma Client |
| Validation | `validate`, `format` | Schema validation and formatting |
| Development | `dev` | Local Prisma Postgres for development |
| Database | `db pull`, `db push`, `db seed`, `db execute` | Direct database operations |
| Migrations | `migrate dev`, `migrate deploy`, `migrate reset`, `migrate status`, `migrate diff`, `migrate resolve` | Schema migrations |
| Utility | `studio`, `mcp`, `version`, `debug` | Development and AI tooling |

### Quick Reference

#### Project Setup

```bash
prisma init

prisma init --datasource-provider postgresql
prisma init --datasource-provider mysql
prisma init --datasource-provider sqlite

prisma init --db

prisma init --with-model
```

#### Client Generation

```bash
prisma generate

prisma generate --watch

prisma generate --generator client
```

#### Bun Runtime

When using Bun, always add the `--bun` flag so Prisma runs with the Bun runtime (otherwise it falls back to Node.js because of the CLI shebang):

```bash
bunx --bun prisma init
bunx --bun prisma generate
```

#### Local Development Database

```bash
prisma dev

prisma dev --name myproject

prisma dev --detach

prisma dev ls

prisma dev stop myproject

prisma dev rm myproject
```

#### Database Operations

```bash
prisma db pull

prisma db push

prisma db seed

prisma db execute --file ./script.sql
```

#### Migrations (Development)

```bash
prisma migrate dev

prisma migrate dev --name add_users_table

prisma migrate dev --create-only

prisma migrate reset
```

#### Migrations (Production)

```bash
prisma migrate deploy

prisma migrate status

prisma migrate diff --from-config-datasource --to-schema schema.prisma --script
```

#### Utility Commands

```bash
prisma studio

prisma mcp

prisma version
prisma -v

prisma debug

prisma validate

prisma format
```

### Current Prisma CLI Setup

#### New Configuration File

Use `prisma.config.ts` for CLI configuration:

```typescript
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

#### Current Command Behavior

- Run `prisma generate` explicitly after `migrate dev`, `db push`, or other schema syncs when you need fresh client output
- Run `prisma db seed` explicitly after `migrate dev` or `migrate reset` when you need seed data
- Use `prisma db execute --file ...` for raw SQL scripts

#### Environment Variables

Load environment variables explicitly in `prisma.config.ts`, commonly with `dotenv`:

```typescript
// prisma.config.ts
import 'dotenv/config'
```

### Rule Files

See individual rule files for detailed command documentation:

```
references/init.md           - Project initialization
references/generate.md       - Client generation
references/dev.md            - Local development database
references/db-pull.md        - Database introspection
references/db-push.md        - Schema push
references/db-seed.md        - Database seeding
references/db-execute.md     - Raw SQL execution
references/migrate-dev.md    - Development migrations
references/migrate-deploy.md - Production migrations
references/migrate-reset.md  - Database reset
references/migrate-status.md - Migration status
references/migrate-resolve.md - Migration resolution
references/migrate-diff.md   - Schema diffing
references/studio.md         - Database GUI
references/mcp.md            - Prisma MCP server
references/validate.md       - Schema validation
references/format.md         - Schema formatting
references/debug.md          - Debug info
```

### How to Use

Use the command categories above for navigation, then open the specific command reference file you need.


---

*Converted from autoskills — source: prisma/skills/prisma-cli @ 741a74f*