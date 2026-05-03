export function normalizeTags(tags: string[] | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags ?? []) {
    const trimmed = tag.trim();
    if (!trimmed) {
      continue;
    }

    const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    if (!seen.has(withHash)) {
      seen.add(withHash);
      normalized.push(withHash);
    }
  }

  return normalized;
}

export function extractInlineTags(content: string): string[] {
  const matches = content.match(/#[^\s#]+/g);
  return normalizeTags(matches ?? []);
}
