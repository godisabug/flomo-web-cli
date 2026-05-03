import { describe, expect, it } from "vitest";
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

describe("formatCreateContent", () => {
  it("escapes paragraphs and appends tags", () => {
    expect(formatCreateContent("Hello <world>\nSecond", ["work"])).toBe(
      "<p>Hello &lt;world&gt;</p><p>Second</p><p>#work</p>"
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
});
