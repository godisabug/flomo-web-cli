# Random Memo Command Design

Date: 2026-06-28

## Goal

Add a note roaming command that returns one random flomo memo. The command should make newly created notes eligible by default, while still remaining usable when a refresh attempt fails and an older local cache exists.

## Confirmed Decisions

- Command name: `flomo-web random`.
- Default behavior: try to sync all memos first, write the refreshed cache, then randomly select from the refreshed items.
- Fallback behavior: if sync fails, read the existing local cache and randomly select from cached items.
- Failure behavior: if sync fails and no valid cache exists, the command fails.
- Cache-only option: `--no-sync` disables the refresh attempt and reads only the existing cache.
- Default output: single memo detail, matching `get` style output.
- JSON output: supported with `--json`.
- Whitelist option: `--tag <tag>`, repeatable.
- Blacklist option: `--exclude-tag <tag>`, repeatable.
- Multiple whitelist tags match with OR semantics.
- Multiple blacklist tags exclude with OR semantics.
- Blacklist wins when a memo matches both whitelist and blacklist.
- Tag matching uses hierarchical prefix semantics. `#work` matches `#work` and `#work/project`, but not `#workshop`.

## CLI Behavior

Examples:

```bash
flomo-web random
flomo-web random --no-sync
flomo-web random --tag work
flomo-web random --tag work --tag idea
flomo-web random --exclude-tag private
flomo-web random --tag work --exclude-tag archived
flomo-web random --json
```

`flomo-web random` uses the existing sync defaults:

- `pageSize = 200`
- `maxPages = 50`

The random command will not expose sync pagination options. Users who need custom pagination can run `flomo-web sync --page-size ... --max-pages ...` first, then run `flomo-web random --no-sync`.

## Output

Human output:

- The selected memo detail is written to stdout using the same shape as `get`: slug, URL, created time, updated time, tags, and full content.
- If refresh fails but cache fallback succeeds, the selected memo still goes to stdout and a warning goes to stderr. The warning should say that refresh failed and cached memos are being used, including the cache `syncedAt` when available.

JSON output:

```json
{
  "ok": true,
  "memo": {},
  "filters": {
    "tags": ["#work"],
    "excludeTags": ["#private"]
  },
  "refresh": {
    "attempted": true,
    "ok": true,
    "fallback": null
  },
  "scope": {
    "source": "all_synced_notes",
    "complete": true,
    "syncedAt": "2026-06-28T00:00:00.000Z",
    "description": "Random memo selected from synced local memo cache."
  }
}
```

When `--no-sync` is used:

```json
{
  "refresh": {
    "attempted": false
  }
}
```

When refresh fails but cache fallback succeeds:

```json
{
  "refresh": {
    "attempted": true,
    "ok": false,
    "fallback": "cache",
    "error": {
      "code": "AUTH_FAILED",
      "message": "..."
    }
  }
}
```

When no memo matches the filters, human output is:

```text
No matching memos found.
```

JSON output returns `memo: null` and `ok: true`. No matching memo is not a command failure.

## Internal Design

Add a pure selection module, for example `src/core/randomMemo.ts`.

Responsibilities:

- Normalize `tags` and `excludeTags` with the existing `normalizeTags()` helper.
- Filter memos by whitelist and blacklist rules.
- Match hierarchical tags with exact match or slash child match:
  - requested `#work` matches memo tag `#work`
  - requested `#work` matches memo tag `#work/project`
  - requested `#work` does not match memo tag `#workshop`
- Select one memo with `Math.floor(rng() * candidates.length)`.
- Accept an injected RNG function for deterministic tests.
- Return the selected memo, normalized filters, and candidate count.

Add `src/commands/random.ts`.

Responsibilities:

- If `noSync` is false or absent, call `context.readClient.syncAll()` with default options.
- On sync success, write the refreshed cache via `writeNoteCache()`, then select from the synced result.
- On sync failure, capture a public error and try `readNoteCache(context.cachePath)`.
- If fallback cache read succeeds, select from cached items and expose refresh fallback metadata.
- If fallback cache read fails, rethrow the original sync error when sync was attempted; for `--no-sync`, surface the cache error.
- If `noSync` is true, skip sync and read only the local cache.
- Format human output with `formatMemoDetail(memo, context.timezone)` when a memo is selected.
- Format JSON output with `memo`, `filters`, `refresh`, and `scope`.

CLI integration:

- Add a `random` command to `src/cli/parser.ts`.
- Options:
  - `--authorization <authorization>`
  - `--tag <tag>` repeatable
  - `--exclude-tag <tag>` repeatable
  - `--no-sync`
  - `--json`
- Add a dispatch branch in `src/cli/run.ts`.
- Reuse the existing array option parsing pattern used by `create --tag`.

No changes are needed to `FlomoReadClient`; the command can reuse the existing `syncAll()` method.

## Error Handling

- Sync succeeds, cache write succeeds: select from refreshed items.
- Sync succeeds, cache write fails: command fails. The command should not silently select from unwritten data because the cache would not reflect the claimed refresh.
- Sync fails, valid cache exists: command succeeds with fallback metadata and a human stderr warning.
- Sync fails, cache missing: command fails.
- Sync fails, cache invalid: command fails.
- When refresh was attempted and fallback cache cannot be used, surface the original refresh error. The cache read is only a fallback path, not the primary operation.
- `--no-sync`, cache missing: existing `CACHE_MISSING` behavior.
- `--no-sync`, cache invalid: existing `CACHE_INVALID` behavior.
- Empty cache or no matching filtered candidates: command succeeds with no memo.

## Testing Plan

Pure selector tests:

- Selects from all memos when no filters are provided.
- Normalizes filter tags with and without leading `#`.
- Applies whitelist OR semantics.
- Applies blacklist OR semantics.
- Gives blacklist precedence over whitelist.
- Matches hierarchical tag prefixes.
- Does not match unrelated prefixes such as `#work` against `#workshop`.
- Uses injected RNG for deterministic selection.
- Returns `null` when no candidates remain.

Command tests:

- `random` refreshes, writes cache, and outputs a memo detail.
- `random --json` includes `memo`, `filters`, `refresh`, and `scope`.
- `random` falls back to existing cache when sync fails.
- Fallback warning goes to stderr in human mode.
- `random` fails when sync fails and no cache exists.
- `random --no-sync` reads only cache and does not call `syncAll()`.
- Filtered no-result output returns `No matching memos found.` in human mode and `memo: null` in JSON mode.

CLI parser tests:

- Parser exposes command names including `random`.
- Parser accepts `--tag`, `--exclude-tag`, `--no-sync`, and `--json`.
- Repeated tag options are collected as arrays.

Documentation tests:

- README and README.en mention `flomo-web random`.
- Documentation explains default refresh, cache fallback, and `--no-sync`.
- Documentation includes whitelist and blacklist examples.

## Documentation Updates

Update:

- `README.md`
- `README.en.md`

Add examples for:

- Basic random memo.
- Cache-only mode with `--no-sync`.
- Whitelist tags with `--tag`.
- Blacklist tags with `--exclude-tag`.
- JSON output.

Also document that default random refresh uses the same defaults as `sync`, and users who need custom sync pagination should run `sync` explicitly before `random --no-sync`.
