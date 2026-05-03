import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadEnvConfig } from "../src/config/env.js";
import { maskConfigValue, readUserConfig, writeUserConfig } from "../src/config/userConfig.js";
import { resolveConfig } from "../src/config/resolvedConfig.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "flomo-web-cli-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("env config", () => {
  it("loads defaults and validates positive timeout", () => {
    const config = loadEnvConfig({ FLOMO_REQUEST_TIMEOUT_MS: "15000" });
    expect(config.requestTimeoutMs).toBe(15000);
    expect(config.baseUrl).toBe("https://flomoapp.com");
    expect(config.webBaseUrl).toBe("https://v.flomoapp.com");
  });
});

describe("user config", () => {
  it("writes and reads whitelisted keys", async () => {
    const dir = await tempDir();
    const file = join(dir, "config.json");
    await writeUserConfig(file, { authorization: "Bearer secret", timezone: "Asia/Shanghai" });
    await expect(readFile(file, "utf8")).resolves.toContain("Bearer secret");
    await expect(readUserConfig(file)).resolves.toEqual({ authorization: "Bearer secret", timezone: "Asia/Shanghai" });
  });

  it("masks sensitive values", () => {
    expect(maskConfigValue("authorization", "Bearer abcdefghijklmnop")).toBe("Bearer abcd...mnop");
    expect(maskConfigValue("timezone", "Asia/Shanghai")).toBe("Asia/Shanghai");
  });
});

describe("resolved config", () => {
  it("uses CLI options before env before user config before defaults", () => {
    const resolved = resolveConfig({
      cli: { authorization: "Bearer cli" },
      env: { authorization: "Bearer env", timezone: "UTC" },
      user: { authorization: "Bearer user", timezone: "Asia/Shanghai" }
    });

    expect(resolved.authorization).toBe("Bearer cli");
    expect(resolved.timezone).toBe("UTC");
    expect(resolved.userAgent).toBe("Mozilla/5.0");
  });
});
