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
  it("signs the default flomo Web read endpoint", async () => {
    let capturedEndpoint = "";
    const httpClient = {
      requestJson: async (endpoint: string) => {
        capturedEndpoint = endpoint;
        return { data: [] };
      }
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;
    const client = new BearerFlomoReadClient(config, httpClient);

    await client.list();

    const url = new URL(capturedEndpoint, config.baseUrl);
    expect(url.pathname).toBe("/api/v1/memo/latest_updated_desc");
    expect(url.searchParams.get("tz")).toBe("8:0");
    expect(url.searchParams.get("api_key")).toBe("flomo_web");
    expect(url.searchParams.get("app_version")).toBe("4.0");
    expect(url.searchParams.get("platform")).toBe("web");
    expect(url.searchParams.get("webp")).toBe("1");
    expect(url.searchParams.get("timestamp")).toMatch(/^\d+$/);
    expect(url.searchParams.get("sign")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("signs sync pagination parameters", async () => {
    let capturedEndpoint = "";
    const httpClient = {
      requestJson: async (endpoint: string) => {
        capturedEndpoint = endpoint;
        return { data: [] };
      }
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;
    const client = new BearerFlomoReadClient(config, httpClient);

    await client.syncAll({ pageSize: 50, maxPages: 1 });

    const url = new URL(capturedEndpoint, config.baseUrl);
    expect(url.pathname).toBe("/api/v1/memo/updated/");
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("latest_updated_at")).toBe("0");
    expect(url.searchParams.get("latest_slug")).toBe("");
    expect(url.searchParams.get("tz")).toBe("8:0");
    expect(url.searchParams.get("sign")).toMatch(/^[a-f0-9]{32}$/);
  });

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

  it("lists memos by created time descending before applying limit", async () => {
    const httpClient = {
      requestJson: async () => ({
        data: [
          { slug: "updated-first", content: "Updated first", created_at: "2026-01-26T03:06:08.000Z", updated_at: "2026-05-15T03:28:26.000Z" },
          { slug: "newest-created", content: "Newest created", created_at: "2026-05-15T03:28:26.000Z", updated_at: "2026-05-15T03:28:26.000Z" },
          { slug: "middle-created", content: "Middle created", created_at: "2026-05-14T07:37:21.000Z", updated_at: "2026-05-14T07:37:21.000Z" }
        ]
      })
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;
    const client = new BearerFlomoReadClient(config, httpClient);

    await expect(client.list(2)).resolves.toMatchObject([{ slug: "newest-created" }, { slug: "middle-created" }]);
  });

  it("syncs image-only memos without failing the whole page", async () => {
    const httpClient = {
      requestJson: async () => ({
        data: [
          { slug: "text", content: "<p>Hello</p>", updated_at: 1710000100 },
          {
            slug: "image-only",
            content: "",
            files: [
              {
                type: "image",
                name: "1780979216007_7GohGHyY.jpg",
                size: 129187,
                url: "https://cdn.example.com/image.jpg",
                thumbnail_url: "https://cdn.example.com/image-thumb.jpg",
                path: "memo/images/1780979216007_7GohGHyY.jpg"
              }
            ],
            updated_at: 1710000000
          }
        ]
      })
    } as Pick<FlomoHttpClient, "requestJson"> as FlomoHttpClient;
    const client = new BearerFlomoReadClient(config, httpClient);

    await expect(client.syncAll({ pageSize: 10, maxPages: 1 })).resolves.toMatchObject({
      synced: 2,
      complete: true,
      items: [
        { slug: "text", content: "Hello" },
        {
          slug: "image-only",
          content: "",
          files: [
            {
              type: "image",
              name: "1780979216007_7GohGHyY.jpg",
              size: 129187,
              url: "https://cdn.example.com/image.jpg",
              thumbnailUrl: "https://cdn.example.com/image-thumb.jpg",
              path: "memo/images/1780979216007_7GohGHyY.jpg"
            }
          ]
        }
      ]
    });
  });
});
