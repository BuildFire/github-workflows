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

**The contract-check service does not exist yet.** Until it does, `../mock-service/server.js` stands in
for it. It runs *outside* GitHub — on your machine behind a tunnel, or on any host you point
`SERVICE_URL` at — exactly as the real service will. It clones the repo and reports which contract
files are missing, which is everything the real service does except generating the file contents, and
its clone/inspect functions are written to be lifted into the real service later.

The workflow itself never runs the mock. It only ever sends one HTTP request to whatever
`SERVICE_URL` names, so there is a single code path whether the far end is the mock or the real
service.

---

## How it works

The workflow does not inspect the plugin and does not open the pull request. It notifies the contract
service that a commit landed; the service reads the repo through the GitHub API, decides what the
contract files should be, and opens the PR under its own credentials.

1. POSTs a small trigger to `<SERVICE_URL>/check-contract` and expects a 2xx.
2. Done. A non-2xx or an unreachable service fails the run so it is visible; anything past that point
   is the service's responsibility.

That is the entire job — one request, one step. Because only a pointer is sent, the workflow checks
out nothing (not the plugin, not this repo) and needs no write permission anywhere;
`permissions: contents: read` is the whole requirement.

**The endpoint is not a caller input.** It is fixed in `SERVICE_URL` in the reusable workflow, so
every plugin repo points at the same service and moving it is a one-line change here. A plugin repo
cannot redirect the check at an arbitrary host, and there is no per-repo drift to chase.

To develop against a service on your own machine, change `SERVICE_URL` on a branch and point your test
repo's caller at that branch — see "Developing against a local service".

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
```

(The reusable workflow's filename is `generate-buildfire-plugin-metadata.yml` for historical reasons —
every plugin repo's caller references that exact path, so it stays put until every caller is updated
alongside a rename.)

That is the whole caller: no `with:` block. The endpoint is not a per-repo setting, so there is
nothing else to configure — the same file works in every plugin repo.

> **While `contract-check-v2` is unmerged**, `@main` does not have any of this. Point test callers at
> `@contract-check-v2` until it lands.

---

## Trigger contract (v0)

This is what the workflow sends. It is a starting point, not a settled spec — expect it to change once
the real service is designed, and update the workflow and `../mock-service/server.js` alongside it.

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
a PR — the same shape the mock already produces, so it is a way to exercise the real service's
credentials and generation logic without PR noise. The mock covers everything up to that point;
generating the file contents and opening the PR are the parts it cannot stand in for.

---

## Testing with the mock service

`../mock-service/server.js` has no dependencies (Node built-ins only), so it starts with a bare `node`
call — no `npm install` step. You run it yourself, on your machine or any host; the workflow never
starts it.

It walks the whole path:

```txt
trigger -> clone at the sha -> report which contract files are missing -> open a PR (OPEN_PR=true)
```

`cloneAtSha()` and `inspectContractFiles()` are written to be lifted straight into the real service —
shallow single-commit fetch, verification that `HEAD` is the commit the trigger named, root detection
(`.` then `src/`), and the five contract paths.

The PR step is **demo scaffolding**, off unless `OPEN_PR=true`. Two things keep it a stand-in rather
than the real thing:

- it uses whatever `GITHUB_TOKEN` you export, rather than credentials belonging to a service
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

```sh
node ../mock-service/server.js          # listens on :4300 (PORT to override, GITHUB_TOKEN to auth clones)
curl http://localhost:4300/health    # -> ok

curl -X POST http://localhost:4300/check-contract \
  -H 'Content-Type: application/json' \
  -d '{"repository":"BuildFire/chatPlugin","ref":"refs/heads/main","sha":"<a real sha>","event":"push"}'
