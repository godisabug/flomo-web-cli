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
    const config = resolveConfig({ env: loadEnvConfig({ FLOMO_REQUEST_TIMEOUT_MS: "15000" }) });
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

  it("preserves user urls when env urls are absent", () => {
    const resolved = resolveConfig({
      user: {
        baseUrl: "https://custom.example",
        webBaseUrl: "https://custom-web.example"
      },
      env: loadEnvConfig({ FLOMO_REQUEST_TIMEOUT_MS: "15000" })
    });

    expect(resolved.baseUrl).toBe("https://custom.example");
    expect(resolved.webBaseUrl).toBe("https://custom-web.example");
    expect(resolved.requestTimeoutMs).toBe(15000);
  });

  it("uses explicit env urls before user config", () => {
    const resolved = resolveConfig({
      user: {
        baseUrl: "https://custom.example",
        webBaseUrl: "https://custom-web.example"
      },
      env: loadEnvConfig({
        FLOMO_BASE_URL: "https://env.example/",
        FLOMO_WEB_BASE_URL: "https://env-web.example/"
      })
    });

    expect(resolved.baseUrl).toBe("https://env.example");
    expect(resolved.webBaseUrl).toBe("https://env-web.example");
  });
});
