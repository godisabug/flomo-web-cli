import { describe, expect, it } from "vitest";
import { BearerFlomoReadClient, filterMemos } from "../src/core/clients/flomoReadClient.js";
import type { FlomoHttpClient } from "../src/core/clients/http.js";
import type { RuntimeConfig } from "../src/config/env.js";
import type { Memo } from "../src/core/models/memo.js";

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

function memo(slug: string, content: string): Memo {
  return { slug, content, tags: [], url: `https://v.flomoapp.com/memo/${slug}`, createdAt: "", updatedAt: "" };
}

describe("filterMemos", () => {
  it("searches content and tags with limit", () => {
    const items = [
      { ...memo("1", "alpha"), tags: ["#work"] },
      memo("2", "beta alpha"),
      memo("3", "gamma")
    ];

    expect(filterMemos(items, "alpha", 1).map((item) => item.slug)).toEqual(["1"]);
    expect(filterMemos(items, "work", 10).map((item) => item.slug)).toEqual(["1"]);
  });
});

describe("BearerFlomoReadClient", () => {
  it("lists recent memos from common response shape", async () => {
    const httpClient = {
      requestJson: async () => ({
        data: [
          { slug: "abc", content: "<p>Hello</p>", created_at: 1710000000, updated_at: 1710000000 }
        ]
      })
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;
    const client = new BearerFlomoReadClient(config, httpClient);

    await expect(client.list()).resolves.toMatchObject([{ slug: "abc", content: "Hello" }]);
  });
});
