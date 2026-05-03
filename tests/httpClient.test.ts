import { afterEach, describe, expect, it, vi } from "vitest";
import { FlomoAuthError, FlomoRequestError } from "../src/core/errors.js";
import { FlomoHttpClient } from "../src/core/clients/http.js";
import type { RuntimeConfig } from "../src/config/env.js";

const config: RuntimeConfig = {
  authorization: "Bearer test",
  userAgent: "TestAgent",
  baseUrl: "https://flomoapp.com",
  webBaseUrl: "https://v.flomoapp.com",
  timezone: "Asia/Shanghai",
  logLevel: "info",
  deviceId: "device-id",
  deviceModel: "Other",
  webPlatform: "Web",
  requestTimeoutMs: 30000
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FlomoHttpClient", () => {
  it("adds flomo web headers and parses JSON", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = new FlomoHttpClient(config);

    await expect(client.requestJson("/api/test")).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(url).toBe("https://flomoapp.com/api/test");
    expect(headers.get("Authorization")).toBe("Bearer test");
    expect(headers.get("Origin")).toBe("https://v.flomoapp.com");
    expect(headers.get("platform")).toBe("Web");
  });

  it("maps auth failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 401 }));
    const client = new FlomoHttpClient(config);
    await expect(client.requestJson("/api/test")).rejects.toBeInstanceOf(FlomoAuthError);
  });

  it("rejects absolute endpoints from another origin", async () => {
    const client = new FlomoHttpClient(config);
    await expect(client.requestJson("https://example.com/api/test")).rejects.toBeInstanceOf(FlomoRequestError);
  });
});
