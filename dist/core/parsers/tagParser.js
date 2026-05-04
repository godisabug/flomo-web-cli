export function normalizeTags(input) {
    const rawTags = toTagStrings(input);
    const seen = new Set();
    const normalized = [];
    for (const tag of rawTags) {
        const withHash = normalizeOneTag(tag);
        if (!withHash || seen.has(withHash)) {
            continue;
        }
        seen.add(withHash);
        normalized.push(withHash);
    }
    return normalized;
}
export function extractInlineTags(content) {
    const matches = content.match(/#[\p{L}\p{N}_/-]+/gu) ?? [];
    return normalizeTags(matches);
}
function normalizeOneTag(tag) {
    const cleaned = tag.trim().replace(/^#+/, "");
    if (!cleaned) {
        return undefined;
    }
    return `#${cleaned}`;
}
function toTagStrings(input) {
    if (Array.isArray(input)) {
        return input.flatMap((item) => toTagStrings(item));
    }
    if (typeof input === "string") {
        return input.split(/[\s,，]+/).filter(Boolean);
    }
    if (isRecord(input)) {
        const namedTag = input.name ?? input.title ?? input.text ?? input.label;
        if (typeof namedTag === "string") {
            return [namedTag];
        }
        return Object.entries(input).flatMap(([key, value]) => {
            if (value === true) {
                return [key];
            }
            return toTagStrings(value);
        });
    }
    return [];
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
