const htmlEntityMap: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " "
};

const htmlBlockBoundaryTags =
  "address|article|aside|blockquote|dd|details|dialog|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|main|nav|p|pre|section|tr";
const htmlBlockBoundaryPattern = new RegExp(`</(?:${htmlBlockBoundaryTags})\\s*>`, "gi");

export function stripHtml(value: string): string {
  return htmlToText(value);
}

export function htmlToText(value: string): string {
  return trimBoundaryLineBreaks(
    decodeHtmlEntities(
      normalizeLineEndings(value)
        .replace(/<br\b[^>]*>/gi, "\n")
        .replace(/<hr\b[^>]*>/gi, "\n")
        .replace(/<li\b[^>]*>/gi, "- ")
        .replace(/<\/li\s*>/gi, "\n")
        .replace(/<\/t[dh]\s*>/gi, "\t")
        .replace(htmlBlockBoundaryPattern, "\n")
        .replace(/<[^>]*>/g, "")
    )
  );
}

export function normalizeMemoText(value: string): string {
  return normalizeLineEndings(value);
}

export function normalizeWhitespace(value: string): string {
  return normalizeLineEndings(value)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function summarize(value: string, maxLength = 80): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function decodeNumericHtmlEntity(entity: string, code: string): string {
  const codePoint = Number(code);
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return entity;
  }

  return String.fromCodePoint(codePoint);
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&([a-z]+);/gi, (_, entity: string) => htmlEntityMap[entity.toLowerCase()] ?? `&${entity};`)
    .replace(/&#(\d+);/g, (entity: string, code: string) => decodeNumericHtmlEntity(entity, code));
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[\u2028\u2029]/g, "\n");
}

function trimBoundaryLineBreaks(value: string): string {
  return value.replace(/^\n+/, "").replace(/\n+$/, "");
}
