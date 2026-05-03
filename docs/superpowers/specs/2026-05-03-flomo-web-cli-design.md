# flomo-web-cli Design

Date: 2026-05-03

## Context

`flomo-web-cli` is a new third-party command line tool for flomo. It references the sibling `flomo-web-mcp` project but ships as an independent Node.js package. The reference project already provides the flomo Web session approach, including read/write clients, memo parsers, tag handling, environment loading, error mapping, and tests.

This CLI is not an official flomo project. It depends on flomo Web internal endpoints and user-provided web session credentials, so the implementation must make those risks clear in README and error output.

## Goals

- Provide a globally installable CLI command named `flomo-web`.
- Support both human terminal usage and script automation.
- Match the first-version capability set of `flomo-web-mcp`: list, search, sync, get, create.
- Support persistent user configuration as a fallback to CLI options, environment variables, and `.env`.
- Persist the `sync` result to a local cache file so `search --scope all` and `get --scope all` work across CLI invocations.
- Keep sensitive values out of normal output, logs, repository files, and config display commands.

## Non-Goals

- No interactive TUI.
- No background daemon.
- No automatic cache refresh.
- No official flomo API compatibility guarantee.
- No dependency on the sibling `flomo-web-mcp` project at runtime.
- No storage of real credentials in the project directory.

## Package Shape

The package uses Node.js 20 and TypeScript. It is published as an independent npm package with this executable:

```text
flomo-web
```

The package should include:

```text
package.json
tsconfig.json
src/**
tests/**
.env.example
README.md
LICENSE
CHANGELOG.md
docs/superpowers/specs/2026-05-03-flomo-web-cli-design.md
```

## Architecture

The implementation should use a layered CLI structure:

```text
src/
  index.ts
  cli/
    parser.ts
    run.ts
  commands/
    list.ts
    search.ts
    sync.ts
    get.ts
    create.ts
    config.ts
  core/
    clients/
    parsers/
    models/
    types/
    errors.ts
  config/
    env.ts
    userConfig.ts
    resolvedConfig.ts
  cache/
    noteCache.ts
  formatters/
    human.ts
    json.ts
  utils/
    stdin.ts
    filesystem.ts
```

Responsibilities:

- `core` owns flomo Web HTTP behavior, memo parsing, tag parsing, business types, and public errors.
- `commands` translate parsed CLI input into core/cache/config calls.
- `config` loads and merges runtime settings from CLI options, process env, `.env`, user config, and defaults.
- `cache` persists synced memo data and validates cache schema versions.
- `formatters` convert command results into human-readable text or stable JSON.
- `cli` owns argument parsing, command dispatch, exit codes, and the common error boundary.

Code from `flomo-web-mcp` should be moved into this package as local source, not imported from the sibling folder. The main pieces to adapt are `FlomoHttpClient`, `BearerFlomoReadClient`, `BearerFlomoWriteClient`, memo and tag parsers, config defaults, and error mapping.

The MCP in-memory sync cache should not be copied as-is. In the CLI, `sync` should fetch pages through the read client and then write the cache through `cache/noteCache.ts`.

## Commands

### list

```text
flomo-web list [--limit 20] [--json]
```

Lists recent memos. Human output shows `createdAt`, `slug`, tags, and a content summary. JSON output returns a stable object with `ok`, `items`, and `scope`.

### search

```text
flomo-web search <query> [--limit 20] [--scope recent|all] [--json]
```

Searches recent memos by default. With `--scope all`, it searches the persistent sync cache. If the all-notes cache does not exist, the command fails with a clear message instructing the user to run `flomo-web sync`.

### sync

```text
flomo-web sync [--page-size 200] [--max-pages 50] [--json]
```

Synchronizes memos page by page and writes the persistent cache. Human output shows only statistics and cache status, not all memo bodies. If `complete` is false, output should explain that more memos may remain beyond the configured page limit.

### get

```text
flomo-web get <slug> [--scope recent|all] [--json]
```

Fetches a single memo by slug from recent memos by default. With `--scope all`, it reads from the persistent sync cache. If no memo matches, human output says so briefly and JSON output returns `memo: null`.

### create

```text
flomo-web create <content...> [--tag tag]... [--stdin] [--json]
```

Creates a new memo. It supports direct arguments and stdin:

```text
flomo-web create "today note #log"
"long content" | flomo-web create --stdin
```

`--tag` values are normalized by the same tag rules as the reference MCP project and appended to the created memo content through the existing HTML formatting behavior. On success, human output shows the created slug, URL, and summary.

### config

```text
flomo-web config set <key> <value>
flomo-web config get <key>
flomo-web config unset <key>
flomo-web config list
```

Allowed keys are a whitelist, including:

