# flomo-web-cli

[中文](README.md) | English

`flomo-web-cli` is a third-party local CLI for flomo. It uses your own flomo Web session credentials to list, search, sync, get, and create memos.

This is not an official flomo project. It depends on flomo Web internal endpoints and may break if those endpoints change. Use it only in local environments you trust.

## Requirements

- Node.js 20.19.0 or newer
- npm
- Your own flomo Web `Authorization` header

## Related Projects

- [flomo-web-mcp](https://github.com/godisabug/flomo-web-mcp): MCP stdio server using the same flomo Web access approach.
- `flomo-web-cli`: this project, for terminal and script usage.

## Install

### Current source/local development

```bash
git clone https://github.com/godisabug/flomo-web-cli.git
cd flomo-web-cli
npm install
npm run build
node dist/index.js --help
```

Run the full local verification chain:

```bash
npm run verify
```

### Local global command

```bash
npm link
flomo-web --help
```

### Install From GitHub

```bash
npm install -g github:godisabug/flomo-web-cli
```

The installed command is:

```bash
flomo-web --help
```

### After npm Publication

```bash
npm install -g flomo-web-cli
```

The global command is:

```bash
flomo-web
```

## Project Layout

```text
flomo-web-cli/
├─ .github/                        GitHub workflows and templates
├─ docs/
│  └─ images/
│     └─ get-authorization-edge-headers.png
├─ src/
│  ├─ cache/                       persistent cache support
│  ├─ cli/                         CLI parsing and entrypoint
│  ├─ commands/                    subcommand implementations
│  ├─ config/                      config loading and resolution
│  ├─ core/                        flomo Web clients and core models
│  ├─ formatters/                  human and JSON output formatters
│  └─ utils/                       shared helpers
├─ tests/                          automated tests
├─ .env.example                    environment variable example
├─ README.md                       Chinese documentation
├─ README.en.md                    English documentation
└─ package.json                    package metadata and scripts
```

## Configure

Use environment variables, `.env`, or user config. Environment variables and `.env` override user config.

```bash
flomo-web config set authorization "Bearer your-token-here"
flomo-web config set timezone Asia/Shanghai
```

Sensitive values such as `authorization` and `cookie` are masked by display commands:

```bash
flomo-web config list
flomo-web config get authorization
```

You can also use `.env`:

```dotenv
FLOMO_AUTHORIZATION=Bearer your-token-here
FLOMO_COOKIE=
FLOMO_USER_AGENT=Mozilla/5.0
FLOMO_BASE_URL=https://flomoapp.com
FLOMO_WEB_BASE_URL=https://v.flomoapp.com
FLOMO_TIMEZONE=Asia/Shanghai
```

Default user config paths:

```text
Windows: %APPDATA%\flomo-web-cli\config.json
macOS: ~/Library/Application Support/flomo-web-cli/config.json
Linux: ${XDG_CONFIG_HOME:-~/.config}/flomo-web-cli/config.json
```

## Commands

Data commands accept `--authorization <value>` to override configured credentials for that invocation.

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

## JSON Output

Data commands support `--json`. JSON output is written to stdout as one JSON object. Errors are written to stderr as:

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

`flomo-web sync` writes a persistent note cache so later commands can use `--scope all`.

Default cache paths:

```text
Windows: %LOCALAPPDATA%\flomo-web-cli\cache\notes.json
macOS: ~/Library/Caches/flomo-web-cli/notes.json
Linux: ${XDG_CACHE_HOME:-~/.cache}/flomo-web-cli/notes.json
```

The cache contains memo content. Do not upload it, share it, or commit it.

## Getting Authorization

Microsoft Edge example:

1. Log in to flomo Web, press `Ctrl` + `Shift` + `I`, and switch to the `Network` panel.
2. Refresh the page, or perform any action in flomo that triggers a request.
3. Filter requests with `api/v1/memo/updated` and open any matching entry.
4. Open the `Headers` tab in the request details.
5. Copy the full `Authorization` value from `Request Headers`. It should start with `Bearer `.
6. Store it with `flomo-web config set authorization "Bearer ..."` or `FLOMO_AUTHORIZATION`.

```bash
flomo-web config set authorization "Bearer your-token-here"
```

![Inspecting the flomo Authorization request header in Edge DevTools](docs/images/get-authorization-edge-headers.png)

> Copy only the `Bearer ...` value. Do not include the `Authorization:` field name, and never commit or share real credentials.

## Security Notes

- Do not commit `.env`, real credentials, or cache files.
- Do not paste credentials into public issues or online debugging tools.
- The CLI masks `authorization` and `cookie` in config display commands, but you are still responsible for protecting local files.
- flomo Web internal endpoints can change without notice.

## License

MIT
