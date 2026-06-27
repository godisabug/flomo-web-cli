import { describe, expect, it } from "vitest";
import { selectRandomMemo } from "../src/core/randomMemo.js";
import type { Memo } from "../src/core/models/memo.js";

function memo(slug: string, tags: string[]): Memo {
  return {
    slug,
    content: `${slug} content`,
    tags,
    url: `https://v.flomoapp.com/memo/${slug}`,
    createdAt: "2026-05-03T00:00:00.000Z",
    updatedAt: "2026-05-03T00:00:00.000Z"
  };
}

describe("selectRandomMemo", () => {
  it("selects from all memos when no filters are provided", () => {
    const result = selectRandomMemo([memo("a", []), memo("b", []), memo("c", [])], {}, () => 0.75);

    expect(result.memo?.slug).toBe("c");
    expect(result.candidateCount).toBe(3);
    expect(result.filters).toEqual({ tags: [], excludeTags: [] });
  });

  it("normalizes filter tags", () => {
    const result = selectRandomMemo([memo("a", ["#work"])], { tags: ["work"], excludeTags: ["#private"] }, () => 0);

    expect(result.filters).toEqual({ tags: ["#work"], excludeTags: ["#private"] });
  });

  it("matches any whitelist tag", () => {
    const items = [memo("a", ["#work"]), memo("b", ["#idea"]), memo("c", ["#private"])] ;
    const result = selectRandomMemo(items, { tags: ["work", "idea"] }, () => 0.6);

    expect(result.memo?.slug).toBe("b");
    expect(result.candidateCount).toBe(2);
  });

  it("excludes any blacklist tag", () => {
    const items = [memo("a", ["#work"]), memo("b", ["#private"]), memo("c", ["#archive"])] ;
    const result = selectRandomMemo(items, { excludeTags: ["private", "archive"] }, () => 0.99);

    expect(result.memo?.slug).toBe("a");
    expect(result.candidateCount).toBe(1);
  });

  it("gives blacklist precedence over whitelist", () => {
    const items = [memo("a", ["#work", "#private"]), memo("b", ["#work"])] ;
    const result = selectRandomMemo(items, { tags: ["work"], excludeTags: ["private"] }, () => 0);

    expect(result.memo?.slug).toBe("b");
    expect(result.candidateCount).toBe(1);
  });

  it("matches hierarchical tag prefixes without matching unrelated prefixes", () => {
    const items = [memo("a", ["#work/project"]), memo("b", ["#workshop"])] ;
    const result = selectRandomMemo(items, { tags: ["work"] }, () => 0);

    expect(result.memo?.slug).toBe("a");
    expect(result.candidateCount).toBe(1);
  });

  it("returns null when filters leave no candidates", () => {
    const result = selectRandomMemo([memo("a", ["#work"])], { tags: ["missing"] }, () => 0);

    expect(result.memo).toBeNull();
    expect(result.candidateCount).toBe(0);
  });
});
