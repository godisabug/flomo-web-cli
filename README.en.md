# flomo-web-cli

[中文](README.md) | English

Read and write your flomo memos from the terminal: list, search, get, randomly roam, and create memos, and sync every memo into a local cache for full-archive search. It uses your own flomo Web session. Output is human-readable by default; add `--json` for scripts.

<!-- shared: kept identical in flomo-web-cli and flomo-web-mcp; update both -->

> This is not an official flomo project. It relies on flomo Web internal endpoints and your own session credentials, which may change at any time. Run it only in local environments you trust.

<!-- /shared -->

## Quick Start

```bash
npm install -g flomo-web-cli
flomo-web config set authorization "Bearer your-token-here"
flomo-web list --limit 5
```

See [Getting Authorization](#getting-authorization) for how to get the `Authorization` value.

## Features

- List recent memos, search by keyword, get a memo by `slug`, randomly roam, and create memos.
- `flomo-web sync` writes every memo into a persistent local cache; then use `--scope all` for full-archive search or lookup, and `random --no-sync` to pick offline.
- Human-readable output by default; `--json` prints structured results for scripts.
- Credentials can come from user config, `.env`, environment variables, or a per-command flag.

## Requirements

<!-- shared: kept identical in flomo-web-cli and flomo-web-mcp; update both -->

- Node.js 20.19.0 or newer (ships with npm / npx). Node.js 20 reached end-of-life in April 2026, and **0.3.0 will require Node.js 22.12 or newer**; running on Node.js 20 prints an upgrade notice.
- Your own flomo Web session `Authorization` value; see [Getting Authorization](#getting-authorization). flomo Pro is not required.

<!-- /shared -->

## Install

### From npm (recommended)

```bash
npm install -g flomo-web-cli
flomo-web --help
```

Upgrade to the latest version:

```bash
npm install -g flomo-web-cli@latest
```

### Latest code from GitHub

```bash
npm install -g github:godisabug/flomo-web-cli
```

### Current source/local development

```bash
git clone https://github.com/godisabug/flomo-web-cli.git
cd flomo-web-cli
npm install
npm run build
node dist/index.js --help
```

Use `npm link` to register the global `flomo-web` command, and `npm run verify` to run the full local verification chain.

## Configure

Configuration sources, from highest to lowest priority: the per-command `--authorization` flag, environment variables and `.env` in the current directory, then user config.

The most common setup stores the credential in user config:

```bash
flomo-web config set authorization "Bearer your-token-here"
flomo-web config set timezone Asia/Shanghai
```

Sensitive values such as `authorization` and `cookie` are masked when displayed:

```bash
flomo-web config list
flomo-web config get authorization
```

Default user config paths:

```text
Windows: %APPDATA%\flomo-web-cli\config.json
macOS: ~/Library/Application Support/flomo-web-cli/config.json
Linux: ${XDG_CONFIG_HOME:-~/.config}/flomo-web-cli/config.json
```

### Environment Variables

<!-- shared: kept identical in flomo-web-cli and flomo-web-mcp; update both -->

| Variable | Default | Description |
| --- | --- | --- |
| `FLOMO_AUTHORIZATION` | none | **Required.** The `Authorization` value from flomo Web requests, e.g. `Bearer ...`. |
| `FLOMO_COOKIE` | none | flomo Web cookie; only needed if the endpoints require it. |
| `FLOMO_TIMEZONE` | `Asia/Shanghai` | IANA timezone used to interpret flomo timestamps and to date new memos. |
| `FLOMO_REQUEST_TIMEOUT_MS` | `30000` | Per-request timeout in milliseconds. |
| `FLOMO_USER_AGENT` | `Mozilla/5.0` | User-Agent sent with requests. |
| `FLOMO_BASE_URL` | `https://flomoapp.com` | flomo API base URL. |
| `FLOMO_WEB_BASE_URL` | `https://v.flomoapp.com` | flomo Web base URL, used for request headers and memo links. |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error`. |
| `FLOMO_DEVICE_ID` | random per start | Advanced: device ID request header. |
| `FLOMO_DEVICE_MODEL` | `Other` | Advanced: device model request header. |
| `FLOMO_WEB_PLATFORM` | `Web` | Advanced: platform request header. |
| `FLOMO_READ_ENDPOINT` | built-in path | Advanced: override if flomo's internal read endpoint changes. |
| `FLOMO_SYNC_ENDPOINT` | built-in path | Advanced: override if flomo's internal sync endpoint changes. |
| `FLOMO_WRITE_ENDPOINT` | built-in path | Advanced: override if flomo's internal write endpoint changes. |

<!-- /shared -->

Every variable can also be stored in user config under its camelCase key; for example, `FLOMO_REQUEST_TIMEOUT_MS` maps to `flomo-web config set requestTimeoutMs 60000`. See [.env.example](.env.example) for a full example.

## Commands

| Command | Description |
| --- | --- |
| `flomo-web list` | List recent memos, newest first. |
| `flomo-web search <keyword>` | Search recent memos; add `--scope all` to search every memo in the local cache. |
| `flomo-web get <slug>` | Show one memo; add `--scope all` to look it up in the local cache. |
| `flomo-web sync` | Sync every memo into the local cache. |
| `flomo-web random` | Show one random memo, optionally filtered by tag. |
| `flomo-web create <content>` | Create a memo. |
| `flomo-web config` | View and change user config. |

Data commands accept `--authorization <value>` to override the configured credential for that invocation, and support `--json`.

```bash
flomo-web list --limit 20
flomo-web list --authorization "Bearer your-token-here"
flomo-web list --json
```

```bash
flomo-web search "keyword" --limit 20
flomo-web search "keyword" --scope all
flomo-web search "keyword" --json
```

```bash
flomo-web sync --page-size 200 --max-pages 50
flomo-web sync --json
```

```bash
flomo-web get memo-slug
flomo-web get memo-slug --scope all
flomo-web get memo-slug --json
```

```bash
flomo-web random
flomo-web random --no-sync
flomo-web random --tag work --tag idea
flomo-web random --exclude-tag private
flomo-web random --json
```

```bash
flomo-web create "memo content #tag"
echo "memo content" | flomo-web create --stdin
flomo-web create "memo content" --tag work --tag daily
flomo-web create "memo content" --json
```

```bash
flomo-web config set authorization "Bearer your-token-here"
flomo-web config get authorization
flomo-web config unset cookie
flomo-web config list
```

### JSON Output

With `--json`, results are written to stdout as one JSON object. Errors are written to stderr:

```json
{
  "ok": false,
  "error": {
    "code": "AUTH_EXPIRED",
    "message": "..."
  }
}
```

## Cache

`flomo-web sync` writes a persistent local cache, which `search --scope all`, `get --scope all`, and `random --no-sync` read from. The cache does not update itself; run `flomo-web sync` again when you need fresh data.

`flomo-web random` tries to refresh memos first by default; if refresh fails and a valid local cache exists, it selects from the cache and prints a warning. For custom sync pagination, run `flomo-web sync --page-size 200 --max-pages 50` first, then run `flomo-web random --no-sync`.

Default cache paths:

```text
Windows: %LOCALAPPDATA%\flomo-web-cli\cache\notes.json
macOS: ~/Library/Caches/flomo-web-cli/notes.json
Linux: ${XDG_CACHE_HOME:-~/.cache}/flomo-web-cli/notes.json
```

The cache contains memo content. Do not upload it, share it, or commit it.

## Getting Authorization

<!-- shared: kept identical in flomo-web-cli and flomo-web-mcp; update both -->

Using Microsoft Edge or Chrome:

1. Log in to [flomo Web](https://v.flomoapp.com), press `F12` (`Cmd` + `Option` + `I` on macOS) to open DevTools, and switch to the `Network` panel.
2. Refresh the page, filter requests by `api/v1/memo/updated`, and open any matching request.
3. Under `Headers` → `Request Headers`, copy the full `Authorization` value starting with `Bearer `.

![Inspecting the flomo Authorization request header in Edge DevTools](docs/images/get-authorization-edge-headers.png)

> Copy only the `Bearer ...` value, without the `Authorization:` field name. It is equivalent to your login session: never commit it, paste it into issues, or share screenshots of it. An `AUTH_EXPIRED` error means the session has expired; repeat the steps above to get a new value.

<!-- /shared -->

Then store it in user config:

```bash
flomo-web config set authorization "Bearer your-token-here"
```

## Security Notes

<!-- shared: kept identical in flomo-web-cli and flomo-web-mcp; update both -->

- Never commit or share `.env`, `FLOMO_AUTHORIZATION`, `FLOMO_COOKIE`, or any file, log, or raw flomo response containing memo content.
- Do not paste credentials into public issues, online debugging tools, or untrusted third-party services.
- flomo Web internal endpoints can change at any time. If reads or writes suddenly fail, you can temporarily override the paths with `FLOMO_READ_ENDPOINT`, `FLOMO_SYNC_ENDPOINT`, or `FLOMO_WRITE_ENDPOINT`, and please open an issue.

<!-- /shared -->

- The CLI masks `authorization` and `cookie` when displaying config, but you still need to protect the user config file, the cache file, and your shell history.

## Risk Notice

<!-- shared: kept identical in flomo-web-cli and flomo-web-mcp; update both -->

By using this project, you understand and accept the following risks:

- This project is maintained by community developers. It does not represent flomo and has no endorsement or service commitment from flomo.
- It is provided "as is", with no guarantee of availability, endpoint stability, data integrity, or fitness for every use case.
- You are responsible for ensuring your usage complies with flomo's terms of service, applicable laws, and your organization's security requirements.
- You bear the risks of account issues, credential leaks, data loss, failed requests, service interruptions, or third-party restrictions arising from its use.
- To the maximum extent permitted by applicable law, the developers and contributors are not liable for any direct or indirect loss arising from these risks.

<!-- /shared -->

## Related Projects

<!-- shared: kept identical in flomo-web-cli and flomo-web-mcp; update both -->

| Project | Form | Best for |
| --- | --- | --- |
| [flomo-web-cli](https://github.com/godisabug/flomo-web-cli) | Command-line tool `flomo-web` | Working with memos from a terminal or scripts |
| [flomo-web-mcp](https://github.com/godisabug/flomo-web-mcp) | MCP stdio server | Letting Claude and other MCP clients read and write memos |

Both share the same flomo access logic (request signing, memo parsing, time handling, and error handling), and behave the same way; when that shared logic changes, both are released together under the same version number.

<!-- /shared -->

## License

<!-- shared: kept identical in flomo-web-cli and flomo-web-mcp; update both -->

MIT, see [LICENSE](LICENSE).

<!-- /shared -->
