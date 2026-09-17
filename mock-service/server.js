#!/usr/bin/env node
'use strict';

/**
 * Stand-in for the real contract-check service, which does not exist yet.
 *
 * It walks the whole path the real service will:
 *
 *   trigger -> clone the repo at the sha -> work out which contract files are missing -> open a PR
 *
 * cloneAtSha() and inspectContractFiles() are written to be lifted straight into the real service.
 *
 * The PR step is DEMO SCAFFOLDING and off by default — set OPEN_PR=true to enable it. It exists so the
 * full path can be seen working before the real service is built, and it writes obviously-fake
 * placeholder files. Two things make it a stand-in rather than the real thing: it borrows the CI
 * runner's token instead of carrying the service's own credentials, and it does not generate contract
 * files from the plugin's actual code — it emits the same placeholder every time.
 *
 * No dependencies (Node built-ins only), so the workflow can start it with a bare `node` — no npm
 * install step, no version drift from this repo's own package.json.
 *
 * Usage: node server.js
 *   PORT          override the default 4300
 *   GITHUB_TOKEN  authenticates the clone, and the PR when OPEN_PR is on
 *   OPEN_PR       "true" to open a pull request; anything else reports findings only
 * Endpoints: GET /health, POST /check-contract
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 4300;

// Shared secret the workflow sends as `Authorization: Bearer <token>`. Unset means anyone who can reach
// this can trigger it, which is fine on localhost inside a CI runner and NOT fine behind a public tunnel
// — see the startup warning below.
const EXPECTED_TOKEN = process.env.CONTRACT_SERVICE_TOKEN || '';

// what a trigger has to carry for the service to be able to act on it at all
const REQUIRED_FIELDS = ['repository', 'ref', 'sha', 'event'];

// The files a plugin needs, relative to whichever root holds widget/ and control/.
// plugin.contract.json is always required; the .js and contract.html are per side, and only for sides
// that declare function operations — which is why "missing" here is a report, not a verdict.
const CONTRACT_FILE_SUFFIXES = [
    'widget/plugin.contract.json',
    'widget/plugin.contract.js',
    'control/plugin.contract.js',
    'widget/contract.html',
    'control/contract.html'
];

// Most plugin repos keep widget/ and control/ at the root. Webpack-built ones (e.g.
// freeTextQuestionnairePlugin) only produce that layout as gitignored build output and keep the real
// source under src/ — so a fresh clone of those has nothing at the root. Check root first, then src/.
const ROOT_CANDIDATES = ['.', 'src'];

/**
 * Shallow-clone a single commit into targetDir. Lift-and-shift ready for the real service.
 *
 * Fetching the one sha rather than `git clone` keeps this to a single commit's worth of transfer, which
 * matters when this runs on every push across every plugin repo.
 *
 * The token goes into the remote URL, so the URL is never logged — only a redacted form.
 */
function cloneAtSha(options, callback) {
    const repository = options.repository;
    const sha = options.sha;
    const token = options.token;
    const targetDir = options.targetDir;

    const credentials = token ? 'x-access-token:' + token + '@' : '';
    const remoteUrl = 'https://' + credentials + 'github.com/' + repository + '.git';

    const steps = [
        { name: 'init', args: ['init', '-q', targetDir] },
        { name: 'remote add', args: ['-C', targetDir, 'remote', 'add', 'origin', remoteUrl] },
        { name: 'fetch', args: ['-C', targetDir, 'fetch', '-q', '--depth', '1', 'origin', sha] },
        { name: 'checkout', args: ['-C', targetDir, 'checkout', '-q', 'FETCH_HEAD'] }
    ];

    const runStep = (index) => {
        if (index >= steps.length) return callback(null);
        const step = steps[index];
        execFile('git', step.args, { timeout: 60000 }, (err, stdout, stderr) => {
            if (err) {
                // never echo the remote URL - it carries the token
                const detail = (stderr || err.message || '').split(remoteUrl).join('https://github.com/' + repository + '.git');
                return callback(new Error('git ' + step.name + ' failed: ' + detail.trim()));
            }
            runStep(index + 1);
        });
    };

    runStep(0);
}

/**
 * Decide which root holds the plugin source, then report which contract files are there and which are
 * not. Also lift-and-shift ready: this is the "what is missing" half of the service's job.
 */
