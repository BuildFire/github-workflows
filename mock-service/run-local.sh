#!/usr/bin/env bash
#
# Runs the mock contract-check service for local development, the way the real Plugin Studio service
# would run: a long-lived process that receives triggers, clones, inspects, and opens PRs.
#
# Pair it with a tunnel so GitHub can reach it:
#
#   ./mock-service/run-local.sh          # terminal 1
#   ngrok http 4300                      # terminal 2
#
# then set the plugin repo's caller to `service_url: 'https://<id>.ngrok-free.app'`.
#
# Reads the GitHub token from your git credential helper rather than asking for a PAT — if you can
# already `git push` to the repo, you can already clone it and open PRs against it. Override by
# exporting GITHUB_TOKEN yourself.
#
# Env:
#   GITHUB_TOKEN            override the credential-helper token
#   CONTRACT_SERVICE_TOKEN  require this as `Authorization: Bearer` (set it when tunnelling)
#   OPEN_PR                 "true" (default here) to open PRs, anything else to only report findings
#   PORT                    default 4300

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Local overrides, if present. Gitignored — this repo is public, so a token must never be tracked.
# Anything already exported wins, so a one-off `GITHUB_TOKEN=... ./run-local.sh` still overrides the file.
if [ -f "$SCRIPT_DIR/local.env" ]; then
    echo "loading $SCRIPT_DIR/local.env"
    while IFS= read -r line || [ -n "$line" ]; do
        case "$line" in
            ''|'#'*) continue ;;
        esac
        key="${line%%=*}"
        value="${line#*=}"
        [ -z "$key" ] && continue
        [ -z "$value" ] && continue
        # only set what the caller has not already exported
        if [ -z "$(eval "printf '%s' \"\${$key:-}\"")" ]; then
            export "$key=$value"
        fi
    done < "$SCRIPT_DIR/local.env"
fi

if [ -z "${GITHUB_TOKEN:-}" ]; then
    # `git credential fill` prints `password=<token>` for the host; never echo the value itself
    GITHUB_TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill 2>/dev/null | sed -n 's/^password=//p')
    if [ -n "$GITHUB_TOKEN" ]; then
        echo "using the GitHub token from your credential helper"
    else
        echo "no stored GitHub credential found and GITHUB_TOKEN is not set."
        echo "the clone will fall back to git's own auth and opening PRs will fail."
    fi
fi
export GITHUB_TOKEN

export OPEN_PR="${OPEN_PR:-true}"

if [ -z "${CONTRACT_SERVICE_TOKEN:-}" ] && [ "$OPEN_PR" = "true" ]; then
    echo
    echo "note: CONTRACT_SERVICE_TOKEN is unset, so any caller that reaches this can open PRs."
    echo "      fine on localhost; set it (and the matching repo secret) before tunnelling."
    echo
fi

exec node "$SCRIPT_DIR/server.js"
