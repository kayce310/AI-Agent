# Wrangler CLI

> **Nguồn:** [cloudflare/skills](cloudflare/skills/wrangler)
> **Commit:** `0438a07`
> **Generated:** 2026-05-03

> **Review:** 🚫 flagged
> **Flags:** broad installation command (`npm install -D wrangler@latest`) should be user-contextualized, commands that delete or modify remote resources are listed without explicit confirmation context, example `.dev.vars` contains credential-like values and a database URL placeholder

---



Your knowledge of Wrangler CLI flags, config fields, and subcommands may be outdated. **Prefer retrieval over pre-training** for any Wrangler task.

### Retrieval Sources

Fetch the **latest** information before writing or reviewing Wrangler commands and config. Do not rely on baked-in knowledge for CLI flags, config fields, or binding shapes.

| Source | How to retrieve | Use for |
|--------|----------------|---------|
| Wrangler docs | `https://developers.cloudflare.com/workers/wrangler/` | CLI commands, flags, config reference |
| Wrangler config schema | `node_modules/wrangler/config-schema.json` | Config fields, binding shapes, allowed values |
| Cloudflare docs | Search tool or `https://developers.cloudflare.com/workers/` | API reference, compatibility dates/flags |

### FIRST: Check if Wrangler is installed, and if not, install it

Check if Wrangler is installed by running:

```bash
wrangler --version  # Requires v4.x+
```

If Wrangler is not installed, you should install it by running:

```bash
npm install -D wrangler@latest
```

Wherever possible, you should use Wrangler instead of manually constructing API requests.

### Key Guidelines

- **Use `wrangler.jsonc`**: Prefer JSON config over TOML. Newer features are JSON-only.
- **Set `compatibility_date`**: Use a recent date (within 30 days). Check https://developers.cloudflare.com/workers/configuration/compatibility-dates/
- **Generate types after config changes**: Run `wrangler types` to update TypeScript bindings.
- **Local dev defaults to local storage**: Bindings use local simulation unless `remote: true`.
- **Profile Worker startup**: Run `wrangler check startup` to measure startup time and detect scripts that exceed the startup time limit.
- **Use environments for staging/prod**: Define `env.staging` and `env.production` in config.

### Quick Start: New Worker

```bash
npx wrangler init my-worker

npx create-cloudflare@latest my-app
```

### Quick Reference: Core Commands

| Task | Command |
|------|---------|
| Start local dev server | `wrangler dev` |
| Deploy to Cloudflare | `wrangler deploy` |
| Deploy dry run | `wrangler deploy --dry-run` |
| Generate TypeScript types | `wrangler types` |
| Profile Worker startup time | `wrangler check startup` |
| View live logs | `wrangler tail` |
| Delete Worker | `wrangler delete` |
| Auth status | `wrangler whoami` |


### Configuration (wrangler.jsonc)

#### Minimal Config

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-01-01"
}
```

#### Full Config with Bindings

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-01-01",
  "compatibility_flags": ["nodejs_compat"],

  // Environment variables
  "vars": {
    "ENVIRONMENT": "production"
  },

  // KV Namespace
  "kv_namespaces": [
    { "binding": "KV", "id": "<KV_NAMESPACE_ID>" }
  ],

  // R2 Bucket
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "my-bucket" }
  ],

  // D1 Database
  "d1_databases": [
    { "binding": "DB", "database_name": "my-db", "database_id": "<DB_ID>" }
  ],

  // Workers AI (always remote)
  "ai": { "binding": "AI" },

  // Vectorize
  "vectorize": [
    { "binding": "VECTOR_INDEX", "index_name": "my-index" }
  ],

  // Hyperdrive
  "hyperdrive": [
    { "binding": "HYPERDRIVE", "id": "<HYPERDRIVE_ID>" }
  ],

  // Durable Objects
  "durable_objects": {
    "bindings": [
      { "name": "COUNTER", "class_name": "Counter" }
    ]
  },

  // Cron triggers
  "triggers": {
    "crons": ["0 * * * *"]
  },

  // Environments
  "env": {
    "staging": {
      "name": "my-worker-staging",
      "vars": { "ENVIRONMENT": "staging" }
    }
  }
}
```

