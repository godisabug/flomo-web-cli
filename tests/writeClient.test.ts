import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeConfig } from "../src/config/env.js";
import {
  BearerFlomoWriteClient,
  formatCreateContent,
  formatFlomoLocalDateTime
} from "../src/core/clients/flomoWriteClient.js";
import type { FlomoHttpClient } from "../src/core/clients/http.js";

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
  vi.useRealTimers();
});

describe("formatCreateContent", () => {
  it("escapes paragraphs and appends tags", () => {
    expect(formatCreateContent("Hello <world>\nSecond", ["work"])).toBe(
      "<p>Hello &lt;world&gt;</p><p>Second</p><p>#work</p>"
    );
  });

  it("escapes special characters, deduplicates tags, and collapses blank lines", () => {
    expect(formatCreateContent('First & "quote"\n\nSecond\'s <line>', ["#work", "work", "life"])).toBe(
      "<p>First &amp; &quot;quote&quot;</p><p>Second&#39;s &lt;line&gt;</p><p>#work #life</p>"
    );
  });
});

describe("formatFlomoLocalDateTime", () => {
  it("formats a timezone-local timestamp", () => {
    expect(formatFlomoLocalDateTime("UTC", new Date("2026-05-03T01:02:03.000Z"))).toBe("2026-05-03 01:02:03");
  });
});

describe("BearerFlomoWriteClient", () => {
  it("creates a memo and parses the response", async () => {
    const httpClient = {
      requestJson: async (_endpoint: string, init?: RequestInit) => {
        expect(init?.method).toBe("PUT");
        expect(init?.body).toContain("Hello");
        return {
          memo: {
            slug: "created",
            content: "<p>Hello</p>",
            created_at: "2026-05-03T00:00:00.000Z",
            updated_at: "2026-05-03T00:00:00.000Z"
          }
        };
      }
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;

    const client = new BearerFlomoWriteClient(config, httpClient);
    await expect(client.create({ content: "Hello" })).resolves.toMatchObject({ slug: "created", content: "Hello" });
  });

  it("sends the create payload contract", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-03T00:00:00.000Z"));

    const httpClient = {
      requestJson: async (endpoint: string, init?: RequestInit) => {
        expect(endpoint).toBe("/api/v1/memo");
        expect(init?.method).toBe("PUT");
        expect(init?.headers).toMatchObject({ "Content-Type": "application/json" });

        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body).toMatchObject({
          content: "<p>Hello</p><p>#work</p>",
          source: "web",
          memo_from: "human",
          file_ids: [],
          tz: "8:0",
          api_key: "flomo_web",
          app_version: "4.0",
          platform: "web",
          webp: "1",
          created_at: "2026-05-03 08:00:00",
          timestamp: 1_777_766_400,
          sign: "7fdd0261e9e0b46b1be77a2d3de52897"
        });

        return {
          memo: {
            slug: "created",
            content: "<p>Hello</p>",
            created_at: "2026-05-03T00:00:00.000Z",
            updated_at: "2026-05-03T00:00:00.000Z"
          }
        };
      }
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;

    const client = new BearerFlomoWriteClient(config, httpClient);
    await expect(client.create({ content: "Hello", tags: ["work"] })).resolves.toMatchObject({ slug: "created" });
  });

  it("extracts a nested memo instead of an envelope with an id", async () => {
    const httpClient = {
      requestJson: async () => ({
        data: {
          id: "envelope",
          memo: {
            slug: "created",
            content: "<p>Hello</p>",
            created_at: "2026-05-03T00:00:00.000Z",
            updated_at: "2026-05-03T00:00:00.000Z"
          }
        }
      })
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;

    const client = new BearerFlomoWriteClient(config, httpClient);
    await expect(client.create({ content: "Hello" })).resolves.toMatchObject({ slug: "created", content: "Hello" });
  });

  it("rejects blank content", async () => {
    const httpClient = {
      requestJson: async () => {
        throw new Error("request should not be sent");
      }
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;

    const client = new BearerFlomoWriteClient(config, httpClient);
    await expect(client.create({ content: " \n\t " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "memo content 不能为空。"
    });
  });
});
