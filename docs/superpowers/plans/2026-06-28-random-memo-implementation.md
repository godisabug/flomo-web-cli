# Random Memo Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `flomo-web random`, a random memo command that refreshes the memo cache by default, falls back to an existing cache when refresh fails, and supports tag whitelist and blacklist filters.

**Architecture:** Keep random selection as a pure core module with injected RNG for deterministic tests. Add a command module that owns refresh, cache fallback, output formatting, and JSON metadata. Wire the command through the existing Commander parser and CLI dispatch patterns.

**Tech Stack:** TypeScript, Node.js, Commander, Vitest, existing flomo cache/read-client abstractions.

---

## File Structure

- Create `src/core/randomMemo.ts`: pure memo filtering and random selection.
- Create `tests/randomMemo.test.ts`: unit tests for tag normalization, hierarchical matching, blacklist precedence, no-match, and deterministic RNG.
- Create `src/commands/random.ts`: command orchestration for refresh, fallback cache loading, selection, and output.
- Modify `tests/commands.test.ts`: command-level tests for refresh success, fallback, no cache, cache-only mode, JSON shape, and no-match output.
- Modify `src/cli/parser.ts`: add the `random` subcommand and its options.
- Modify `src/cli/run.ts`: dispatch parsed `random` commands to `runRandomCommand`.
- Modify `tests/cli.test.ts`: parser tests for command name and random options.
- Modify `README.md`, `README.en.md`, and `tests/readmeExamples.test.ts`: document user-facing behavior.

---

### Task 1: Pure Random Memo Selector

**Files:**
- Create: `tests/randomMemo.test.ts`
- Create: `src/core/randomMemo.ts`

- [ ] **Step 1: Write the failing selector tests**

Create `tests/randomMemo.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import { selectRandomMemo } from "../src/core/randomMemo.js";
import type { Memo } from "../src/core/models/memo.js";

function memo(slug: string, tags: string[]): Memo {
  return {
    slug,
    content: `${slug} content`,
    tags,
    url: `https://v.flomoapp.com/memo/${slug}`,
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z"
  };
}

