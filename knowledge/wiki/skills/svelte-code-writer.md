# Svelte 5 Code Writer

> **Nguồn:** [sveltejs/ai-tools](sveltejs/ai-tools/svelte-code-writer)
> **Commit:** `2ded135`
> **Generated:** 2026-05-03

> **Review:** ✅ approved

---



### CLI Tools

You have access to `@sveltejs/mcp` CLI for Svelte-specific assistance. Use these commands via `npx`:

#### List Documentation Sections

```bash
npx @sveltejs/mcp list-sections
```

Lists all available Svelte 5 and SvelteKit documentation sections with titles and paths.

#### Get Documentation

```bash
npx @sveltejs/mcp get-documentation "<section1>,<section2>,..."
```

Retrieves full documentation for specified sections. Use after `list-sections` to fetch relevant docs.

**Example:**

```bash
npx @sveltejs/mcp get-documentation "$state,$derived,$effect"
```

#### Svelte Autofixer

```bash
npx @sveltejs/mcp svelte-autofixer "<code_or_path>" [options]
```

Analyzes Svelte code and suggests fixes for common issues.

**Options:**

- `--async` - Enable async Svelte mode (default: false)
- `--svelte-version` - Target version: 4 or 5 (default: 5)

**Examples:**

```bash
npx @sveltejs/mcp svelte-autofixer '<script>let count = \$state(0);</script>'

npx @sveltejs/mcp svelte-autofixer ./src/lib/Component.svelte

npx @sveltejs/mcp svelte-autofixer ./Component.svelte --svelte-version 4
```

**Important:** When passing code with runes (`$state`, `$derived`, etc.) via the terminal, escape the `$` character as `\$` to prevent shell variable substitution.

### Workflow

1. **Uncertain about syntax?** Run `list-sections` then `get-documentation` for relevant topics
2. **Reviewing/debugging?** Run `svelte-autofixer` on the code to detect issues
3. **Always validate** - Run `svelte-autofixer` before finalizing any Svelte component


---

*Converted from autoskills — source: sveltejs/ai-tools/svelte-code-writer @ 2ded135*