function inspectContractFiles(repoDir) {
    const root = ROOT_CANDIDATES.find((candidate) =>
        fs.existsSync(path.join(repoDir, candidate, 'widget')) ||
        fs.existsSync(path.join(repoDir, candidate, 'control'))
    ) || ROOT_CANDIDATES[0];

    const existing = [];
    const missing = [];
    CONTRACT_FILE_SUFFIXES.forEach((suffix) => {
        const relPath = path.join(root, suffix);
        if (fs.existsSync(path.join(repoDir, relPath))) existing.push(relPath);
        else missing.push(relPath);
    });

    return { root: root, existing: existing, missing: missing };
}

// Placeholder bodies for whatever is absent. The real service generates these from the plugin's actual
// code; these are deliberately, visibly fake so a mock PR is never mistaken for a real contract.
function stubFor(relPath) {
    if (relPath.endsWith('plugin.contract.json')) {
        return JSON.stringify({
            description: 'MOCK — generated by github-workflows/mock-service, not a real contract.',
            operations: [{
                name: 'mockPing',
                displayName: 'Mock ping',
                type: 'function',
                context: { functionName: 'mockPing', host: ['widgetBackground'] },
                description: 'Placeholder operation proving the trigger -> clone -> PR path works.',
                parameters: {
                    callback: { type: 'function', required: true, description: 'Called with { pong }.' }
                }
            }]
        }, null, 2) + '\n';
    }
    if (relPath.endsWith('plugin.contract.js')) {
        const scope = relPath.indexOf('control/') === 0 || relPath.indexOf('/control/') > -1
            ? 'controlContract' : 'widgetContract';
        return '// MOCK — generated by github-workflows/mock-service, not a real contract.\n' +
            scope + ' = {\n' +
            '  mockPing: function (options, callback) {\n' +
            '    callback(null, { pong: true });\n' +
            '  }\n' +
            '};\n';
    }
    return '<!DOCTYPE html>\n' +
        '<!-- MOCK — generated by github-workflows/mock-service, not a real contract. -->\n' +
        '<html>\n<head>\n' +
        '  <script src="../../../scripts/buildfire.min.js"></script>\n' +
        '  <script src="../../../scripts/buildfire/services/contract/contract.js"></script>\n' +
        '  <script src="plugin.contract.js"></script>\n' +
        '</head>\n<body></body>\n</html>\n';
}

function githubApi(options, callback) {
    const body = options.body ? JSON.stringify(options.body) : null;
    const req = https.request({
        hostname: 'api.github.com',
        path: options.path,
        method: options.method,
        headers: Object.assign({
            'Authorization': 'Bearer ' + options.token,
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'buildfire-contract-check-mock',
            'X-GitHub-Api-Version': '2022-11-28'
        }, body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {})
    }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf8');
            let parsed = null;
            try { parsed = JSON.parse(text); } catch (e) { /* non-JSON error bodies are still useful raw */ }
            callback(null, { status: res.statusCode, body: parsed, raw: text });
        });
    });
    req.on('error', (err) => callback(err));
    if (body) req.write(body);
    req.end();
}

/**
 * DEMO ONLY. The real service does this under its own credentials; this exists so the whole path can be
 * seen working before that service is built. It writes obviously-fake placeholder files.
 *
 * Force-pushes a single fixed branch rather than opening a new one per commit, so re-running on every
 * push updates one PR instead of stacking duplicates — the idempotency rule the real service needs too.
 */
