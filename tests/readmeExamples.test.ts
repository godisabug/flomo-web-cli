import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("README", () => {
  it("documents required commands and security notes", async () => {
    const readme = await readFile("README.md", "utf8");
    expect(readme).toContain("flomo-web list");
    expect(readme).toContain("flomo-web search");
    expect(readme).toContain("flomo-web sync");
    expect(readme).toContain("flomo-web get");
    expect(readme).toContain("flomo-web create");
    expect(readme).toContain("flomo-web config");
    expect(readme).toContain("Authorization");
    expect(readme).toContain("cache");
    expect(readme).not.toContain("Bearer real");
  });
});
