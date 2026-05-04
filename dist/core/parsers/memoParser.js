import { FlomoParseError } from "../errors.js";
import { htmlToText, normalizeWhitespace } from "../utils/text.js";
import { extractInlineTags, normalizeTags } from "./tagParser.js";
export function parseMemo(raw, webBaseUrl) {
    if (!isRecord(raw)) {
        throw new FlomoParseError("memo 数据不是对象。");
    }
    const slug = pickString(raw, ["slug", "memo_slug", "memo_id", "id"]);
    if (!slug) {
        throw new FlomoParseError("memo 缺少 slug。");
    }
    const html = pickString(raw, ["html", "content", "rich_text", "source_content"]);
    const plainText = pickString(raw, ["plain_text", "text", "summary", "plainText"]);
    const contentSource = plainText ?? html;
    if (!contentSource) {
        throw new FlomoParseError("memo 缺少 content/html/text 字段。");
    }
    const content = looksLikeHtml(contentSource) ? htmlToText(contentSource) : normalizeWhitespace(contentSource);
    const createdAt = normalizeDate(raw.created_at ?? raw.createdAt ?? raw.created_time ?? raw.created) ?? "";
    const updatedAt = normalizeDate(raw.updated_at ?? raw.updatedAt ?? raw.updated_time ?? raw.modified_at ?? raw.modified) ?? createdAt;
    const apiTags = normalizeTags([raw.tags, raw.tag_list, raw.tag_names, raw.labels]);
    const inlineTags = extractInlineTags(content);
    const tags = normalizeTags([...apiTags, ...inlineTags]);
    const url = pickString(raw, ["url", "link", "share_url"]) ?? buildMemoUrl(webBaseUrl, slug);
    return {
        slug,
        content,
        ...(html && looksLikeHtml(html) ? { html } : {}),
        tags,
        url,
        createdAt,
        updatedAt
    };
}
function buildMemoUrl(baseUrl, slug) {
    return `${baseUrl.replace(/\/+$/, "")}/mine/?memo_id=${encodeURIComponent(slug)}`;
}
function pickString(record, keys) {
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
function normalizeDate(value) {
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
function looksLikeHtml(value) {
    return /<\/?[a-z][\s\S]*>/i.test(value);
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
