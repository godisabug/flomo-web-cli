import { createHash } from "node:crypto";
const FLOMO_WEB_SIGN_SECRET = "dbbc3dd73364b4084c3a69346e0ce2b2";
const DEFAULT_API_KEY = "flomo_web";
const DEFAULT_APP_VERSION = "4.0";
const DEFAULT_PLATFORM = "web";
export function buildFlomoWebQuery(params = {}, options = {}) {
    const query = {
        ...params,
        timestamp: options.now?.() ?? Math.floor(Date.now() / 1000),
        api_key: options.apiKey ?? DEFAULT_API_KEY,
        app_version: options.appVersion ?? DEFAULT_APP_VERSION,
        platform: options.platform ?? DEFAULT_PLATFORM
    };
    if (options.webp ?? true) {
        query.webp = "1";
    }
    return {
        ...query,
        sign: signFlomoWebParams(query)
    };
}
export function appendQueryString(endpoint, params) {
    const query = toUrlSearchParams(params).toString();
    if (!query) {
        return endpoint;
    }
    return `${endpoint}${endpoint.includes("?") ? "&" : "?"}${query}`;
}
export function getFlomoTz(timezone, date = new Date()) {
    const offsetMinutes = getTimeZoneOffsetMinutes(timezone, date);
    const sign = offsetMinutes < 0 ? -1 : 1;
    const absoluteOffset = Math.abs(offsetMinutes);
    const hours = Math.trunc(absoluteOffset / 60) * sign;
    const minutes = absoluteOffset % 60;
    return `${hours}:${minutes}`;
}
function signFlomoWebParams(params) {
    const sortedKeys = Object.keys(params).sort();
    let payload = "";
    for (const key of sortedKeys) {
        const value = params[key];
        if (!isSignableValue(value)) {
            continue;
        }
        if (Array.isArray(value)) {
            const values = [...value].sort((left, right) => String(left).localeCompare(String(right)));
            for (const item of values) {
                payload += `${key}[]=${String(item)}&`;
            }
            continue;
        }
        payload += `${key}=${String(value)}&`;
    }
    payload = payload.substring(0, payload.length - 1);
    return createHash("md5").update(`${payload}${FLOMO_WEB_SIGN_SECRET}`, "utf8").digest("hex");
}
function toUrlSearchParams(params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) {
            continue;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                searchParams.append(`${key}[]`, String(item));
            }
            continue;
        }
        searchParams.append(key, String(value));
    }
    return searchParams;
}
function isSignableValue(value) {
    return Array.isArray(value) || Boolean(value) || value === 0;
}
function getTimeZoneOffsetMinutes(timezone, date) {
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
    const values = new Map(parts.map((part) => [part.type, part.value]));
    const utcMilliseconds = Date.UTC(Number(values.get("year")), Number(values.get("month")) - 1, Number(values.get("day")), Number(values.get("hour")), Number(values.get("minute")), Number(values.get("second")));
    return Math.round((utcMilliseconds - date.getTime()) / 60_000);
}
