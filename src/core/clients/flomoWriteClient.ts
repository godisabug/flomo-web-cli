import type { RuntimeConfig } from "../../config/env.js";
import { FlomoRequestError } from "../errors.js";
import type { Memo } from "../models/memo.js";
import { parseMemo } from "../parsers/memoParser.js";
import { normalizeTags } from "../parsers/tagParser.js";
import type { FlomoWriteClient } from "../types/flomo.js";
import { buildFlomoWebQuery, getFlomoTz } from "./flomoWeb.js";
import type { FlomoHttpClient } from "./http.js";

const DEFAULT_WRITE_ENDPOINT = "/api/v1/memo";

export class BearerFlomoWriteClient implements FlomoWriteClient {
  constructor(
    private readonly config: RuntimeConfig,
    private readonly httpClient: FlomoHttpClient
  ) {}

  async create(input: { content: string; tags?: string[] }): Promise<Memo> {
    if (!input.content.trim()) {
      throw new FlomoRequestError("BAD_REQUEST", "memo content 不能为空。");
    }

    const tz = getFlomoTz(this.config.timezone);
    const payload = {
      content: formatCreateContent(input.content, input.tags),
      created_at: formatFlomoLocalDateTime(this.config.timezone),
      source: "web",
      memo_from: "human",
      file_ids: [],
      ...buildFlomoWebQuery({ tz })
    };

    const raw = await this.httpClient.requestJson<unknown>(this.config.writeEndpoint ?? DEFAULT_WRITE_ENDPOINT, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    return parseMemo(extractCreatedMemo(raw), this.config.webBaseUrl);
  }
}

export function formatCreateContent(content: string, tags?: unknown): string {
  const paragraphs = content
    .trim()
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`);

  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.length > 0) {
    paragraphs.push(`<p>${normalizedTags.map(escapeHtml).join(" ")}</p>`);
  }

  return paragraphs.join("");
}

export function formatFlomoLocalDateTime(timezone: string, date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

function extractCreatedMemo(raw: unknown): unknown {
  const direct = tryExtractCreatedMemo(raw);
  if (direct) {
    return direct;
  }

  if (isRecord(raw)) {
    for (const value of Object.values(raw)) {
      const nested = tryExtractCreatedMemo(value);
      if (nested) {
        return nested;
      }
    }
  }

  throw new FlomoRequestError("PARSER_FAILED", "创建接口返回体中找不到 memo 对象。");
}

function tryExtractCreatedMemo(raw: unknown): unknown | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  if (looksLikeMemo(raw)) {
    return raw;
  }

  for (const key of ["memo", "data", "item", "result"]) {
    const candidate = raw[key];
    if (isRecord(candidate) && looksLikeMemo(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function looksLikeMemo(raw: Record<string, unknown>): boolean {
  return ["slug", "memo_slug", "memo_id", "id"].some((key) => raw[key] !== undefined);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
