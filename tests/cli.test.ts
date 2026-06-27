import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { writeNoteCache } from "../src/cache/noteCache.js";
import { createProgram } from "../src/cli/parser.js";
import { runCli } from "../src/cli/run.js";
import { getNoteCachePath } from "../src/utils/filesystem.js";

const tempDirs: string[] = [];

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("CLI parser", () => {
  it("parses list options", () => {
    const program = createProgram();
    program.exitOverride();
    program.parse(["node", "flomo-web", "list", "--limit", "5", "--json"]);
    const command = program.commands.find((item) => item.name() === "list");
    expect(command?.opts()).toMatchObject({ limit: 5, json: true });
  });

  it("has the expected command names", () => {
    const names = createProgram().commands.map((command) => command.name());
    expect(names).toEqual(["list", "search", "sync", "get", "create", "random", "config"]);
  });

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
});

describe("CLI runtime", () => {
  it("prints the package version", async () => {
    const packageJson = await import("../package.json", { with: { type: "json" } });
    const output = createOutput();

    const exitCode = await runCli(["node", "flomo-web", "--version"], output.io);

    expect(exitCode).toBe(0);
    expect(output.stdout).toBe(`${packageJson.default.version}\n`);
    expect(output.stderr).toBe("");
  });

  it("runs config commands without Authorization", async () => {
    const output = createOutput();
    await withTempConfigEnv(async () => {
      const exitCode = await runCli(["node", "flomo-web", "config", "list", "--json"], output.io);
      expect(exitCode).toBe(0);
    });

    expect(JSON.parse(output.stdout)).toEqual({ ok: true, items: [] });
    expect(output.stderr).toBe("");
  });

  it("runs config commands without validating network runtime env", async () => {
    const output = createOutput();
    await withTempConfigEnv(async () => {
      vi.stubEnv("FLOMO_BASE_URL", "not-a-url");
      const exitCode = await runCli(["node", "flomo-web", "config", "list", "--json"], output.io);
      expect(exitCode).toBe(0);
    });

    expect(JSON.parse(output.stdout)).toEqual({ ok: true, items: [] });
    expect(output.stderr).toBe("");
  });

  it("runs random from cache without Authorization when sync is disabled", async () => {
    const output = createOutput();
    await withTempConfigEnv(async () => {
      await writeNoteCache(getNoteCachePath(), {
        syncedAt: "2026-06-28T00:00:00.000Z",
        complete: true,
        items: [
          {
            slug: "cached-work-memo",
            content: "Cached work memo #work",
            tags: ["#work"],
            url: "https://v.flomoapp.com/mine/?memo_id=cached-work-memo",
            createdAt: "2026-06-27T00:00:00.000Z",
            updatedAt: "2026-06-27T00:00:00.000Z"
          },
          {
            slug: "private-work-memo",
            content: "Private work memo #work #private",
            tags: ["#work", "#private"],
            url: "https://v.flomoapp.com/mine/?memo_id=private-work-memo",
            createdAt: "2026-06-26T00:00:00.000Z",
            updatedAt: "2026-06-26T00:00:00.000Z"
          }
        ]
      });

      const exitCode = await runCli(["node", "flomo-web", "random", "--tag", "work", "--exclude-tag", "private", "--no-sync", "--json"], output.io);
      expect(exitCode).toBe(0);
    });

    const parsed = JSON.parse(output.stdout) as {
      ok: boolean;
      memo: { slug: string };
      filters: { tags: string[]; excludeTags: string[] };
      refresh: { attempted: boolean };
    };
    expect(parsed.ok).toBe(true);
    expect(parsed.memo.slug).toBe("cached-work-memo");
    expect(parsed.filters.tags).toEqual(["#work"]);
    expect(parsed.filters.excludeTags).toEqual(["#private"]);
    expect(parsed.refresh.attempted).toBe(false);
    expect(output.stderr).toBe("");
  });

  it("formats command errors as JSON when requested", async () => {
    const output = createOutput();
    await withTempConfigEnv(async () => {
      const exitCode = await runCli(["node", "flomo-web", "config", "get", "unsupported", "--json"], output.io);
      expect(exitCode).toBe(1);
    });

    expect(JSON.parse(output.stderr)).toEqual({
      ok: false,
      error: {
        code: "CONFIG_INVALID",
        message: "Unsupported config key: unsupported"
      }
    });
    expect(output.stdout).toBe("");
  });

  it("formats parser errors as JSON when requested", async () => {
    const output = createOutput();
    const exitCode = await runCli(["node", "flomo-web", "list", "--limit", "nope", "--json"], output.io);

    expect(exitCode).toBe(1);
    expect(JSON.parse(output.stderr)).toEqual({
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message: "option '--limit <number>' argument 'nope' is invalid. must be a positive integer"
      }
    });
    expect(output.stderr).not.toContain("error:");
    expect(output.stdout).toBe("");
  });

  it("formats command errors with codes in human mode", async () => {
    const output = createOutput();
    await withTempConfigEnv(async () => {
      const exitCode = await runCli(["node", "flomo-web", "config", "get", "unsupported"], output.io);
      expect(exitCode).toBe(1);
    });

    expect(output.stderr).toBe("CONFIG_INVALID: Unsupported config key: unsupported\n");
    expect(output.stdout).toBe("");
  });

  it("sanitizes unknown network command errors in JSON mode", async () => {
    const output = createOutput();
    await withTempConfigEnv(async () => {
      vi.stubEnv("FLOMO_BASE_URL", "not-a-url");
      const exitCode = await runCli(["node", "flomo-web", "list", "--json"], output.io);
      expect(exitCode).toBe(1);
    });

    const parsed = JSON.parse(output.stderr) as { error: { code: string; message: string } };
    expect(parsed.error.code).toBe("UNKNOWN");
    expect(parsed.error.message).toBe("未知错误。");
    expect(output.stderr).not.toContain("not-a-url");
    expect(output.stderr).not.toContain("Invalid url");
    expect(output.stdout).toBe("");
  });

  it("rejects invalid scope values before dispatch", async () => {
    const output = createOutput();
    const exitCode = await runCli(["node", "flomo-web", "search", "alpha", "--scope", "bad"], output.io);

    expect(exitCode).toBe(1);
    expect(output.stderr).toContain("Allowed choices are recent, all");
    expect(output.stdout).toBe("");
  });

  it("prints subcommand help through the runtime", async () => {
    const output = createOutput();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: string | number | null) => {
      throw new Error(`process.exit ${code ?? ""}`);
    }) as never);

    const exitCode = await runCli(["node", "flomo-web", "list", "--help"], output.io);

    expect(exitCode).toBe(0);
    expect(output.stdout).toContain("Usage: flomo-web list [options]");
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

function createOutput(): {
  readonly stdout: string;
  readonly stderr: string;
  io: { stdout: { write: (text: string) => void }; stderr: { write: (text: string) => void } };
} {
  const chunks = {
    stdout: "",
    stderr: ""
  };

  return {
    get stdout() {
      return chunks.stdout;
    },
    get stderr() {
      return chunks.stderr;
    },
    io: {
      stdout: {
        write: (text: string) => {
          chunks.stdout += text;
        }
      },
      stderr: {
        write: (text: string) => {
          chunks.stderr += text;
        }
      }
    }
  };
}

async function withTempConfigEnv(callback: () => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-runtime-"));
  tempDirs.push(dir);

  vi.stubEnv("APPDATA", join(dir, "config"));
  vi.stubEnv("LOCALAPPDATA", join(dir, "cache"));
  vi.stubEnv("FLOMO_AUTHORIZATION", "");
  await callback();
}