#### Generate Types from Config

```bash
wrangler types

wrangler types ./src/env.d.ts

wrangler types --check
```


### Local Development

#### Start Dev Server

```bash
wrangler dev

wrangler dev --env staging

wrangler dev --local

wrangler dev --remote

wrangler dev --port 8787

wrangler dev --live-reload

wrangler dev --test-scheduled
```

#### Remote Bindings for Local Dev

Use `remote: true` in binding config to connect to real resources while running locally:

```jsonc
{
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "my-bucket", "remote": true }
  ],
  "ai": { "binding": "AI", "remote": true },
  "vectorize": [
    { "binding": "INDEX", "index_name": "my-index", "remote": true }
  ]
}
```

**Recommended remote bindings**: AI (required), Vectorize, Browser Rendering, mTLS, Images.

#### Local Secrets

Create `.dev.vars` for local development secrets:

```
API_KEY=local-dev-key
DATABASE_URL=postgres://localhost:5432/dev
```


### Deployment

#### Deploy Worker

```bash
wrangler deploy

wrangler deploy --env staging

wrangler deploy --dry-run

wrangler deploy --keep-vars

wrangler deploy --minify
```

#### Manage Secrets

> **Security**: Never pass secret values as command arguments or pipe them via `echo`.
> Use the interactive prompt (preferred), pipe from a file, or use `secret bulk`.
> Never output, log, or hardcode secret values in commands.

```bash
wrangler secret put API_KEY

wrangler secret put PRIVATE_KEY < path/to/private-key.pem

wrangler secret list

wrangler secret delete API_KEY

wrangler secret bulk secrets.json
```

#### Versions and Rollback

```bash
wrangler versions list

wrangler versions view <VERSION_ID>

wrangler rollback

wrangler rollback <VERSION_ID>
```


### KV (Key-Value Store)

#### Manage Namespaces

```bash
wrangler kv namespace create MY_KV

wrangler kv namespace list

wrangler kv namespace delete --namespace-id <ID>
```

#### Manage Keys

```bash
wrangler kv key put --namespace-id <ID> "key" "value"

wrangler kv key put --namespace-id <ID> "key" "value" --expiration-ttl 3600

wrangler kv key get --namespace-id <ID> "key"

wrangler kv key list --namespace-id <ID>

wrangler kv key delete --namespace-id <ID> "key"

wrangler kv bulk put --namespace-id <ID> data.json
```

#### Config Binding

```jsonc
{
  "kv_namespaces": [
    { "binding": "CACHE", "id": "<NAMESPACE_ID>" }
  ]
}
```


### R2 (Object Storage)

#### Manage Buckets

```bash
wrangler r2 bucket create my-bucket

wrangler r2 bucket create my-bucket --location wnam

wrangler r2 bucket list

wrangler r2 bucket info my-bucket

wrangler r2 bucket delete my-bucket
```

#### Manage Objects

```bash
wrangler r2 object put my-bucket/path/file.txt --file ./local-file.txt

wrangler r2 object get my-bucket/path/file.txt

wrangler r2 object delete my-bucket/path/file.txt
```

#### Config Binding

```jsonc
{
  "r2_buckets": [
    { "binding": "ASSETS", "bucket_name": "my-bucket" }
  ]
}
```


### D1 (SQL Database)

#### Manage Databases

```bash
wrangler d1 create my-database

wrangler d1 create my-database --location wnam

wrangler d1 list

wrangler d1 info my-database

wrangler d1 delete my-database
```

#### Execute SQL

```bash
wrangler d1 execute my-database --remote --command "SELECT * FROM users"

wrangler d1 execute my-database --remote --file ./schema.sql

wrangler d1 execute my-database --local --command "SELECT * FROM users"
```

#### Migrations

