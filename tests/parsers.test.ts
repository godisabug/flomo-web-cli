import { describe, expect, it } from "vitest";
import { toPublicError, FlomoRequestError } from "../src/core/errors.js";
import { parseMemo } from "../src/core/parsers/memoParser.js";
import { normalizeTags } from "../src/core/parsers/tagParser.js";

describe("tag parser", () => {
  it("normalizes tags with a leading hash", () => {
    expect(normalizeTags(["work", "#daily", "  idea  ", ""])).toEqual(["#work", "#daily", "#idea"]);
  });

  it("deduplicates normalized tags", () => {
    expect(normalizeTags(["work", "#work", "Work"])).toEqual(["#work", "#Work"]);
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
      url: "https://v.flomoapp.com/memo/abc123",
      createdAt: "2026-05-03T10:00:00.000Z",
      updatedAt: "2026-05-03T11:00:00.000Z"
    });
  });
});

describe("public errors", () => {
  it("maps known flomo errors", () => {
    const error = new FlomoRequestError("BAD_REQUEST", "bad input");
    expect(toPublicError(error)).toEqual({ code: "BAD_REQUEST", message: "bad input" });
  });
});
