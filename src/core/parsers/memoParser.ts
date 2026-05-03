import type { Memo } from "../models/memo.js";
import { FlomoParseError } from "../errors.js";
import { stripHtml } from "../utils/text.js";
import { extractInlineTags, normalizeTags } from "./tagParser.js";

export function parseMemo(raw: unknown, webBaseUrl: string): Memo {
  if (!isRecord(raw)) {
    throw new FlomoParseError("memo 数据不是对象。");
  }

  const slug = pickString(raw, ["slug", "memo_slug", "memo_id", "id"]);
  if (!slug) {
    throw new FlomoParseError("memo 缺少 slug。");
  }

  const html = pickString(raw, ["content", "html"]);
  const plainText = pickString(raw, ["text", "plain_text", "plainText"]);
  const content = plainText ?? (html ? stripHtml(html) : "");
  const createdAt = normalizeDate(raw.created_at ?? raw.createdAt ?? raw.created_time ?? raw.created) ?? "";
  const updatedAt = normalizeDate(raw.updated_at ?? raw.updatedAt ?? raw.updated_time ?? raw.modified_at ?? raw.modified) ?? createdAt;
  const rawTags = pickStringArray(raw, ["tags", "tag_list"]);
  const tags = normalizeTags(rawTags.length > 0 ? rawTags : extractInlineTags(content));

  return {
    slug,
    content,
    ...(html ? { html } : {}),
    tags,
    url: `${webBaseUrl.replace(/\/+$/, "")}/memo/${encodeURIComponent(slug)}`,
    createdAt,
    updatedAt
  };
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return undefined;
}

function pickStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
  }

  return [];
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(millis).toISOString();
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
