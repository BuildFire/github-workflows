# BuildFire GitHub Workflows

This repository contains shared GitHub Actions workflows for BuildFire repositories.

The goal is to keep common automation in one place so each plugin repository only needs a small workflow file.

---

## What this repo supports today

### BuildFire Plugin Metadata Generator

This workflow scans an existing BuildFire plugin and generates BuildFire metadata files under:

```txt
.buildfire/
```

Generated files:

```txt
.buildfire/plugin.plan.json
.buildfire/plugin.index.json
.buildfire/plugin.mcp.json
```

These files help Plugin Studio, MCP tools, ChatGPT Apps, and AI assistants understand:

- How the plugin works
- What files exist
- How widget and control code are structured
- What datastore keys and schemas are used
- What plugin data operations are safe for AI/MCP tools
- What operations require human confirmation
- What data should never be changed automatically

These files are not runtime plugin files. They are BuildFire metadata files used for AI-assisted generation, updates, MCP workflows, and safe plugin data operations.

---

## Metadata files

### `.buildfire/plugin.plan.json`

Deep architectural memory for Plugin Studio and future AI-assisted updates.

This file explains:

- Plugin purpose
- Runtime architecture
- Widget behavior
- Control panel behavior
- Data contracts
- BuildFire SDK usage
- Important execution flows
- File responsibilities
- Update guidance
- High-risk areas

This is the main architectural brain of the plugin.

---

### `.buildfire/plugin.index.json`

Compact semantic file manifest.

This file helps AI quickly understand:

- What files exist
- What each file is responsible for
- Which files are related to widget, control, resources, or config
- Which files are relevant to data operations
- Which files are safe or risky to modify

This file should stay compact so AI can quickly decide which files need to be read during future updates.

---

### `.buildfire/plugin.mcp.json`

Compact MCP-safe data operation contract.

This file helps MCP tools and ChatGPT Apps safely manage plugin data.

It focuses on:

- Data stores
- Data schemas
- Safe create/update/remove operations
- Dangerous fields
- Identity fields
- Required human confirmations
- Unsupported operations
- Safe and unsafe examples

This file should not contain full UI architecture or source file evidence. That belongs in `plugin.plan.json` and `plugin.index.json`.

---

## How to use this workflow in a plugin repo

In the plugin repository, add this file:

```txt
.github/workflows/generate-buildfire-plugin-metadata.yml
```

Use this content:

```yaml
name: Generate BuildFire Plugin Metadata

on:
  workflow_dispatch:

jobs:
  generate:
    uses: BuildFire/github-workflows/.github/workflows/generate-buildfire-plugin-metadata.yml@main
    secrets: inherit
```

Commit the file.

Then run it manually from the plugin repo:

