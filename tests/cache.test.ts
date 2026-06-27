import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("creates nested parent directories and writes a trailing newline", async () => {
    const dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-cache-"));
    tempDirs.push(dir);
    const file = join(dir, "nested", "cache", "notes.json");

    await writeNoteCache(file, {
      syncedAt: "2026-05-03T00:00:00.000Z",
      complete: true,
      items: [memo("nested")]
    });

    await expect(readNoteCache(file)).resolves.toMatchObject({
      items: [{ slug: "nested" }]
    });
    await expect(readFile(file, "utf8")).resolves.toMatch(/\n$/);
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

  it("rejects cache files with extra fields", async () => {
    const file = await tempFile();
    await writeFile(
      file,
      JSON.stringify({
        version: 1,
        syncedAt: "2026-05-03T00:00:00.000Z",
        complete: true,
        items: [],
        extra: true
      })
    );

    await expect(readNoteCache(file)).rejects.toMatchObject({
      code: "CACHE_INVALID"
    } satisfies Partial<CliError>);
  });

  it("rejects cache files with missing required fields", async () => {
    const file = await tempFile();
    await writeFile(
      file,
      JSON.stringify({
        version: 1,
        syncedAt: "2026-05-03T00:00:00.000Z",
        complete: true,
        items: [
          {
            slug: "missing-content",
            tags: [],
            url: "https://v.flomoapp.com/memo/missing-content",
            createdAt: "2026-05-03T00:00:00.000Z",
            updatedAt: "2026-05-03T00:00:00.000Z"
          }
        ]
      })
    );

    await expect(readNoteCache(file)).rejects.toMatchObject({
      code: "CACHE_INVALID"
    } satisfies Partial<CliError>);
  });

  it("reads cached memo file metadata", async () => {
    const file = await tempFile();
    await writeFile(
      file,
      JSON.stringify({
        version: 1,
        syncedAt: "2026-05-03T00:00:00.000Z",
        complete: true,
        items: [
          {
            slug: "image-only",
            content: "",
            tags: [],
            url: "https://v.flomoapp.com/memo/image-only",
            createdAt: "2026-05-03T00:00:00.000Z",
            updatedAt: "2026-05-03T00:00:00.000Z",
            files: [
              {
                type: "image",
                name: "1780979216007_7GohGHyY.jpg",
                size: 129187,
                url: "https://cdn.example.com/image.jpg",
                thumbnailUrl: "https://cdn.example.com/image-thumb.jpg",
                path: "memo/images/1780979216007_7GohGHyY.jpg"
              }
            ]
          }
        ]
      })
    );

    await expect(readNoteCache(file)).resolves.toMatchObject({
      items: [
        {
          slug: "image-only",
          content: "",
          files: [
            {
              type: "image",
              name: "1780979216007_7GohGHyY.jpg",
              size: 129187,
              url: "https://cdn.example.com/image.jpg",
              thumbnailUrl: "https://cdn.example.com/image-thumb.jpg",
              path: "memo/images/1780979216007_7GohGHyY.jpg"
            }
          ]
        }
      ]
    });
  });

  it("writes through a temporary file before replacing the final cache", async () => {
    const actualFs = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    const writes: string[] = [];
    const renames: Array<[string, string]> = [];

    vi.resetModules();
    vi.doMock("node:fs/promises", () => ({
      ...actualFs,
      writeFile: vi.fn(async (filePath: Parameters<typeof writeFile>[0], data: Parameters<typeof writeFile>[1], options?: Parameters<typeof writeFile>[2]) => {
        writes.push(String(filePath));
        await actualFs.writeFile(filePath, data, options);
      }),
      rename: vi.fn(async (oldPath: Parameters<typeof rename>[0], newPath: Parameters<typeof rename>[1]) => {
        renames.push([String(oldPath), String(newPath)]);
        await actualFs.rename(oldPath, newPath);
      })
    }));

    try {
      const { writeNoteCache: writeNoteCacheWithMockedFs } = await import("../src/cache/noteCache.js");
      const file = await tempFile();

      await writeNoteCacheWithMockedFs(file, {
        syncedAt: "2026-05-03T00:00:00.000Z",
        complete: true,
        items: []
      });

      expect(writes).toHaveLength(1);
      expect(writes[0]).not.toBe(file);
      expect(renames).toEqual([[writes[0], file]]);
    } finally {
      vi.doUnmock("node:fs/promises");
      vi.resetModules();
    }
  });
});
