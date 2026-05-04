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
    expect(readme).toContain("Current source/local development");
    expect(readme).toContain("npm install");
    expect(readme).toContain("npm run build");
    expect(readme).toContain("npm link");
    expect(readme).toContain("After publication");
    expect(readme).not.toContain(["Bearer", "real"].join(" "));

    const localInstallIndex = readme.indexOf("Current source/local development");
    const publicationIndex = readme.indexOf("After publication");
    const globalInstallIndex = readme.indexOf("npm install -g flomo-web-cli");

    expect(localInstallIndex).toBeGreaterThan(-1);
    expect(publicationIndex).toBeGreaterThan(localInstallIndex);
    expect(globalInstallIndex).toBeGreaterThan(publicationIndex);
  });
});