```txt
Actions → Generate BuildFire Plugin Metadata → Run workflow
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

Used by Codex/OpenAI to scan the plugin and generate BuildFire metadata.

### `PLUGIN_AI_METADATA_GH_TOKEN`

Used to checkout this private shared workflow repository.

The token only needs read access to this repo.

---

## Important notes

- The workflow is manual only for now.
- It does not run automatically on every push.
- It should only create or update files inside `.buildfire/`.
- It should not modify plugin runtime source code.
- Engineers should review the generated PR before merging.
- Older repos may still contain `ai/`, but `.buildfire/` is the new standard location.

---

## Current repo structure

```txt
BuildFire/github-workflows
├── .github/
│   └── workflows/
│       └── generate-buildfire-plugin-metadata.yml
├── prompts/
│   └── buildfire-plugin-metadata.prompt.md
└── README.md
```

---

## Recommended plugin repo output

After running the workflow, a plugin repo should include:

```txt
.buildfire/
├── plugin.plan.json
├── plugin.index.json
└── plugin.mcp.json
```

---

## File responsibilities

### `plugin.plan.json`

Use this file when the AI needs deep plugin context.

Best for:

- Understanding the plugin architecture
- Planning code updates
- Understanding widget/control behavior
- Understanding data flow
- Understanding high-risk areas
- Maintaining backward compatibility
- Supporting future Plugin Studio updates

This file can be detailed.

---

### `plugin.index.json`

Use this file when the AI needs a quick file map.

Best for:

- Deciding which files to read
- Finding entry points
- Understanding file responsibilities
- Avoiding unnecessary full-repo scans
- Reducing token usage during future updates

This file should stay compact.

---

### `plugin.mcp.json`

Use this file when MCP tools or ChatGPT Apps need to safely manage plugin data.

Best for:

- Reading plugin data
- Creating records
- Updating records
- Removing or archiving records when supported
- Understanding required confirmation rules
- Preventing unsafe data changes

This file should stay compact and operation-focused.

It should not include:

- Full UI architecture
- CSS details
- Long file explanations
- Source file evidence
- Implementation-heavy details unless required for data safety

---

## MCP safety expectations

The generated `.buildfire/plugin.mcp.json` should be conservative.

It should clearly define:

- What data can be managed
- Where data is stored
- What fields exist
- Which fields are safe to update
- Which fields are dangerous
- Which fields are identity fields
- Which operations are allowed
- Which operations require confirmation
- Which operations are unsupported
- What examples are safe or unsafe

For destructive or risky actions, MCP should require human confirmation.

Examples of actions that should usually require confirmation:

- Removing records
- Bulk updates
- Bulk removes
- Changing identity fields
- Changing read-only/system-managed fields
- Schema changes
- Any operation with low confidence

---

## Naming standard

The standard metadata folder is:

```txt
.buildfire/
```

The standard metadata files are:

```txt
.buildfire/plugin.plan.json
.buildfire/plugin.index.json
.buildfire/plugin.mcp.json
```

Do not use `ai/` for new plugin metadata.

Older repositories may still have:

```txt
ai/
```

But new metadata should be generated under:

```txt
.buildfire/
```

---

## Workflow behavior

The reusable workflow:

1. Checks out the plugin repo.
2. Checks out this shared workflow repo.
3. Runs Codex using the shared metadata prompt.
4. Generates or updates `.buildfire/` metadata files.
5. Opens a pull request if files changed.

The workflow should not directly push to the default branch.

---

## Pull request behavior

If metadata changes are detected, the workflow creates a PR with the updated files.

The PR should include:

```txt
.buildfire/plugin.plan.json
.buildfire/plugin.index.json
.buildfire/plugin.mcp.json
```

Engineers should review the generated metadata before merging.

Review focus:

- Confirm the plugin purpose is accurate.
- Confirm datastore keys and schemas are correct.
- Confirm risky operations are marked correctly.
- Confirm MCP remove/update operations require confirmation where needed.
- Confirm no runtime source code was modified.

---

## Recommended reusable workflow name

```txt
.github/workflows/generate-buildfire-plugin-metadata.yml
```

Recommended prompt file name:

```txt
prompts/buildfire-plugin-metadata.prompt.md
```

---

## Example plugin repo workflow

```yaml
name: Generate BuildFire Plugin Metadata

on:
  workflow_dispatch:

jobs:
  generate:
    uses: BuildFire/github-workflows/.github/workflows/generate-buildfire-plugin-metadata.yml@main
    secrets: inherit
```

---

## Required organization secrets

### `PLUGIN_AI_METADATA_OPENAI_API_KEY`

OpenAI API key used by Codex to generate metadata.

### `PLUGIN_AI_METADATA_GH_TOKEN`

GitHub token used to checkout the private shared workflow repository.

Recommended permissions:

- Read access to `BuildFire/github-workflows`
- Minimum required repo access for workflow checkout

---

## Future support

Planned future workflows may include:

- Incremental BuildFire metadata updates
- Lightweight metadata generation
- Plugin QC test generation
- Playwright-based plugin validation
- MCP contract validation
- Plugin Studio compatibility checks
- Automated checks to confirm `.buildfire/plugin.mcp.json` is safe and compact
- Automated checks to confirm `.buildfire/plugin.plan.json` and `.buildfire/plugin.index.json` stay in sync