function openPullRequest(options, callback) {
    const repoDir = options.repoDir;
    const repository = options.repository;
    const token = options.token;
    const baseBranch = String(options.ref || '').replace(/^refs\/heads\//, '') || 'main';
    const headBranch = 'chore/update-plugin-contract';

    if (!token) return callback(null, { error: 'no GITHUB_TOKEN available to open a PR' });
    if (!options.missing.length) return callback(null, { skipped: 'nothing missing, no PR needed' });

    options.missing.forEach((relPath) => {
        const abs = path.join(repoDir, relPath);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, stubFor(relPath));
    });

    const remoteUrl = 'https://x-access-token:' + token + '@github.com/' + repository + '.git';
    const redact = (text) => String(text || '').split(remoteUrl).join('https://github.com/' + repository + '.git');

    const steps = [
        { name: 'checkout -b', args: ['-C', repoDir, 'checkout', '-q', '-B', headBranch] },
        { name: 'add', args: ['-C', repoDir, 'add', '-A'] },
        { name: 'commit', args: ['-C', repoDir,
            '-c', 'user.name=buildfire-contract-check[bot]',
            '-c', 'user.email=buildfire-contract-check[bot]@users.noreply.github.com',
            'commit', '-q', '-m', 'chore: add placeholder plugin contract files (mock)'] },
        { name: 'push', args: ['-C', repoDir, 'push', '-q', '--force', remoteUrl, 'HEAD:refs/heads/' + headBranch] }
    ];

    const runStep = (index) => {
        if (index >= steps.length) return createPr();
        execFile('git', steps[index].args, { timeout: 60000 }, (err, stdout, stderr) => {
            if (err) return callback(null, { error: 'git ' + steps[index].name + ' failed: ' + redact(stderr || err.message).trim() });
            runStep(index + 1);
        });
    };

    const createPr = () => {
        githubApi({
            token: token,
            method: 'POST',
            path: '/repos/' + repository + '/pulls',
            body: {
                title: 'chore: add placeholder plugin contract files (mock)',
                head: headBranch,
                base: baseBranch,
                body: 'Opened by the **bundled mock** contract-check service to prove the ' +
                      'trigger -> clone -> PR path.\n\nThe files here are placeholders, not a real ' +
                      'contract. The real service will generate these from the plugin\'s actual code.'
            }
        }, (err, res) => {
            if (err) return callback(null, { error: 'GitHub API unreachable: ' + err.message });
            if (res.status === 201) return callback(null, { url: res.body.html_url, branch: headBranch });
            // 422 with this message means the branch already has an open PR - the update was still pushed
            if (res.status === 422 && /already exists/i.test(res.raw)) {
                return callback(null, { updatedExisting: true, branch: headBranch });
            }
            callback(null, { error: 'could not open PR (HTTP ' + res.status + '): ' + redact(res.raw).slice(0, 300) });
        });
    };

    runStep(0);
}

