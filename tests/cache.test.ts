import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CliError } from "../src/core/errors.js";
import { readNoteCache, writeNoteCache } from "../src/cache/noteCache.js";
import type { Memo } from "../src/core/models/memo.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function tempFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-cache-"));
  tempDirs.push(dir);
  return join(dir, "notes.json");
}

function memo(slug: string): Memo {
  return {
    slug,
    content: "content",
    tags: ["#tag"],
    url: `https://v.flomoapp.com/memo/${slug}`,
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z"
  };
}

describe("note cache", () => {
  it("writes and reads versioned cache", async () => {
    const file = await tempFile();
    await writeNoteCache(file, {
      syncedAt: "2026-05-03T00:00:00.000Z",
      complete: true,
      items: [memo("a")]
    });

    await expect(readNoteCache(file)).resolves.toMatchObject({
      version: 1,
      complete: true,
      items: [{ slug: "a" }]
    });
  });

  it("distinguishes missing cache", async () => {
    await expect(readNoteCache(join(await tempFile(), "missing.json"))).rejects.toMatchObject({
      code: "CACHE_MISSING"
    } satisfies Partial<CliError>);
  });

  it("rejects invalid cache JSON", async () => {
    const file = await tempFile();
    await writeFile(file, "{");

    await expect(readNoteCache(file)).rejects.toMatchObject({
      code: "CACHE_INVALID",
      message: "缓存文件无效。请重新运行 flomo-web sync。"
    } satisfies Partial<CliError>);
  });

  it("rejects unsupported cache versions", async () => {
    const file = await tempFile();
    await writeFile(
      file,
      JSON.stringify({
        version: 2,
        syncedAt: "2026-05-03T00:00:00.000Z",
        complete: true,
        items: []
      })
    );

    await expect(readNoteCache(file)).rejects.toMatchObject({
      code: "CACHE_INVALID",
      message: "不支持的缓存版本：2。请重新运行 flomo-web sync。"
    } satisfies Partial<CliError>);
  });
});