```text
authorization
cookie
userAgent
baseUrl
webBaseUrl
timezone
requestTimeoutMs
readEndpoint
syncEndpoint
writeEndpoint
deviceId
deviceModel
webPlatform
```

Sensitive keys such as `authorization` and `cookie` must be masked in `config get` and `config list` unless a later design explicitly adds a safe reveal flag.

## Output Contract

Human output is the default. It should be concise, stable enough for people to scan, and avoid printing full synchronized note bodies unless a command specifically asks for one memo.

All data commands support `--json`. JSON output should be a single JSON object written to stdout. Expected shape:

```json
{
  "ok": true,
  "items": [],
  "scope": {
    "source": "recent_notes",
    "complete": false
  }
}
```

Errors should write to stderr. JSON mode errors should also use a stable object:

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "..."
  }
}
```

## Configuration

Configuration precedence:

```text
CLI options > process env / .env > user config > defaults
```

The CLI should load `.env` from the current project directory when present. User config is stored outside the project directory.

On Windows, use:

```text
%APPDATA%\flomo-web-cli\config.json
```

On other platforms, use the platform-appropriate user config directory. If no config directory helper is added, implement a small filesystem utility that follows common environment variables such as `XDG_CONFIG_HOME` on Linux and `HOME/Library/Application Support` on macOS.

The config file stores only whitelisted keys. Missing optional values fall back to defaults compatible with `flomo-web-mcp`, including:

```text
FLOMO_BASE_URL=https://flomoapp.com
FLOMO_WEB_BASE_URL=https://v.flomoapp.com
FLOMO_TIMEZONE=Asia/Shanghai
FLOMO_REQUEST_TIMEOUT_MS=30000
FLOMO_USER_AGENT=Mozilla/5.0
```

At least `authorization` is required for commands that call flomo Web.

## Cache

The persistent cache stores `sync` results in a user cache directory. On Windows, use:

```text
%LOCALAPPDATA%\flomo-web-cli\cache\notes.json
```

The cache file contains memo content and should be treated as private user data. README must warn users not to commit, upload, or share the cache file.

Cache schema:

```json
{
  "version": 1,
  "syncedAt": "2026-05-03T00:00:00.000Z",
  "complete": true,
  "nextCursor": null,
  "items": []
}
```

The cache reader should reject unknown or unsupported versions with a clear error. It should also distinguish between "cache missing" and "cache invalid".

## Security

- Never print raw `authorization`, `cookie`, or token-like values in normal output.
- Mask sensitive config values in `config get` and `config list`.
- Do not write real credentials to `.env.example`, README examples, tests, or committed files.
- Do not include memo contents in logs.
- Keep request errors public and actionable without dumping headers or raw responses.
- Document that this is a third-party local tool based on flomo Web internal endpoints.

## Error Mapping

The CLI should preserve public error codes from the reference project:

```text
AUTH_EXPIRED
BAD_REQUEST
SIGN_INVALID
PARSER_FAILED
RATE_LIMITED
REQUEST_TIMEOUT
REMOTE_CHANGED
UNKNOWN
```

Command behavior:

- `AUTH_EXPIRED`: tell the user to refresh `Authorization`.
- `SIGN_INVALID`: explain that flomo Web signing or internal endpoints may have changed.
- `REQUEST_TIMEOUT`: mention timeout and retry.
- `PARSER_FAILED`: mention that response structure may have changed.
- `RATE_LIMITED`: ask the user to retry later.
- `BAD_REQUEST`: show input or configuration problem.
- `REMOTE_CHANGED`: say the request failed or flomo Web internals may have changed.

## Testing

Use focused tests rather than live flomo integration tests by default.

Core tests:

- memo parser and tag parser
- create content HTML formatting
- read/write client request construction
- HTTP status and business error mapping
- search filtering and limit bounds

Config/cache tests:

- env, `.env`, user config, defaults, and CLI override merge order
- sensitive field masking
- config whitelist validation
- cache read/write
- cache missing, invalid, and unsupported version errors

Command tests:

- human output for each command
- `--json` output for each command
- stdin create
- exit code and stderr behavior on errors

Verification commands:

```text
npm run typecheck
npm test
npm run build
node dist/index.js --help
node dist/index.js list --help
```

## Acceptance Criteria

- `npm run typecheck`, `npm test`, and `npm run build` pass.
- `node dist/index.js --help` and command help pages work.
- `flomo-web` is the configured bin name.
- `list`, `search`, `sync`, `get`, `create`, and `config` are implemented.
- All data commands support `--json`.
- `sync` writes a persistent cache, and `search --scope all` / `get --scope all` read it.
- Missing all-notes cache gives a clear instruction to run `flomo-web sync`.
- Sensitive credentials are masked in config display and absent from tests/docs examples.
- README documents setup, credential capture, commands, risks, cache location, and security notes.
