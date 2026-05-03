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
  vi.useRealTimers();
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

  it("does not expose raw non-JSON 400 bodies", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("authorization=Bearer secret", { status: 400 }));
    const client = new FlomoHttpClient(config);

    await expect(client.requestJson("/api/test")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "flomo 请求体不符合当前接口要求。"
    });
  });

  it("uses safe structured 400 messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "limit 参数无效" }), { status: 400 }));
    const client = new FlomoHttpClient(config);

    await expect(client.requestJson("/api/test")).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "limit 参数无效"
    });
  });

  it("maps sign-like structured 400 messages to sign errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "signature invalid" }), { status: 400 }));
    const client = new FlomoHttpClient(config);

    await expect(client.requestJson("/api/test")).rejects.toMatchObject({
      code: "SIGN_INVALID",
      message: "signature invalid"
    });
  });

  it("maps rate limits", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 429 }));
    const client = new FlomoHttpClient(config);

    await expect(client.requestJson("/api/test")).rejects.toMatchObject({
      code: "RATE_LIMITED"
    });
  });

  it("maps invalid JSON responses to parse errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not-json", { status: 200 }));
    const client = new FlomoHttpClient(config);

    await expect(client.requestJson("/api/test")).rejects.toMatchObject({
      code: "PARSER_FAILED"
    });
  });

  it("maps already-aborted input signals as cancellation instead of timeout", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("Aborted", "AbortError"));
    const client = new FlomoHttpClient(config);

    await expect(client.requestJson("/api/test", { signal: controller.signal })).rejects.toMatchObject({
      code: "REMOTE_CHANGED",
      message: "flomo 请求已取消。"
    });
  });

  it("maps internal timer aborts as timeout", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const signal = init?.signal;
      return await new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
      });
    });
    const client = new FlomoHttpClient({ ...config, requestTimeoutMs: 10 });

    const request = client.requestJson("/api/test");
    const assertion = expect(request).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT"
    });
    await vi.advanceTimersByTimeAsync(10);

    await assertion;
  });

  it("rejects absolute endpoints from another origin", async () => {
    const client = new FlomoHttpClient(config);
    await expect(client.requestJson("https://example.com/api/test")).rejects.toBeInstanceOf(FlomoRequestError);
  });
});
