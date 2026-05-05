import type { NoteCache } from "../cache/noteCache.js";
import type { Memo } from "../core/models/memo.js";
import type { SyncNotesResult } from "../core/types/flomo.js";
import { summarize } from "../core/utils/text.js";

export interface MaskedConfigEntry {
  key: string;
  maskedValue: string;
}

export function formatMemoList(items: Memo[], timezone = "UTC"): string {
  if (items.length === 0) {
    return "No memos found.";
  }

  return items.map((memo) => formatMemoSummary(memo, timezone)).join("\n\n");
}

export function formatMemoDetail(memo: Memo | null, timezone = "UTC"): string {
  if (!memo) {
    return "Memo not found.";
  }

  const tags = memo.tags.length ? `\nTags: ${memo.tags.join(" ")}` : "";
  return [
    `Slug: ${memo.slug}`,
    `URL: ${memo.url}`,
    `Created: ${formatMemoTimestamp(memo.createdAt, timezone)}`,
    `Updated: ${formatMemoTimestamp(memo.updatedAt, timezone)}${tags}`,
    "",
    memo.content
  ].join("\n");
}

export function formatSyncResult(result: SyncNotesResult | NoteCache): string {
  const synced = "synced" in result ? result.synced : result.items.length;
  const cached = "totalCached" in result ? result.totalCached : result.items.length;
  const pages = "pages" in result ? `\nPages: ${result.pages}` : "";
  const completeMessage = result.complete ? "Complete: yes" : "Complete: no, more memos may remain beyond the configured page limit.";
  return [`Synced: ${synced}`, `Cached: ${cached}`, `Synced at: ${result.syncedAt}`, completeMessage + pages].join("\n");
}

export function formatCreatedMemo(memo: Memo): string {
  return [`Created: ${memo.slug}`, `URL: ${memo.url}`, `Summary: ${summarize(memo.content)}`].join("\n");
}

export function formatMaskedConfigEntries(entries: MaskedConfigEntry[]): string {
  if (entries.length === 0) {
    return "No user config values set.";
  }

  return entries.map((entry) => `${entry.key}=${entry.maskedValue}`).join("\n");
}

function formatMemoSummary(memo: Memo, timezone: string): string {
  const tags = memo.tags.length ? ` ${memo.tags.join(" ")}` : "";
  return [`${formatMemoTimestamp(memo.createdAt, timezone)} ${memo.slug}${tags}`, summarize(memo.content)].join("\n");
}

function formatMemoTimestamp(value: string, timezone: string): string {
  if (!value) {
    return "unknown";
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(parsed));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}
