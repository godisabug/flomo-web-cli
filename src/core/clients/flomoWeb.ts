export function appendQueryString(endpoint: string, params: Record<string, unknown>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      query.set(key, JSON.stringify(value));
    } else {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  if (!queryString) {
    return endpoint;
  }

  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${queryString}`;
}

export function buildFlomoWebQuery(params: Record<string, unknown>): Record<string, unknown> {
  return params;
}

export function getFlomoTz(timezone: string): string {
  return timezone;
}
