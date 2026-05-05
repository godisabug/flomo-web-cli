import { describe, expect, it } from "vitest";
import { formatJson } from "../src/formatters/json.js";
import {
  formatCreatedMemo,
  formatMaskedConfigEntries,
  formatMemoDetail,
  formatMemoList,
  formatSyncResult
} from "../src/formatters/human.js";
import type { NoteCache } from "../src/cache/noteCache.js";
import type { Memo } from "../src/core/models/memo.js";
import type { SyncNotesResult } from "../src/core/types/flomo.js";

const memo: Memo = {
  slug: "abc",
  content: "A long memo body that should be shown in a compact way",
  tags: ["#work"],
  url: "https://v.flomoapp.com/memo/abc",
  createdAt: "2026-05-03T00:00:00.000Z",
  updatedAt: "2026-05-03T00:00:00.000Z"
};

const secondMemo: Memo = {
  ...memo,
  slug: "def",
  url: "https://v.flomoapp.com/memo/def"
};

describe("formatJson", () => {
  it("prints stable pretty JSON", () => {
    expect(formatJson({ ok: true })).toBe("{\n  \"ok\": true\n}");
  });
});

describe("human formatters", () => {
  it("formats memo lists", () => {
    expect(formatMemoList([memo])).toBe("2026-05-03 00:00:00 abc #work\nA long memo body that should be shown in a compact way");
  });

  it("formats memo timestamps in configured timezone", () => {
    expect(formatMemoList([memo], "Asia/Shanghai")).toBe(
      "2026-05-03 08:00:00 abc #work\nA long memo body that should be shown in a compact way"
    );
  });

  it("formats empty memo lists", () => {
    expect(formatMemoList([])).toBe("No memos found.");
  });

  it("formats missing memo detail", () => {
    expect(formatMemoDetail(null)).toBe("Memo not found.");
  });

  it("formats created memo", () => {
    expect(formatCreatedMemo(memo)).toContain("Created");
    expect(formatCreatedMemo(memo)).toContain("https://v.flomoapp.com/memo/abc");
  });

  it("formats sync results using total cached count", () => {
    const result: SyncNotesResult = {
      synced: 1,
      totalCached: 2,
      pages: 3,
      complete: false,
      syncedAt: "2026-05-03T01:00:00.000Z",
      items: [memo]
    };

    expect(formatSyncResult(result)).toBe(
      [
        "Synced: 1",
        "Cached: 2",
        "Synced at: 2026-05-03T01:00:00.000Z",
        "Complete: no, more memos may remain beyond the configured page limit.",
        "Pages: 3"
      ].join("\n")
    );
  });

  it("formats sync cache using item count", () => {
    const cache: NoteCache = {
      version: 1,
      syncedAt: "2026-05-03T02:00:00.000Z",
      complete: true,
      items: [memo, secondMemo]
    };

    expect(formatSyncResult(cache)).toBe(
      ["Synced: 2", "Cached: 2", "Synced at: 2026-05-03T02:00:00.000Z", "Complete: yes"].join("\n")
    );
  });

  it("formats masked config entries", () => {
    expect(formatMaskedConfigEntries([{ key: "authorization", maskedValue: "Bearer ***1234" }])).toBe(
      "authorization=Bearer ***1234"
    );
  });

  it("formats empty masked config entries", () => {
    expect(formatMaskedConfigEntries([])).toBe("No user config values set.");
  });

  it("does not accept raw value entries in the primary config formatter API", () => {
    if (false) {
      // @ts-expect-error formatMaskedConfigEntries requires maskedValue, not a raw value field.
      formatMaskedConfigEntries([{ key: "authorization", value: "Bearer raw-secret" }]);
    }

    expect(formatMaskedConfigEntries([{ key: "authorization", maskedValue: "Bearer ***cret" }])).not.toContain(
      "raw-secret"
    );
  });
});
