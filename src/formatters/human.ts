import type { NoteCache } from "../cache/noteCache.js";
import type { Memo } from "../core/models/memo.js";
import type { SyncNotesResult } from "../core/types/flomo.js";
import { summarize } from "../core/utils/text.js";

export function formatMemoList(items: Memo[]): string {
  if (items.length === 0) {
    return "No memos found.";
  }

  return items.map(formatMemoSummary).join("\n\n");
}

export function formatMemoDetail(memo: Memo | null): string {
  if (!memo) {
    return "Memo not found.";
  }

  const tags = memo.tags.length ? `\nTags: ${memo.tags.join(" ")}` : "";
  return [
    `Slug: ${memo.slug}`,
    `URL: ${memo.url}`,
    `Created: ${memo.createdAt}`,
    `Updated: ${memo.updatedAt}${tags}`,
    "",
    memo.content
  ].join("\n");
}

export function formatSyncResult(result: SyncNotesResult | NoteCache): string {
  const synced = "synced" in result ? result.synced : result.items.length;
  const pages = "pages" in result ? `\nPages: ${result.pages}` : "";
  const completeMessage = result.complete ? "Complete: yes" : "Complete: no, more memos may remain beyond the configured page limit.";
  return [`Synced: ${synced}`, `Cached: ${result.items.length}`, `Synced at: ${result.syncedAt}`, completeMessage + pages].join("\n");
}

export function formatCreatedMemo(memo: Memo): string {
  return [`Created: ${memo.slug}`, `URL: ${memo.url}`, `Summary: ${summarize(memo.content)}`].join("\n");
}

export function formatConfigEntries(entries: Array<{ key: string; value: string }>): string {
  if (entries.length === 0) {
    return "No user config values set.";
  }

  return entries.map((entry) => `${entry.key}=${entry.value}`).join("\n");
}

function formatMemoSummary(memo: Memo): string {
  const tags = memo.tags.length ? ` ${memo.tags.join(" ")}` : "";
  return [`${memo.createdAt || "unknown"} ${memo.slug}${tags}`, summarize(memo.content)].join("\n");
}