function handleTrigger(trigger, callback) {
    let repoDir;
    try {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'contract-check-'));
    } catch (e) {
        return callback(null, { error: 'could not create a working directory: ' + e.message });
    }

    const cleanup = () => {
        try { fs.rmSync(repoDir, { recursive: true, force: true }); }
        catch (e) { /* a leftover temp dir is not worth failing over */ }
    };

    cloneAtSha({
        repository: trigger.repository,
        sha: trigger.sha,
        token: process.env.GITHUB_TOKEN,
        targetDir: repoDir
    }, (err) => {
        if (err) {
            cleanup();
            // Reported, not thrown: the workflow's job is delivering the trigger, and it did that. A
            // clone failure is the service's problem (usually credentials) and should not read as
            // "the workflow is broken".
            return callback(null, { error: err.message });
        }

        // What the clone actually produced. Without this the clone is invisible on success - you only
        // ever see it when it fails - so there is no way to tell a correct checkout from a lucky one.
        let fileCount = 0;
        try {
            const entries = fs.readdirSync(repoDir, { withFileTypes: true })
                .filter((entry) => entry.name !== '.git')
                .map((entry) => entry.isDirectory() ? entry.name + '/' : entry.name)
                .sort();
            const countFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true })
                .filter((entry) => entry.name !== '.git')
                .reduce((total, entry) => total + (entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1), 0);
            fileCount = countFiles(repoDir);
            console.log('mock-service: cloned ' + fileCount + ' files, top level: ' + entries.join(', '));
        } catch (e) {
            console.error('mock-service: could not list the checkout: ' + e.message);
        }

        let inspection;
        try {
            inspection = inspectContractFiles(repoDir);
        } catch (e) {
            cleanup();
            return callback(null, { error: 'could not inspect the checkout: ' + e.message });
        }
        inspection.fileCount = fileCount;

        // Prove the checkout is the commit that was asked for. A listing alone cannot distinguish the
        // right commit from a stale or wrong one, and every check after this is only meaningful if the
        // tree on disk is the tree the trigger named.
        execFile('git', ['-C', repoDir, 'rev-parse', 'HEAD'], (headErr, stdout) => {
            const head = String(stdout || '').trim();
            inspection.checkedOutSha = head || null;
            inspection.shaMatchesTrigger = head === trigger.sha;

            if (!head) {
                console.error('mock-service: could not read HEAD of the checkout');
            } else if (inspection.shaMatchesTrigger) {
                console.log('mock-service: checked out ' + head + ' - matches the triggering commit');
            } else {
                console.error('mock-service: MISMATCH - checked out ' + head + ' but the trigger named ' + trigger.sha);
            }

            afterInspection();
        });

        function afterInspection() {
            // OPEN_PR is off unless the workflow asks for it, so the default stays read-only.
            if (String(process.env.OPEN_PR).toLowerCase() !== 'true') {
                cleanup();
                return callback(null, inspection);
            }

            openPullRequest({
                repoDir: repoDir,
                repository: trigger.repository,
                ref: trigger.ref,
                token: process.env.GITHUB_TOKEN,
                missing: inspection.missing
            }, (prErr, pullRequest) => {
                cleanup();
                inspection.pullRequest = pullRequest;
                callback(null, inspection);
            });
        }
    });
}

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
        return;
    }

    if (req.method === 'POST' && req.url === '/check-contract') {
        // Only enforced when a token is configured, so the in-runner localhost path keeps working
        // without one. Behind a tunnel, set CONTRACT_SERVICE_TOKEN and the matching repo secret.
        if (EXPECTED_TOKEN) {
            const provided = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
            if (provided !== EXPECTED_TOKEN) {
                console.error('mock-service: rejected a request with a missing or wrong bearer token');
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'unauthorized' }));
                return;
            }
        }

        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');

            let trigger;
            try {
                trigger = JSON.parse(body);
            } catch (e) {
                console.error('mock-service: trigger was not valid JSON:', body);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'invalid JSON' }));
                return;
            }

            // Reject an incomplete trigger rather than accepting it: the workflow fails on non-2xx, so
            // a payload that lost a field fails the run instead of looking like it worked.
            const missingFields = REQUIRED_FIELDS.filter((field) => !trigger[field]);
            if (missingFields.length) {
                console.error('mock-service: trigger missing ' + missingFields.join(', ') + ':', trigger);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'missing fields', missing: missingFields }));
                return;
            }

            console.log('mock-service: accepted trigger for ' + trigger.repository + '@' + trigger.sha +
                ' (' + trigger.event + ' on ' + trigger.ref + ')');

            handleTrigger(trigger, (err, inspection) => {
                if (inspection && inspection.error) {
                    console.error('mock-service: could not inspect the repo: ' + inspection.error);
                } else {
                    console.log('mock-service: source root "' + inspection.root + '"');
                    console.log('mock-service: present -> ' + (inspection.existing.length ? inspection.existing.join(', ') : '(none)'));
                    console.log('mock-service: absent  -> ' + (inspection.missing.length ? inspection.missing.join(', ') : '(none)'));

                    const pr = inspection.pullRequest;
                    if (!pr) {
                        console.log('mock-service: OPEN_PR is off - a real service would open a PR here.');
                    } else if (pr.url) {
                        console.log('mock-service: opened PR ' + pr.url + ' (branch ' + pr.branch + ')');
                    } else if (pr.updatedExisting) {
                        console.log('mock-service: branch ' + pr.branch + ' already has an open PR; pushed the update to it.');
                    } else if (pr.skipped) {
                        console.log('mock-service: no PR needed - ' + pr.skipped);
                    } else if (pr.error) {
                        console.error('mock-service: could not open a PR: ' + pr.error);
                    }
                }

                res.writeHead(202, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    accepted: true,
                    repository: trigger.repository,
                    sha: trigger.sha,
                    inspection: inspection
                }));
            });
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('not found');
});

server.listen(PORT, () => {
    console.log('mock contract-check service listening on http://localhost:' + PORT);
    console.log('  clone auth : ' + (process.env.GITHUB_TOKEN ? 'GITHUB_TOKEN set' : 'none (falls back to your git credentials)'));
    console.log('  open PRs   : ' + (String(process.env.OPEN_PR).toLowerCase() === 'true' ? 'yes (OPEN_PR=true)' : 'no'));
    console.log('  caller auth: ' + (EXPECTED_TOKEN ? 'bearer token required' : 'NONE - anyone who can reach this can trigger it'));

    if (!EXPECTED_TOKEN && String(process.env.OPEN_PR).toLowerCase() === 'true') {
        console.warn('  WARNING: this will open pull requests for anyone who can reach it, and no token');
        console.warn('           is set. Fine on localhost; if you are exposing this through a tunnel,');
        console.warn('           set CONTRACT_SERVICE_TOKEN here and as the repo/org secret of the same name.');
    }
});
