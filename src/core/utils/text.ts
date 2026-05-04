const htmlEntityMap: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " "
};

export function stripHtml(value: string): string {
  return htmlToText(value);
}

export function htmlToText(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&([a-z]+);/gi, (_, entity: string) => htmlEntityMap[entity.toLowerCase()] ?? `&${entity};`)
      .replace(/&#(\d+);/g, (entity: string, code: string) => decodeNumericHtmlEntity(entity, code))
  );
}

export function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
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
