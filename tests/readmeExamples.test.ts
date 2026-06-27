import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("README", () => {
  it("documents required commands and security notes", async () => {
    const readme = await readFile("README.md", "utf8");
    const englishReadme = await readFile("README.en.md", "utf8");

    expect(readme).toContain("# flomo-web-cli");
    expect(readme).toContain("[English](README.en.md)");
    expect(readme).toContain("## 风险声明");
    expect(readme).toContain("本项目不是 flomo 官方项目");
    expect(readme).toContain("项目开发者和贡献者不对上述风险造成的直接或间接损失承担责任");
    expect(readme).toContain("## 相关项目");
    expect(readme).toContain("https://github.com/godisabug/flomo-web-mcp");
    expect(readme).toContain("flomo-web list");
    expect(readme).toContain("flomo-web search");
    expect(readme).toContain("flomo-web sync");
    expect(readme).toContain("flomo-web get");
    expect(readme).toContain("flomo-web create");
    expect(readme).toContain("flomo-web config");
    expect(readme).toContain("flomo-web random");
    expect(readme).toContain("flomo-web random --no-sync");
    expect(readme).toContain("flomo-web random --tag work --tag idea");
    expect(readme).toContain("flomo-web random --exclude-tag private");
    expect(readme).toContain("flomo-web random --json");
    expect(readme).toContain("默认会先尝试同步最新 memo");
    expect(readme).toContain("如果同步失败但本地缓存可用");
    expect(readme).toContain("flomo-web sync --page-size 200 --max-pages 50");
    expect(readme).toContain("Authorization");
    expect(readme).toContain("缓存");
    expect(readme).toContain("当前源码/本地开发");
    expect(readme).toContain("npm install");
    expect(readme).toContain("npm run build");
    expect(readme).toContain("npm link");
    expect(readme).toContain("发布后");
    expect(readme).not.toContain(["Bearer", "real"].join(" "));
    expect(englishReadme).toContain("Current source/local development");
    expect(englishReadme).toContain("flomo-web random");
    expect(englishReadme).toContain("flomo-web random --no-sync");
    expect(englishReadme).toContain("flomo-web random --tag work --tag idea");
    expect(englishReadme).toContain("flomo-web random --exclude-tag private");
    expect(englishReadme).toContain("flomo-web random --json");
    expect(englishReadme).toContain("tries to refresh memos first");
    expect(englishReadme).toContain("if refresh fails and a valid local cache exists");
    expect(englishReadme).toContain("flomo-web sync --page-size 200 --max-pages 50");

    const localInstallIndex = readme.indexOf("当前源码/本地开发");
    const publicationIndex = readme.indexOf("发布后");
    const globalInstallIndex = readme.indexOf("npm install -g flomo-web-cli");

    expect(localInstallIndex).toBeGreaterThan(-1);
    expect(publicationIndex).toBeGreaterThan(localInstallIndex);
    expect(globalInstallIndex).toBeGreaterThan(publicationIndex);
  });
});
