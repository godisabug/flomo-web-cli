import { describe, expect, it } from "vitest";
import { formatJson } from "../src/formatters/json.js";
import { formatMemoList, formatCreatedMemo } from "../src/formatters/human.js";
import type { Memo } from "../src/core/models/memo.js";

const memo: Memo = {
  slug: "abc",
  content: "A long memo body that should be shown in a compact way",
  tags: ["#work"],
  url: "https://v.flomoapp.com/memo/abc",
  createdAt: "2026-05-03T00:00:00.000Z",
  updatedAt: "2026-05-03T00:00:00.000Z"
};

describe("formatJson", () => {
  it("prints stable pretty JSON", () => {
    expect(formatJson({ ok: true })).toBe("{\n  \"ok\": true\n}");
  });
});

describe("human formatters", () => {
  it("formats memo lists", () => {
    expect(formatMemoList([memo])).toContain("abc");
    expect(formatMemoList([memo])).toContain("#work");
  });

  it("formats created memo", () => {
    expect(formatCreatedMemo(memo)).toContain("Created");
    expect(formatCreatedMemo(memo)).toContain("https://v.flomoapp.com/memo/abc");
  });
});