describe("selectRandomMemo", () => {
  it("selects from all memos when no filters are provided", () => {
    const result = selectRandomMemo([memo("a", []), memo("b", []), memo("c", [])], {}, () => 0.75);

    expect(result.memo?.slug).toBe("c");
    expect(result.candidateCount).toBe(3);
    expect(result.filters).toEqual({ tags: [], excludeTags: [] });
  });

  it("normalizes filter tags", () => {
    const result = selectRandomMemo([memo("a", ["#work"])], { tags: ["work"], excludeTags: ["#private"] }, () => 0);

    expect(result.filters).toEqual({ tags: ["#work"], excludeTags: ["#private"] });
  });

  it("matches any whitelist tag", () => {
    const items = [memo("a", ["#work"]), memo("b", ["#idea"]), memo("c", ["#private"])];
    const result = selectRandomMemo(items, { tags: ["work", "idea"] }, () => 0.6);

    expect(result.memo?.slug).toBe("b");
    expect(result.candidateCount).toBe(2);
  });

  it("excludes any blacklist tag", () => {
    const items = [memo("a", ["#work"]), memo("b", ["#private"]), memo("c", ["#archive"])];
    const result = selectRandomMemo(items, { excludeTags: ["private", "archive"] }, () => 0.99);

    expect(result.memo?.slug).toBe("a");
    expect(result.candidateCount).toBe(1);
  });

  it("gives blacklist precedence over whitelist", () => {
    const items = [memo("a", ["#work", "#private"]), memo("b", ["#work"])];
    const result = selectRandomMemo(items, { tags: ["work"], excludeTags: ["private"] }, () => 0);

    expect(result.memo?.slug).toBe("b");
    expect(result.candidateCount).toBe(1);
  });

  it("matches hierarchical tag prefixes without matching unrelated prefixes", () => {
    const items = [memo("a", ["#work/project"]), memo("b", ["#workshop"])];
    const result = selectRandomMemo(items, { tags: ["work"] }, () => 0);

    expect(result.memo?.slug).toBe("a");
    expect(result.candidateCount).toBe(1);
  });

  it("returns null when filters leave no candidates", () => {
    const result = selectRandomMemo([memo("a", ["#work"])], { tags: ["missing"] }, () => 0);

    expect(result.memo).toBeNull();
    expect(result.candidateCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run selector tests and verify they fail**

Run:

```bash
npm test -- tests/randomMemo.test.ts
```

Expected: FAIL because `../src/core/randomMemo.js` does not exist.

- [ ] **Step 3: Implement the selector module**

Create `src/core/randomMemo.ts` with:

```ts
import type { Memo } from "./models/memo.js";
import { normalizeTags } from "./parsers/tagParser.js";

export interface RandomMemoFilters {
  tags?: string[];
  excludeTags?: string[];
}

export interface NormalizedRandomMemoFilters {
  tags: string[];
  excludeTags: string[];
}

export interface RandomMemoSelection {
  memo: Memo | null;
  filters: NormalizedRandomMemoFilters;
  candidateCount: number;
}

export type RandomSource = () => number;

export function selectRandomMemo(items: Memo[], filters: RandomMemoFilters = {}, rng: RandomSource = Math.random): RandomMemoSelection {
  const normalizedFilters = {
    tags: normalizeTags(filters.tags),
    excludeTags: normalizeTags(filters.excludeTags)
  };
  const candidates = items.filter((memo) => matchesFilters(memo, normalizedFilters));

  if (candidates.length === 0) {
    return {
      memo: null,
      filters: normalizedFilters,
      candidateCount: 0
    };
  }

  const index = clampRandomIndex(rng(), candidates.length);
  return {
    memo: candidates[index] ?? null,
    filters: normalizedFilters,
    candidateCount: candidates.length
  };
}

function matchesFilters(memo: Memo, filters: NormalizedRandomMemoFilters): boolean {
  if (filters.tags.length > 0 && !matchesAnyRequestedTag(memo.tags, filters.tags)) {
    return false;
  }

  if (filters.excludeTags.length > 0 && matchesAnyRequestedTag(memo.tags, filters.excludeTags)) {
    return false;
  }

  return true;
}

function matchesAnyRequestedTag(memoTags: string[], requestedTags: string[]): boolean {
  return requestedTags.some((requestedTag) => memoTags.some((memoTag) => matchesTagPrefix(memoTag, requestedTag)));
}

function matchesTagPrefix(memoTag: string, requestedTag: string): boolean {
  return memoTag === requestedTag || memoTag.startsWith(`${requestedTag}/`);
}

function clampRandomIndex(value: number, length: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(length - 1, Math.floor(value * length)));
}
```

- [ ] **Step 4: Run selector tests and verify they pass**

Run:

```bash
npm test -- tests/randomMemo.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit selector work**

Run:

```bash
git add src/core/randomMemo.ts tests/randomMemo.test.ts
git commit -m "feat: add random memo selector"
```

---

### Task 2: Random Command Behavior

**Files:**
- Create: `src/commands/random.ts`
- Modify: `tests/commands.test.ts`

- [ ] **Step 1: Add failing command tests**

In `tests/commands.test.ts`, update imports:

```ts
import { readNoteCache, writeNoteCache } from "../src/cache/noteCache.js";
import { runRandomCommand } from "../src/commands/random.js";
```

Extend `createTrackingContext()` call tracking:

```ts
async function createTrackingContext(): Promise<
  CommandContext & {
    calls: {
      listLimit?: number;
      syncOptions?: { pageSize?: number; maxPages?: number };
      createInput?: { content: string; tags?: string[] };
    };
  }
> {
```

Append these tests inside the existing `describe("commands", () => {` block before its closing `});`:

```ts
  it("random refreshes cache and prints the selected memo", async () => {
    const context = await createTrackingContext();

    const result = await runRandomCommand(context, { json: false, rng: () => 0 });

    expect(result.stdout).toContain("Slug: a");
    expect(result.stdout).toContain("alpha #work");
    expect(result.stderr).toBe("");
    expect(context.calls.syncOptions).toEqual({});
    await expect(readNoteCache(context.cachePath)).resolves.toMatchObject({
      complete: true,
      syncedAt: "2026-05-03T00:00:00.000Z",
      items: [{ slug: "a" }, { slug: "b" }]
    });
  });

  it("random JSON includes filters refresh metadata and scope", async () => {
    const context = await createContext();

    const result = await runRandomCommand(context, {
      json: true,
      tags: ["work"],
      excludeTags: ["private"],
      rng: () => 0
    });

    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      memo: { slug: "a" },
      filters: {
        tags: ["#work"],
        excludeTags: ["#private"]
      },
      refresh: {
        attempted: true,
        ok: true,
        fallback: null
      },
      scope: {
        source: "all_synced_notes",
        complete: true,
        syncedAt: "2026-05-03T00:00:00.000Z"
      }
    });
  });

  it("random falls back to existing cache when refresh fails", async () => {
    const context = await createContext();
    await writeNoteCache(context.cachePath, {
      syncedAt: "2026-05-02T00:00:00.000Z",
      complete: true,
      items: [memo("cached", "cached #work")]
    });
    const failingContext: CommandContext = {
      ...context,
      readClient: {
        ...context.readClient,
        syncAll: async () => {
          throw new CliError("AUTH_EXPIRED", "expired");
        }
      }
    };

    const result = await runRandomCommand(failingContext, { json: false, rng: () => 0 });

    expect(result.stdout).toContain("Slug: cached");
    expect(result.stderr).toContain("sync failed");
    expect(result.stderr).toContain("using cached memos from 2026-05-02T00:00:00.000Z");
  });

  it("random surfaces refresh failure when fallback cache is unavailable", async () => {
    const context = await createContext();
    const failingContext: CommandContext = {
      ...context,
      readClient: {
        ...context.readClient,
        syncAll: async () => {
          throw new CliError("AUTH_EXPIRED", "expired");
        }
      }
    };

    await expect(runRandomCommand(failingContext, { json: false, rng: () => 0 })).rejects.toMatchObject({
      code: "AUTH_EXPIRED",
      message: "expired"
    } satisfies Partial<CliError>);
  });

  it("random --no-sync reads cache without refreshing", async () => {
    const context = await createTrackingContext();
    await writeNoteCache(context.cachePath, {
      syncedAt: "2026-05-02T00:00:00.000Z",
      complete: true,
      items: [memo("cached", "cached #work")]
    });

    const result = await runRandomCommand(context, { json: true, noSync: true, rng: () => 0 });

    expect(context.calls.syncOptions).toBeUndefined();
    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      memo: { slug: "cached" },
      refresh: {
        attempted: false
      }
    });
  });

  it("random returns no-result output when filters leave no candidates", async () => {
    const context = await createContext();

    const human = await runRandomCommand(context, { json: false, tags: ["missing"], rng: () => 0 });
    const json = await runRandomCommand(context, { json: true, tags: ["missing"], rng: () => 0 });

    expect(human.stdout).toBe("No matching memos found.");
    expect(JSON.parse(json.stdout)).toMatchObject({
      ok: true,
      memo: null,
      filters: {
        tags: ["#missing"],
        excludeTags: []
      }
    });
  });
```

- [ ] **Step 2: Run command tests and verify they fail**

Run:

```bash
npm test -- tests/commands.test.ts
```

Expected: FAIL because `../src/commands/random.js` does not exist.

- [ ] **Step 3: Implement the command module**

Create `src/commands/random.ts` with:

```ts
import { readNoteCache, writeNoteCache, type NoteCache } from "../cache/noteCache.js";
import { toPublicError } from "../core/errors.js";
import { selectRandomMemo, type RandomMemoFilters, type RandomSource } from "../core/randomMemo.js";
import { formatJson } from "../formatters/json.js";
import { formatMemoDetail } from "../formatters/human.js";
import type { CommandContext, CommandResult } from "./types.js";

export interface RandomCommandOptions extends RandomMemoFilters {
  json?: boolean;
  noSync?: boolean;
  rng?: RandomSource;
}

interface RefreshAttemptedSuccess {
  attempted: true;
  ok: true;
  fallback: null;
}

interface RefreshAttemptedFallback {
  attempted: true;
  ok: false;
  fallback: "cache";
  error: ReturnType<typeof toPublicError>;
}

interface RefreshSkipped {
  attempted: false;
}

type RefreshMetadata = RefreshAttemptedSuccess | RefreshAttemptedFallback | RefreshSkipped;

interface RandomMemoSource {
  cache: NoteCache;
  refresh: RefreshMetadata;
  stderr: string;
}

export async function runRandomCommand(context: CommandContext, options: RandomCommandOptions): Promise<CommandResult> {
  const source = await loadRandomMemoSource(context, options.noSync === true);
  const selection = selectRandomMemo(
    source.cache.items,
    {
      tags: options.tags,
      excludeTags: options.excludeTags
    },
    options.rng ?? Math.random
  );
  const scope = {
    source: "all_synced_notes",
    complete: source.cache.complete,
    syncedAt: source.cache.syncedAt,
    description: "Random memo selected from synced local memo cache."
  };

  if (options.json) {
    return {
      stdout: formatJson({
        ok: true,
        memo: selection.memo,
        filters: selection.filters,
        candidateCount: selection.candidateCount,
        refresh: source.refresh,
        scope
      }),
      stderr: "",
      exitCode: 0
    };
  }

  return {
    stdout: selection.memo ? formatMemoDetail(selection.memo, context.timezone) : "No matching memos found.",
    stderr: source.stderr,
    exitCode: 0
  };
}

async function loadRandomMemoSource(context: CommandContext, noSync: boolean): Promise<RandomMemoSource> {
  if (noSync) {
    return {
      cache: await readNoteCache(context.cachePath),
      refresh: {
        attempted: false
      },
      stderr: ""
    };
  }

  let syncResult: Awaited<ReturnType<CommandContext["readClient"]["syncAll"]>>;
  try {
    syncResult = await context.readClient.syncAll();
  } catch (error) {
    const refreshError = toSafePublicError(error);
    try {
      const cache = await readNoteCache(context.cachePath);
      return {
        cache,
        refresh: {
          attempted: true,
          ok: false,
          fallback: "cache",
          error: refreshError
        },
        stderr: formatFallbackWarning(refreshError, cache)
      };
    } catch {
      throw error;
    }
  }

  const cache = await writeNoteCache(context.cachePath, {
    syncedAt: syncResult.syncedAt,
    complete: syncResult.complete,
    ...(syncResult.nextCursor ? { nextCursor: syncResult.nextCursor } : {}),
    items: syncResult.items
  });

  return {
    cache,
    refresh: {
      attempted: true,
      ok: true,
      fallback: null
    },
    stderr: ""
  };
}

function toSafePublicError(error: unknown): ReturnType<typeof toPublicError> {
  const publicError = toPublicError(error);
  if (publicError.code === "UNKNOWN") {
    return {
      code: "UNKNOWN",
      message: "未知错误。"
    };
  }

  return publicError;
}

function formatFallbackWarning(error: ReturnType<typeof toPublicError>, cache: NoteCache): string {
  return `Warning: sync failed (${error.code}: ${error.message}); using cached memos from ${cache.syncedAt}.`;
}
```

- [ ] **Step 4: Run command tests and verify they pass**

Run:

```bash
npm test -- tests/commands.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit command work**

Run:

```bash
git add src/commands/random.ts tests/commands.test.ts
git commit -m "feat: add random memo command"
```

---

### Task 3: CLI Parser and Runtime Wiring

**Files:**
- Modify: `src/cli/parser.ts`
- Modify: `src/cli/run.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Add failing CLI parser tests**

In `tests/cli.test.ts`, change the expected command list:

```ts
  it("has the expected command names", () => {
    const names = createProgram().commands.map((command) => command.name());
    expect(names).toEqual(["list", "search", "sync", "get", "create", "random", "config"]);
  });
```

Add this test inside the existing `describe("CLI parser", () => {` block before its closing `});`:

```ts
  it("parses random options", () => {
    const program = createProgram();
    program.exitOverride();
    program.parse(["node", "flomo-web", "random", "--tag", "work", "--tag", "idea", "--exclude-tag", "private", "--no-sync", "--json"]);
    const command = program.commands.find((item) => item.name() === "random");
    expect(command?.opts()).toMatchObject({
      tag: ["work", "idea"],
      excludeTag: ["private"],
      sync: false,
      json: true
    });
  });
```

- [ ] **Step 2: Run CLI tests and verify they fail**

Run:

```bash
npm test -- tests/cli.test.ts
```

Expected: FAIL because `random` is not registered.

- [ ] **Step 3: Add parser support**

In `src/cli/parser.ts`, insert this command before `const config = program.command("config")`:

```ts
  program
    .command("random")
    .description("Show one random flomo memo.")
    .option("--authorization <authorization>", "flomo Authorization header override.")
    .option("--tag <tag>", "Only include memos matching the tag.", collectOption, [])
    .option("--exclude-tag <tag>", "Exclude memos matching the tag.", collectOption, [])
    .option("--no-sync", "Use the existing local cache without refreshing first.")
    .option("--json", "Print JSON output.", false)
    .action((options: Record<string, unknown>) => {
      onCommand?.({ name: "random", args: [], options });
    });
```

- [ ] **Step 4: Wire runtime dispatch**

In `src/cli/run.ts`, add the import:

```ts
import { runRandomCommand } from "../commands/random.js";
```

Add the dispatch branch after the `create` branch or before it:

```ts
    case "random":
      return runRandomCommand(context, {
        json: booleanOption(command.options.json),
        tags: stringArrayOption(command.options.tag),
        excludeTags: stringArrayOption(command.options.excludeTag),
        noSync: command.options.sync === false
      });
```

- [ ] **Step 5: Run CLI tests and verify they pass**

Run:

```bash
npm test -- tests/cli.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit CLI wiring**

Run:

```bash
git add src/cli/parser.ts src/cli/run.ts tests/cli.test.ts
git commit -m "feat: wire random memo CLI"
```

---

### Task 4: Documentation and README Coverage

**Files:**
- Modify: `README.md`
- Modify: `README.en.md`
- Modify: `tests/readmeExamples.test.ts`

- [ ] **Step 1: Add failing README expectations**

In `tests/readmeExamples.test.ts`, add these expectations after the existing command expectations:

```ts
    expect(readme).toContain("flomo-web random");
    expect(readme).toContain("flomo-web random --no-sync");
    expect(readme).toContain("flomo-web random --tag work --tag idea");
    expect(readme).toContain("flomo-web random --exclude-tag private");
    expect(readme).toContain("默认会先尝试同步最新 memo");
    expect(englishReadme).toContain("flomo-web random");
    expect(englishReadme).toContain("flomo-web random --no-sync");
    expect(englishReadme).toContain("tries to refresh memos first");
```

- [ ] **Step 2: Run README tests and verify they fail**

Run:

```bash
npm test -- tests/readmeExamples.test.ts
```

Expected: FAIL because the README files do not mention `random` yet.

- [ ] **Step 3: Update Chinese README**

In `README.md`, update the feature bullets near the top to include random memo roaming:

```markdown
- 支持最近 memo 列表、关键词搜索、按 `slug` 查看、随机漫游、创建 memo。
- 支持 `sync` 将 memo 写入本地持久缓存，后续可用 `--scope all` 做全量缓存搜索或定位，也可用 `random --no-sync` 从缓存中随机抽取。
```

Insert this command block after the `get` examples and before the `create` examples:

````markdown
```bash
flomo-web random
flomo-web random --no-sync
flomo-web random --tag work --tag idea
flomo-web random --exclude-tag private
flomo-web random --json
```
````

Replace the first paragraph in `## 缓存` with:

```markdown
`flomo-web sync` 会写入本地持久缓存，之后 `search --scope all`、`get --scope all` 和 `random --no-sync` 可以从缓存中查询。`flomo-web random` 默认会先尝试同步最新 memo；如果同步失败但本地缓存可用，会从缓存中随机抽取并输出警告。需要自定义同步分页时，先运行 `flomo-web sync --page-size 200 --max-pages 50`，再运行 `flomo-web random --no-sync`。
```

- [ ] **Step 4: Update English README**

In `README.en.md`, update the intro sentence:

```markdown
`flomo-web-cli` is a third-party local CLI for flomo. It uses your own flomo Web session credentials to list, search, sync, get, randomly roam, and create memos.
```

Insert this command block after the `get` examples and before the `create` examples:

````markdown
```bash
flomo-web random
flomo-web random --no-sync
flomo-web random --tag work --tag idea
flomo-web random --exclude-tag private
flomo-web random --json
```
````

Replace the first paragraph in `## Cache` with:

```markdown
`flomo-web sync` writes a persistent note cache so later commands can use `--scope all`, and `random --no-sync` can select from the cache. `flomo-web random` tries to refresh memos first by default; if refresh fails and a valid local cache exists, it selects from the cache and prints a warning. For custom sync pagination, run `flomo-web sync --page-size 200 --max-pages 50` first, then run `flomo-web random --no-sync`.
```

- [ ] **Step 5: Run README tests and verify they pass**

Run:

```bash
npm test -- tests/readmeExamples.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit documentation**

Run:

```bash
git add README.md README.en.md tests/readmeExamples.test.ts
git commit -m "docs: document random memo command"
```

---

### Task 5: Full Verification

**Files:**
- Verify all changed files from Tasks 1-4.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- tests/randomMemo.test.ts tests/commands.test.ts tests/cli.test.ts tests/readmeExamples.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run type checks**

Run:

```bash
npm run typecheck
npm run typecheck:test
```

Expected: both commands PASS.

- [ ] **Step 3: Run build and smoke test**

Run:

```bash
npm run build
npm run smoke
```

Expected: both commands PASS, and smoke output includes CLI help.

- [ ] **Step 4: Run the full verification script**

Run:

```bash
npm run verify
```

Expected: PASS. If `npm audit` cannot reach the registry because network access is unavailable, record that network-limited failure and include the successful focused tests, type checks, build, and smoke result in the final status.

- [ ] **Step 5: Inspect git state**

Run:

```bash
git status --short
```

Expected: either clean, or only intentionally untracked plan/spec files if plan files were not committed in the working branch.