```

```json
{
  "accepted": true,
  "repository": "BuildFire/workflowTester",
  "sha": "01b71f2...",
  "inspection": {
    "root": ".",
    "existing": ["widget/plugin.contract.json"],
    "missing": ["widget/plugin.contract.js", "control/plugin.contract.js", "..."],
    "fileCount": 5,
    "checkedOutSha": "01b71f2...",
    "shaMatchesTrigger": true,
    "pullRequest": { "url": "https://github.com/BuildFire/workflowTester/pull/2", "branch": "chore/update-plugin-contract" }
  }
}
```

`shaMatchesTrigger` is the one that matters when something looks wrong: a listing proves the clone
produced *something*, only this proves it produced the commit the trigger named.

`pullRequest` reports what actually happened — `{url, branch}` for a new PR,
`{updatedExisting: true, branch}` when the branch already had one open,
`{skipped: "nothing missing, no PR needed"}` when there was nothing to do, or `{error}`.
That third case matters: this fires on every push, so a merged contract PR must not immediately
trigger another one.

Verified against both layouts: `chatPlugin` and `workflowTester` resolve `root: "."`,
`freeTextQuestionnairePlugin` resolves `root: "src"`.

---

## Developing against a local service (ngrok)

The service always runs outside GitHub, so until a real one is hosted, "the service" is a process on
your machine. GitHub cannot reach your laptop directly, so expose it with a tunnel and point
`SERVICE_URL` at that URL — on a branch, since it is shared by every plugin repo.

```sh
# 1. configure once — local.env sits outside any repo, so the token is never committed
cp ../mock-service/local.env.example ../mock-service/local.env
$EDITOR ../mock-service/local.env           # set CONTRACT_SERVICE_TOKEN; GITHUB_TOKEN is optional

# 2. run the service                     (terminal 1)
../mock-service/run-local.sh

# 3. expose it                           (terminal 2)
ngrok http 4300                          # -> https://<something>.ngrok-free.app
```

`run-local.sh` loads `local.env`, defaults `OPEN_PR=true`, and — if you set no `GITHUB_TOKEN` — pulls
one from your git credential helper, on the reasoning that if you can already push to a repo you can
already clone it and open PRs against it. Anything you export yourself wins over the file.

Equivalent by hand, if you would rather not use the script:

```sh
export GITHUB_TOKEN=ghp_...              # PAT with Contents and Pull requests read/write
export CONTRACT_SERVICE_TOKEN=$(openssl rand -hex 16)
export OPEN_PR=true                      # omit to report findings without opening PRs
node ../mock-service/server.js
```

Then point the workflow at the tunnel. `SERVICE_URL` is shared by every plugin repo, so change it on a
branch rather than on `main`:

```sh
# 4. in this repo, on a working branch      (terminal 3)
git checkout -b local-service
sed -i '' "s|SERVICE_URL: .*|SERVICE_URL: 'https://<something>.ngrok-free.app'|" \
  .github/workflows/generate-buildfire-plugin-metadata.yml
git commit -am "Point at a local service" && git push -u origin local-service
```

and have your test repo's caller use that branch:

```yaml
    uses: BuildFire/github-workflows/.github/workflows/generate-buildfire-plugin-metadata.yml@local-service
```

Push to the test repo, and the trigger lands on your laptop with a real commit from a real repo — the
fastest loop for building the generation logic, since you can edit `stubFor()` and re-push without
touching CI. The tunnel URL changes every time ngrok restarts, so step 4 repeats each session; only
the branch reference in the caller stays put.

**Set `CONTRACT_SERVICE_TOKEN`.** A tunnelled endpoint that opens pull requests is callable by anyone who
learns the URL. The server enforces the bearer token whenever the variable is set, ignores it when unset
(so a purely local `curl` still works), and warns loudly at startup if it is exposed with
`OPEN_PR=true` and no token.

Note that `GITHUB_TOKEN` here is whatever PAT you export, so the clone falls back to your local git
credentials if you leave it unset.

---

## Secrets

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
├── prompts/
│   └── buildfire-plugin-metadata.prompt.md      retained; see "What's no longer part of this workflow"
└── README.md
```

The mock service is **not part of this repo**. It is a local development tool, and the workflow no
longer runs it, so it lives in a sibling directory that is never pushed here:

```txt
source/
├── github-workflows/        this repo
└── mock-service/            not tracked anywhere
    ├── server.js            stand-in service; you run it, the workflow does not
    ├── run-local.sh         one-command local runner (loads local.env)
    ├── local.env.example    copy to local.env
    └── local.env            your tokens — outside this public repo by design
```

Paths in this README are written relative to the repo root, so they start with `../`. Keeping the two
side by side is what those paths assume; move the mock elsewhere and adjust accordingly.
