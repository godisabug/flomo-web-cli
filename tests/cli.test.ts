import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProgram } from "../src/cli/parser.js";
import { runCli } from "../src/cli/run.js";

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
    expect(names).toEqual(["list", "search", "sync", "get", "create", "config"]);
  });
});

describe("CLI runtime", () => {
  it("runs config commands without Authorization", async () => {
    const output = createOutput();
    await withTempConfigEnv(async () => {
      const exitCode = await runCli(["node", "flomo-web", "config", "list", "--json"], output.io);
      expect(exitCode).toBe(0);
    });

    expect(JSON.parse(output.stdout)).toEqual({ ok: true, items: [] });
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

  it("formats command errors with codes in human mode", async () => {
    const output = createOutput();
    await withTempConfigEnv(async () => {
      const exitCode = await runCli(["node", "flomo-web", "config", "get", "unsupported"], output.io);
      expect(exitCode).toBe(1);
    });

    expect(output.stderr).toBe("CONFIG_INVALID: Unsupported config key: unsupported\n");
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
