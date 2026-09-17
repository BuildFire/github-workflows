# BuildFire GitHub Workflows

Shared GitHub Actions workflows for BuildFire repositories, so each plugin repo only needs a small
caller file rather than its own copy of the automation.

---

## What this repo supports today

### Plugin contract check

On every push to a plugin repo's default branch (`main` or `master` — BuildFire repos use both), this
workflow tells the contract service that a commit landed. The service then checks whether the plugin
has the contract files it should (`widget/plugin.contract.json`, and `plugin.contract.js`/`contract.html`
for whichever sides declare function operations — see
[Plugin Contract](https://sdk.buildfire.com/docs/plugin-contract)), and if something is missing or out
of date it opens a pull request itself. Nothing is pushed directly to the default branch.

The split matters: **the service does the work, the workflow only triggers it.** The workflow never
reads the plugin's files and never opens a PR, so it needs no write access to the repo — the service
carries its own GitHub credentials.

**The contract-check service does not exist yet.** Until it does, every plugin repo runs against a
small mock bundled in this repo (`mock-service/`). It clones the repo and reports which contract files
are missing — everything the real service does except opening the PR — so the flow is verifiable now,
and its clone/inspect functions are written to be lifted into the real service later.

---

## How it works

The workflow does not inspect the plugin and does not open the pull request. It notifies the contract
service that a commit landed; the service reads the repo through the GitHub API, decides what the
contract files should be, and opens the PR under its own credentials.

1. If the caller left `service_url` empty, starts the bundled mock service on `localhost:4300`.
2. POSTs a small trigger to `<service_url>/check-contract` and expects a 2xx.
3. Done. A non-2xx or an unreachable service fails the run so it is visible; anything past that point
   is the service's responsibility.

Because only a pointer is sent, the workflow never checks out the plugin repo and needs no write
permission on it — `permissions: contents: read` is the whole requirement.

---

## Adding this to a plugin repo

```txt
.github/workflows/check-plugin-contract.yml
```

```yaml
name: Check Plugin Contract

on:
  push:
    # BuildFire plugin repos are split between the two: chatPlugin is on main, communityWall and
    # freeTextQuestionnairePlugin are on master. Listing both means one caller file works everywhere;
    # a repo only has one of them, so this does not double-fire.
    branches: [main, master]
  workflow_dispatch:

jobs:
  check-contract:
    uses: BuildFire/github-workflows/.github/workflows/generate-buildfire-plugin-metadata.yml@main
    secrets: inherit
    with:
      # Leave empty to use the bundled mock until a real service exists. Set this once it does.
      service_url: ''
```

(The reusable workflow's filename is `generate-buildfire-plugin-metadata.yml` for historical reasons —
every plugin repo's caller references that exact path, so it stays put until every caller is updated
alongside a rename.)

---

## Trigger contract (v0)

This is what the workflow sends. It is a starting point, not a settled spec — expect it to change once
the real service is designed, and update the workflow and `mock-service/server.js` alongside it.

**Request** (`POST /check-contract`):

```json
{
  "repository": "BuildFire/chatPlugin",
  "ref": "refs/heads/main",
  "sha": "a1b2c3d4e5f6",
  "event": "push"
}
```

All four fields are required; the mock rejects a trigger missing any of them with a 400, so a payload
that loses a field fails the run rather than looking like it worked.

If `CONTRACT_SERVICE_TOKEN` is set, it is sent as `Authorization: Bearer <token>`. It is optional so the
mock path works without one, but a real endpoint that opens pull requests on demand should not be
callable by anyone who knows the URL.

**Response:** any 2xx means accepted (the mock returns `202` with `{accepted, repository, sha}`). The
workflow does not wait for the service to finish generating files or opening the PR.

---

## What the service is expected to do

Not built yet — this is the side of the contract whoever writes the service picks up. The trigger only
says *which commit landed where*, so everything below happens server-side:

1. **Get the files.** Clone the repo at `sha` (or read it through the GitHub Contents API). Note the
   layout varies: most plugins keep `widget/` and `control/` at the repo root, but webpack-built ones
   (e.g. `freeTextQuestionnairePlugin`) only produce that as gitignored build output and keep the real
   source under `src/widget` / `src/control`. Check root first, then `src/`.
2. **Work out what is missing.** `widget/plugin.contract.json` always; `plugin.contract.js` and
   `contract.html` per side, for whichever sides declare function operations. See
   [Plugin Contract](https://sdk.buildfire.com/docs/plugin-contract).
3. **Open a PR** with the files it generated, against the branch in `ref`. If nothing needs changing,
   do nothing — no empty PRs.

**Credentials.** This is the part the workflow deliberately does not hold: the service needs its own
GitHub App or PAT with `contents: write` and `pull_requests: write` on the plugin repos. The workflow
runs with `contents: read` and cannot open a PR even if it wanted to.

**Idempotency.** A push to the same branch fires again on every commit, so re-triggering must not stack
duplicate PRs — reuse one branch per repo (the old workflow used `chore/update-plugin-contract`) and
update it rather than opening a second.

**Worth having:** a dry-run mode that reads the repo and reports what it *would* change without opening
a PR — the same shape the bundled mock already produces, so it is a way to exercise the real service's
credentials and generation logic without PR noise. The mock covers everything up to that point;
generating the file contents and opening the PR are the parts it cannot stand in for.

---

## Testing with the mock service

`mock-service/server.js` has no dependencies (Node built-ins only), so the workflow starts it with a
bare `node` call — no `npm install` step.

It walks the whole path:

```txt
trigger -> clone at the sha -> report which contract files are missing -> open a PR (OPEN_PR=true)
```

`cloneAtSha()` and `inspectContractFiles()` are written to be lifted straight into the real service —
shallow single-commit fetch, verification that `HEAD` is the commit the trigger named, root detection
(`.` then `src/`), and the five contract paths.

The PR step is **demo scaffolding**, off unless `OPEN_PR=true`. Two things keep it a stand-in rather
than the real thing:

- it borrows the CI runner's token instead of carrying the service's own credentials
- **it does not generate anything from the plugin's code.** `stubFor()` branches on the *filename*
  alone and returns the same placeholder every time, stamped `MOCK — ... not a real contract`. That
  function is the seam where real generation slots in; its signature gives it away, since a path is not
  enough to describe what a plugin exposes.

What is genuinely exercised: the clone, layout detection, working out which files are absent, widget vs
control, branching, committing, pushing, and opening or updating the PR. Re-running force-pushes the
same branch rather than stacking duplicates — the idempotency rule the real service needs too.

A clone failure is reported in the response rather than returned as a non-2xx. Delivering the trigger
is the workflow's job and it succeeded; a clone failure is the service's problem (usually credentials)
and should not read as "the workflow is broken".

A clone failure is reported in the response rather than returned as a non-2xx. Delivering the trigger
is the workflow's job and it succeeded; a clone failure is the service's problem (usually credentials)
and should not read as "the workflow is broken".

```sh
node mock-service/server.js          # listens on :4300 (PORT to override, GITHUB_TOKEN to auth clones)
curl http://localhost:4300/health    # -> ok

curl -X POST http://localhost:4300/check-contract \
  -H 'Content-Type: application/json' \
  -d '{"repository":"BuildFire/chatPlugin","ref":"refs/heads/main","sha":"<a real sha>","event":"push"}'
```

```json
{
  "accepted": true,
  "repository": "BuildFire/chatPlugin",
  "sha": "3bab761e",
  "inspection": {
    "root": ".",
    "existing": [],
    "missing": ["widget/plugin.contract.json", "widget/plugin.contract.js", "..."]
  }
}
```

Verified against both layouts: `chatPlugin` resolves `root: "."`, `freeTextQuestionnairePlugin`
resolves `root: "src"`.

---

## Developing against a local service (ngrok)

The bundled mock runs *inside* the runner, so GitHub never reaches your machine. To iterate on the real
service locally instead, expose your machine and point `service_url` at it — the workflow then skips the
bundled mock entirely and never checks this repo out.

```sh
# 1. run the service locally, with a token so it can clone and open PRs
export GITHUB_TOKEN=ghp_...              # PAT with repo access
export CONTRACT_SERVICE_TOKEN=$(openssl rand -hex 16)
export OPEN_PR=true                      # omit to report findings without opening PRs
node mock-service/server.js

# 2. expose it
ngrok http 4300                          # -> https://<something>.ngrok-free.app
```

Then in the plugin repo: add `CONTRACT_SERVICE_TOKEN` as a repo secret with the same value, and set the
caller's input:

```yaml
    with:
      service_url: 'https://<something>.ngrok-free.app'
```

Push, and the trigger lands on your laptop with a real commit from a real repo — the fastest loop for
building the generation logic, since you can edit `stubFor()` and re-push without touching CI.

**Set `CONTRACT_SERVICE_TOKEN`.** A tunnelled endpoint that opens pull requests is callable by anyone who
learns the URL. The server enforces the bearer token whenever the variable is set, ignores it when unset
(so the in-runner localhost path still works), and warns loudly at startup if it is exposed with
`OPEN_PR=true` and no token.

Two things differ from the in-runner path: the health check and log-dump steps are skipped, since they
only apply to the bundled mock; and `GITHUB_TOKEN` is whatever PAT you export rather than the runner's
scoped token, so the clone falls back to your local git credentials if you leave it unset.

---

## Secrets

### `PLUGIN_AI_METADATA_GH_TOKEN` (optional)

Only used to check out this repo for the bundled mock service. The real-service path checks out nothing,
so once `service_url` is set this is not needed at all. Named from the old Codex-based flow this
replaced — kept as-is so every plugin repo's `secrets: inherit` keeps working without an org-secret
rename.

### `CONTRACT_SERVICE_TOKEN` (optional)

Sent as `Authorization: Bearer <token>` when present, so the service can verify the caller. Worth
setting before the real service goes live.

The old `PLUGIN_AI_METADATA_OPENAI_API_KEY` secret is no longer used by this workflow and can be left
alone or removed at the org level independently.

---

## What's no longer part of this workflow

The previous version of this repo generated three AI-inferred files
(`.buildfire/plugin.plan.json`, `.buildfire/plugin.index.json`, `.buildfire/plugin.mcp.json`) by
running Codex inline in the Action, driven by `prompts/buildfire-plugin-metadata.prompt.md`.

That prompt file is kept for now — it may be a useful starting point for whoever builds the real
contract-check service, since much of its "read the plugin deeply, don't invent behavior, prefer
omission over hallucination" guidance still applies. It is no longer read by this workflow directly.

`.buildfire/*.json` and `plugin.contract.json` describe overlapping things (a plugin's data
operations and their safety). Worth deciding, before building the real service, whether both should
keep existing or whether the contract-check service should be the one source of truth.

---

## Repo structure

```txt
BuildFire/github-workflows
├── .github/workflows/
│   └── generate-buildfire-plugin-metadata.yml   the reusable workflow
├── mock-service/
│   └── server.js                                 stand-in service for testing
├── prompts/
│   └── buildfire-plugin-metadata.prompt.md       retained; see "What's no longer part of this workflow"
└── README.md
```
