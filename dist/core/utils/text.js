const htmlEntityMap = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " "
};
export function stripHtml(value) {
    return htmlToText(value);
}
export function htmlToText(value) {
    return normalizeWhitespace(value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&([a-z]+);/gi, (_, entity) => htmlEntityMap[entity.toLowerCase()] ?? `&${entity};`)
        .replace(/&#(\d+);/g, (entity, code) => decodeNumericHtmlEntity(entity, code)));
}
export function normalizeWhitespace(value) {
    return value
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .trim();
}
export function summarize(value, maxLength = 80) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) {
        return normalized;
    }
    return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}
function decodeNumericHtmlEntity(entity, code) {
    const codePoint = Number(code);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return entity;
    }
    return String.fromCodePoint(codePoint);
}