```bash
wrangler d1 migrations create my-database create_users_table

wrangler d1 migrations list my-database --local

wrangler d1 migrations apply my-database --local

wrangler d1 migrations apply my-database --remote
```

#### Export/Backup

```bash
wrangler d1 export my-database --remote --output backup.sql

wrangler d1 export my-database --remote --output schema.sql --no-data
```

#### Config Binding

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-database",
      "database_id": "<DATABASE_ID>",
      "migrations_dir": "./migrations"
    }
  ]
}
```


### Vectorize (Vector Database)

#### Manage Indexes

```bash
wrangler vectorize create my-index --dimensions 768 --metric cosine

wrangler vectorize create my-index --preset @cf/baai/bge-base-en-v1.5

wrangler vectorize list

wrangler vectorize get my-index

wrangler vectorize delete my-index
```

#### Manage Vectors

```bash
wrangler vectorize insert my-index --file vectors.ndjson

wrangler vectorize query my-index --vector "[0.1, 0.2, ...]" --top-k 10
```

#### Config Binding

```jsonc
{
  "vectorize": [
    { "binding": "SEARCH_INDEX", "index_name": "my-index" }
  ]
}
```


### Hyperdrive (Database Accelerator)

#### Manage Configs

```bash
wrangler hyperdrive create my-hyperdrive \
  --origin-host db.example.com \
  --origin-port 5432 \
  --database my-database \
  --origin-user db-user \
  --origin-password "$DB_PASSWORD"

wrangler hyperdrive create my-hyperdrive \
  --connection-string "$HYPERDRIVE_CONNECTION_STRING"

wrangler hyperdrive list

wrangler hyperdrive get <HYPERDRIVE_ID>

wrangler hyperdrive update <HYPERDRIVE_ID> \
  --origin-password "$DB_PASSWORD"

wrangler hyperdrive delete <HYPERDRIVE_ID>
```

#### Config Binding

```jsonc
{
  "compatibility_flags": ["nodejs_compat"],
  "hyperdrive": [
    { "binding": "HYPERDRIVE", "id": "<HYPERDRIVE_ID>" }
  ]
}
```


### Workers AI

#### List Models

```bash
wrangler ai models

wrangler ai finetune list
```

#### Config Binding

```jsonc
{
  "ai": { "binding": "AI" }
}
```

**Note**: Workers AI always runs remotely and incurs usage charges even in local dev.


### Queues

#### Manage Queues

```bash
wrangler queues create my-queue

wrangler queues list

wrangler queues delete my-queue

wrangler queues consumer add my-queue my-worker

wrangler queues consumer remove my-queue my-worker
```

#### Config Binding

```jsonc
{
  "queues": {
    "producers": [
      { "binding": "MY_QUEUE", "queue": "my-queue" }
    ],
    "consumers": [
      {
        "queue": "my-queue",
        "max_batch_size": 10,
        "max_batch_timeout": 30
      }
    ]
  }
}
```


### Containers

#### Build and Push Images

```bash
wrangler containers build -t my-app:latest .

wrangler containers build -t my-app:latest . --push

wrangler containers push my-app:latest
```

#### Manage Containers

```bash
wrangler containers list

wrangler containers info <CONTAINER_ID>

wrangler containers delete <CONTAINER_ID>
```

#### Manage Images

```bash
wrangler containers images list

wrangler containers images delete my-app:latest
```

#### Manage External Registries

> **Security**: Never hardcode registry credentials in commands. Use environment variables.

```bash
wrangler containers registries list

wrangler containers registries configure <DOMAIN> \
  --aws-access-key-id "$AWS_ACCESS_KEY_ID"

wrangler containers registries configure <DOMAIN> \
  --dockerhub-username "$DOCKERHUB_USERNAME"

wrangler containers registries delete <DOMAIN>
```


### Workflows

#### Manage Workflows

```bash
wrangler workflows list

wrangler workflows describe my-workflow

wrangler workflows trigger my-workflow

wrangler workflows trigger my-workflow --params '{"key": "value"}'

