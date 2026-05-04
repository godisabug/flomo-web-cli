import { describe, expect, it } from "vitest";
import { toPublicError, FlomoParseError, FlomoRequestError } from "../src/core/errors.js";
import { parseMemo } from "../src/core/parsers/memoParser.js";
import { extractInlineTags, normalizeTags } from "../src/core/parsers/tagParser.js";

describe("tag parser", () => {
  it("normalizes tags with a leading hash", () => {
    expect(normalizeTags(["work", "#daily", "  idea  ", ""])).toEqual(["#work", "#daily", "#idea"]);
  });

  it("deduplicates normalized tags", () => {
    expect(normalizeTags(["work", "#work", "Work"])).toEqual(["#work", "#Work"]);
  });

  it("normalizes tag strings split by whitespace and punctuation", () => {
    expect(normalizeTags("work,#daily，idea inbox")).toEqual(["#work", "#daily", "#idea", "#inbox"]);
  });

  it("normalizes object maps and nested tag shapes", () => {
    expect(
      normalizeTags({
        MCP: true,
        ignored: false,
        primary: { name: "知识管理" },
        secondary: { title: "reading" },
        extra: ["flomo", ["#daily", { label: "archive" }]],
        textLike: { text: "idea" }
      })
    ).toEqual(["#MCP", "#知识管理", "#reading", "#flomo", "#daily", "#archive", "#idea"]);
  });

  it("extracts unicode inline tags", () => {
    expect(extractInlineTags("hello #flomo #知识管理 #project/a-b")).toEqual(["#flomo", "#知识管理", "#project/a-b"]);
  });
});

describe("memo parser", () => {
  it("parses common flomo memo fields", () => {
    const memo = parseMemo(
      {
        slug: "abc123",
        content: "<p>Hello #tag</p>",
        tags: ["tag"],
        created_at: "2026-05-03T10:00:00.000Z",
        updated_at: "2026-05-03T11:00:00.000Z"
      },
      "https://v.flomoapp.com"
    );

    expect(memo).toEqual({
      slug: "abc123",
      content: "Hello #tag",
      html: "<p>Hello #tag</p>",
      tags: ["#tag"],
      url: "https://v.flomoapp.com/mine/?memo_id=abc123",
      createdAt: "2026-05-03T10:00:00.000Z",
      updatedAt: "2026-05-03T11:00:00.000Z"
    });
  });

  it("merges API tags with inline tags", () => {
    const memo = parseMemo(
      {
        slug: "merged",
        content: "<p>Hello #inline #知识管理</p>",
        tags: ["api", "#inline"],
        tag_list: [{ name: "list" }]
      },
      "https://v.flomoapp.com"
    );

    expect(memo.tags).toEqual(["#api", "#inline", "#list", "#知识管理"]);
  });

  it("parses tag_names and labels tag sources", () => {
    const memo = parseMemo(
      {
        slug: "labels",
        summary: "Plain summary",
        tag_names: "one,two",
        labels: { three: true, four: { label: "nested" } }
      },
      "https://v.flomoapp.com"
    );

    expect(memo.tags).toEqual(["#one", "#two", "#three", "#nested"]);
  });

  it("parses rich text content aliases", () => {
    const memo = parseMemo(
      {
        slug: "rich",
        rich_text: "<div>Hello&nbsp;<strong>world</strong></div>",
        created_at: "2026-05-03T10:00:00.000Z"
      },
      "https://v.flomoapp.com"
    );

    expect(memo.content).toBe("Hello world");
    expect(memo.html).toBe("<div>Hello&nbsp;<strong>world</strong></div>");
  });

  it("normalizes plain summary content", () => {
    const memo = parseMemo(
      {
        slug: "summary",
        summary: "  Line one \n\n\n Line two  "
      },
      "https://v.flomoapp.com"
    );

    expect(memo.content).toBe("Line one\n\nLine two");
    expect(memo.html).toBeUndefined();
  });

  it("preserves raw memo URLs", () => {
    const memo = parseMemo(
      {
        slug: "with-url",
        content: "Hello",
        share_url: "https://example.com/share/with-url"
      },
      "https://v.flomoapp.com"
    );

    expect(memo.url).toBe("https://example.com/share/with-url");
  });

  it("normalizes numeric timestamps", () => {
    const memo = parseMemo(
      {
        slug: "numeric-time",
        content: "Hello",
        created_at: 1710000000,
        updated_at: 1710000100000
      },
      "https://v.flomoapp.com"
    );

    expect(memo.createdAt).toBe("2024-03-09T16:00:00.000Z");
    expect(memo.updatedAt).toBe("2024-03-09T16:01:40.000Z");
  });

  it("fails when memo content is missing", () => {
    expect(() => parseMemo({ slug: "empty" }, "https://v.flomoapp.com")).toThrow(FlomoParseError);
  });

  it("preserves invalid numeric HTML entities", () => {
    const memo = parseMemo(
      {
        slug: "bad-entity",
        content: "<p>Hello &#999999999999; world</p>"
      },
      "https://v.flomoapp.com"
    );

    expect(memo.content).toBe("Hello &#999999999999; world");
  });
});

describe("public errors", () => {
  it("maps known flomo errors", () => {
    const error = new FlomoRequestError("BAD_REQUEST", "bad input");
    expect(toPublicError(error)).toEqual({ code: "BAD_REQUEST", message: "bad input" });
  });
});
