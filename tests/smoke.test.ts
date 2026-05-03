import { describe, expect, it } from "vitest";

describe("project scaffold", () => {
  it("exposes the CLI package name", async () => {
    const packageJson = await import("../package.json", { with: { type: "json" } });
    expect(packageJson.default.name).toBe("flomo-web-cli");
    expect(packageJson.default.bin["flomo-web"]).toBe("./dist/index.js");
  });
});
