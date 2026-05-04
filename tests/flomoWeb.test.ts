import { describe, expect, it } from "vitest";
import { appendQueryString, buildFlomoWebQuery, getFlomoTz } from "../src/core/clients/flomoWeb.js";

describe("buildFlomoWebQuery", () => {
  it("adds deterministic signed flomo Web parameters", () => {
    expect(buildFlomoWebQuery({ tz: "0:0" }, { now: () => 1_710_000_000 })).toEqual({
      tz: "0:0",
      timestamp: 1_710_000_000,
      api_key: "flomo_web",
      app_version: "4.0",
      platform: "web",
      webp: "1",
      sign: "29e1444e245555e5ff5b498234d3df17"
    });
  });
});

describe("appendQueryString", () => {
  it("appends arrays as repeated web parameter keys", () => {
    expect(appendQueryString("/api/v1/memo?existing=1", { tags: ["b", "a"], tz: "0:0" })).toBe(
      "/api/v1/memo?existing=1&tags%5B%5D=b&tags%5B%5D=a&tz=0%3A0"
    );
  });
});

describe("getFlomoTz", () => {
  it("formats a timezone offset for flomo Web", () => {
    expect(getFlomoTz("Asia/Shanghai", new Date("2026-01-01T00:00:00.000Z"))).toBe("8:0");
  });
});