wrangler workflows delete my-workflow
```

#### Manage Workflow Instances

```bash
wrangler workflows instances list my-workflow

wrangler workflows instances describe my-workflow <INSTANCE_ID>

wrangler workflows instances terminate my-workflow <INSTANCE_ID>
```

#### Config Binding

```jsonc
{
  "workflows": [
    {
      "binding": "MY_WORKFLOW",
      "name": "my-workflow",
      "class_name": "MyWorkflow"
    }
  ]
}
```


### Pipelines

#### Manage Pipelines

```bash
wrangler pipelines create my-pipeline --r2 my-bucket

wrangler pipelines list

wrangler pipelines show my-pipeline

wrangler pipelines update my-pipeline --batch-max-mb 100

wrangler pipelines delete my-pipeline
```

#### Config Binding

```jsonc
{
  "pipelines": [
    { "binding": "MY_PIPELINE", "pipeline": "my-pipeline" }
  ]
}
```


### Secrets Store

#### Manage Stores

```bash
wrangler secrets-store store create my-store

wrangler secrets-store store list

wrangler secrets-store store delete <STORE_ID>
```

#### Manage Secrets in Store

```bash
wrangler secrets-store secret put <STORE_ID> my-secret

wrangler secrets-store secret list <STORE_ID>

wrangler secrets-store secret get <STORE_ID> my-secret

wrangler secrets-store secret delete <STORE_ID> my-secret
```

#### Config Binding

```jsonc
{
  "secrets_store_secrets": [
    {
      "binding": "MY_SECRET",
      "store_id": "<STORE_ID>",
      "secret_name": "my-secret"
    }
  ]
}
```


### Pages (Frontend Deployment)

```bash
wrangler pages project create my-site

wrangler pages deploy ./dist

wrangler pages deploy ./dist --branch main

wrangler pages deployment list --project-name my-site
```


### Observability

#### Tail Logs

```bash
wrangler tail

wrangler tail my-worker

wrangler tail --status error

wrangler tail --search "error"

wrangler tail --format json
```

#### Config Logging

```jsonc
{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```


### Testing

#### Local Testing with Vitest

```bash
npm install -D @cloudflare/vitest-pool-workers vitest
```

`vitest.config.ts`:
```typescript
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.jsonc" },
      },
    },
  },
});
```

#### Test Scheduled Events

```bash
wrangler dev --test-scheduled

curl http://localhost:8787/__scheduled
```


### Troubleshooting

#### Common Issues

| Issue | Solution |
|-------|----------|
| `command not found: wrangler` | Install: `npm install -D wrangler` |
| Auth errors | Run `wrangler login` |
| Startup time limit exceeded | Run `wrangler check startup` to profile startup and generate CPU profiles |
| Type errors after config change | Run `wrangler types` |
| Local storage not persisting | Check `.wrangler/state` directory |
| Binding undefined in Worker | Verify binding name matches config exactly |

#### Debug Commands

```bash
wrangler whoami

wrangler check startup

wrangler docs configuration
```


### Best Practices

1. **Version control `wrangler.jsonc`**: Treat as source of truth for Worker config.
2. **Use automatic provisioning**: Omit resource IDs for auto-creation on deploy.
3. **Run `wrangler types` in CI**: Add to build step to catch binding mismatches.
4. **Use environments**: Separate staging/production with `env.staging`, `env.production`.
5. **Set `compatibility_date`**: Update quarterly to get new runtime features.
6. **Use `.dev.vars` for local secrets**: Never commit secrets to config.
7. **Test locally first**: `wrangler dev` with local bindings before deploying.
8. **Use `--dry-run` before major deploys**: Validate changes without deployment.
9. **Never embed secrets in commands**: Use interactive prompts (`wrangler secret put`), file-based input (`wrangler secret bulk`), or secure CI environment variables. Never echo, log, or pass secret values as CLI arguments.


---

*Converted from autoskills — source: cloudflare/skills/wrangler @ 0438a07*