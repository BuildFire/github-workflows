# BuildFire GitHub Workflows

This repository contains shared GitHub Actions workflows for BuildFire repositories.

The goal is to keep common automation in one place so each plugin repo only needs a small workflow file.

---

## What this repo supports today

### AI Plugin Metadata Generator

This workflow scans an existing BuildFire plugin and generates AI metadata files under:

```txt
ai/
```

Generated files:

```txt
ai/plugin.plan.json
ai/plugin.index.json
ai/plugin.mcp.json
```

These files help Plugin Studio, MCP tools, and AI assistants understand:

- How the plugin works
- What files exist
- How widget and control code are structured
- What datastore keys and schemas are used
- What plugin data operations are safe for AI/MCP tools

---

## How to use this workflow in a plugin repo

In the plugin repository, add this file:

```txt
.github/workflows/generate-ai-plugin-metadata.yml
```

Use this content:

```yaml
name: Generate AI Plugin Metadata

on:
  workflow_dispatch:

jobs:
  generate:
    uses: BuildFire/github-workflows/.github/workflows/generate-ai-plugin-metadata.yml@main
    secrets: inherit
```

Commit the file.

Then run it manually from the plugin repo:

```txt
Actions → Generate AI Plugin Metadata → Run workflow
```

If metadata files are created or changed, the workflow opens a pull request in the plugin repo.

---

## Required secrets

The BuildFire organization must provide these GitHub Actions secrets:

```txt
PLUGIN_AI_METADATA_OPENAI_API_KEY
PLUGIN_AI_METADATA_GH_TOKEN
```

### `PLUGIN_AI_METADATA_OPENAI_API_KEY`

Used by Codex/OpenAI to scan the plugin and generate metadata.

### `PLUGIN_AI_METADATA_GH_TOKEN`

Used to checkout this private shared workflow repository.

The token only needs read access to this repo.

---

## Important notes

- The workflow is manual only for now.
- It does not run automatically on every push.
- It should only create or update files inside `ai/`.
- It should not modify plugin runtime source code.
- Engineers should review the generated PR before merging.

---

## Current repo structure

```txt
BuildFire/github-workflows
├── .github/
│   └── workflows/
│       └── generate-ai-plugin-metadata.yml
├── prompts/
│   └── plugin-ai-metadata.prompt.md
└── README.md
```

---

## Future support

Planned future workflows may include:

- Incremental AI metadata updates
- Lightweight metadata generation
- Plugin QC test generation
- Playwright-based plugin validation
- MCP contract updates
