import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readNoteCache, writeNoteCache } from "../src/cache/noteCache.js";
import { runCreateCommand } from "../src/commands/create.js";
import { runGetCommand } from "../src/commands/get.js";
import { runListCommand } from "../src/commands/list.js";
import { runRandomCommand } from "../src/commands/random.js";
import { runSearchCommand } from "../src/commands/search.js";
import { runSyncCommand } from "../src/commands/sync.js";
import { runConfigCommand } from "../src/commands/config.js";
import { CliError } from "../src/core/errors.js";
import type { CommandContext } from "../src/commands/types.js";
import type { Memo } from "../src/core/models/memo.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function createContext(): Promise<CommandContext> {
  const dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-command-"));
  tempDirs.push(dir);
  const cachePath = join(dir, "notes.json");
  const configPath = join(dir, "config.json");
  const items = [memo("a", "alpha #work"), memo("b", "beta")];

  return {
    configPath,
    cachePath,
    timezone: "Asia/Shanghai",
    readClient: {
      list: async () => items,
      search: async (query: string) => items.filter((item) => item.content.includes(query)),
      getBySlug: async (slug: string) => items.find((item) => item.slug === slug) ?? null,
      getRecentBatch: async () => items,
      syncAll: async () => ({
        synced: items.length,
        totalCached: items.length,
        pages: 1,
        complete: true,
        syncedAt: "2026-05-03T00:00:00.000Z",
        items
      })
    },
    writeClient: {
      create: async ({ content }) => memo("created", content)
    }
  };
}

async function createTrackingContext(): Promise<CommandContext & { calls: { listLimit?: number; syncOptions?: { pageSize?: number; maxPages?: number }; createInput?: { content: string; tags?: string[] } } }> {
  const context = await createContext();
  const calls: { listLimit?: number; syncOptions?: { pageSize?: number; maxPages?: number }; createInput?: { content: string; tags?: string[] } } = {};
  return {
    ...context,
    calls,
    readClient: {
      ...context.readClient,
      list: async (limit?: number) => {
        calls.listLimit = limit;
        return context.readClient.list(limit);
      },
      syncAll: async (options = {}) => {
        calls.syncOptions = options;
        return context.readClient.syncAll(options);
      }
    },
    writeClient: {
      create: async (input) => {
        calls.createInput = input;
        return context.writeClient.create(input);
      }
    }
  };
}

function memo(slug: string, content: string): Memo {
  return {
    slug,
    content,
    tags: content.includes("#work") ? ["#work"] : [],
    url: `https://v.flomoapp.com/memo/${slug}`,
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z"
  };
}

describe("commands", () => {
  it("lists memos as JSON", async () => {
    const result = await runListCommand(await createContext(), { json: true, limit: 20 });
    expect(result.stdout).toContain("\"items\"");
    expect(result.stdout).toContain("\"recent_notes\"");
  });

  it("syncs memos into cache", async () => {
    const context = await createContext();
    const result = await runSyncCommand(context, { json: false, pageSize: 200, maxPages: 50 });
    expect(result.stdout).toContain("Synced: 2");
    await expect(runSearchCommand(context, { json: true, query: "alpha", limit: 20, scope: "all" })).resolves.toMatchObject({ exitCode: 0 });
  });

  it("gets a recent memo", async () => {
    await expect(runGetCommand(await createContext(), { json: false, slug: "a", scope: "recent" })).resolves.toMatchObject({ stdout: expect.stringContaining("alpha") });
  });

  it("creates a memo", async () => {
    await expect(runCreateCommand(await createContext(), { json: false, content: "hello", tags: [], stdin: false })).resolves.toMatchObject({ stdout: expect.stringContaining("Created") });
  });

  it("sets and lists masked config", async () => {
    const context = await createContext();
    await runConfigCommand(context, { action: "set", key: "authorization", value: "Bearer abcdefghijklmnop" });
    const result = await runConfigCommand(context, { action: "list" });
    expect(result.stdout).toContain("Bearer abcd...mnop");
  });

  it("returns masked config JSON", async () => {
    const context = await createContext();
    await runConfigCommand(context, { action: "set", key: "authorization", value: "Bearer abcdefghijklmnop" });
    const result = await runConfigCommand(context, { action: "get", key: "authorization", json: true });
    expect(JSON.parse(result.stdout)).toEqual({
      ok: true,
      key: "authorization",
      value: "Bearer abcd...mnop"
    });
  });

  it("maps invalid config values to CONFIG_INVALID", async () => {
    await expect(runConfigCommand(await createContext(), { action: "set", key: "baseUrl", value: "not-a-url" })).rejects.toMatchObject({
      code: "CONFIG_INVALID"
    } satisfies Partial<CliError>);
  });

  it("rejects empty create content", async () => {
    await expect(runCreateCommand(await createContext(), { json: false, content: "   ", tags: [], stdin: false })).rejects.toMatchObject({
      code: "BAD_REQUEST"
    } satisfies Partial<CliError>);
  });

  it("surfaces missing all-notes cache", async () => {
    await expect(runSearchCommand(await createContext(), { json: true, query: "alpha", limit: 20, scope: "all" })).rejects.toMatchObject({
      code: "CACHE_MISSING"
    } satisfies Partial<CliError>);
  });

  it("forwards command options to clients", async () => {
    const context = await createTrackingContext();
    await runListCommand(context, { json: false, limit: 7 });
    await runSyncCommand(context, { json: false, pageSize: 11, maxPages: 3 });
    await runCreateCommand(context, { json: false, content: "hello", tags: ["work"], stdin: false });

    expect(context.calls.listLimit).toBe(7);
    expect(context.calls.syncOptions).toEqual({ pageSize: 11, maxPages: 3 });
    expect(context.calls.createInput).toEqual({ content: "hello", tags: ["work"] });
  });

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
      candidateCount: 1,
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

  it("random JSON sanitizes unknown refresh errors when falling back to cache", async () => {
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
          throw new Error("sensitive");
        }
      }
    };

    const result = await runRandomCommand(failingContext, { json: true, rng: () => 0 });

    expect(JSON.parse(result.stdout)).toMatchObject({
      ok: true,
      memo: { slug: "cached" },
      refresh: {
        attempted: true,
        ok: false,
        fallback: "cache",
        error: {
          code: "UNKNOWN",
          message: "未知错误。"
        }
      }
    });
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
});
