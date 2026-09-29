import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadDotenvFile } from "../src/config/env.js";

describe("loadDotenvFile", () => {
  const originalCwd = process.cwd();
  let dir: string | undefined;

  afterEach(async () => {
    process.chdir(originalCwd);
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("loads .env without printing anything, so --json stderr stays one JSON object", async () => {
    dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-dotenv-"));
    await writeFile(join(dir, ".env"), "FLOMO_DOTENV_TEST=loaded\n");
    process.chdir(dir);
    vi.stubEnv("FLOMO_DOTENV_TEST", undefined);

    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const consoleCalls = (["log", "info", "warn", "error", "debug"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined)
    );

    loadDotenvFile();

    expect(process.env.FLOMO_DOTENV_TEST).toBe("loaded");
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
    for (const call of consoleCalls) {
      expect(call).not.toHaveBeenCalled();
    }
  });
});
