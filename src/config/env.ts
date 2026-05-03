import { config as loadDotenv } from "dotenv";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface RuntimeConfig {
  authorization?: string;
  cookie?: string;
  userAgent: string;
  baseUrl: string;
  webBaseUrl: string;
  timezone: string;
  logLevel: LogLevel;
  readEndpoint?: string;
  syncEndpoint?: string;
  writeEndpoint?: string;
  deviceId: string;
  deviceModel: string;
  webPlatform: string;
  requestTimeoutMs: number;
}

export type PartialRuntimeConfig = Partial<RuntimeConfig>;

const EnvSchema = z.object({
  FLOMO_AUTHORIZATION: z.string().optional(),
  FLOMO_COOKIE: z.string().optional(),
  FLOMO_USER_AGENT: z.string().optional(),
  FLOMO_BASE_URL: z.string().optional(),
  FLOMO_WEB_BASE_URL: z.string().optional(),
  FLOMO_TIMEZONE: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  FLOMO_READ_ENDPOINT: z.string().optional(),
  FLOMO_SYNC_ENDPOINT: z.string().optional(),
  FLOMO_WRITE_ENDPOINT: z.string().optional(),
  FLOMO_DEVICE_ID: z.string().optional(),
  FLOMO_DEVICE_MODEL: z.string().optional(),
  FLOMO_WEB_PLATFORM: z.string().optional(),
  FLOMO_REQUEST_TIMEOUT_MS: z.string().optional()
});

const UrlSchema = z.string().url();

export function loadDotenvFile(): void {
  loadDotenv();
}

export function loadEnvConfig(env: NodeJS.ProcessEnv = process.env): PartialRuntimeConfig {
  const parsed = EnvSchema.parse(env);

  return {
    authorization: emptyToUndefined(parsed.FLOMO_AUTHORIZATION),
    cookie: emptyToUndefined(parsed.FLOMO_COOKIE),
    userAgent: emptyToUndefined(parsed.FLOMO_USER_AGENT),
    baseUrl: parseOptionalUrl(parsed.FLOMO_BASE_URL),
    webBaseUrl: parseOptionalUrl(parsed.FLOMO_WEB_BASE_URL),
    timezone: emptyToUndefined(parsed.FLOMO_TIMEZONE),
    logLevel: parseLogLevel(parsed.LOG_LEVEL),
    readEndpoint: emptyToUndefined(parsed.FLOMO_READ_ENDPOINT),
    syncEndpoint: emptyToUndefined(parsed.FLOMO_SYNC_ENDPOINT),
    writeEndpoint: emptyToUndefined(parsed.FLOMO_WRITE_ENDPOINT),
    deviceId: emptyToUndefined(parsed.FLOMO_DEVICE_ID),
    deviceModel: emptyToUndefined(parsed.FLOMO_DEVICE_MODEL),
    webPlatform: emptyToUndefined(parsed.FLOMO_WEB_PLATFORM),
    requestTimeoutMs: parsePositiveInteger(parsed.FLOMO_REQUEST_TIMEOUT_MS, "FLOMO_REQUEST_TIMEOUT_MS")
  };
}

export function defaultRuntimeConfig(): RuntimeConfig {
  return {
    userAgent: "Mozilla/5.0",
    baseUrl: "https://flomoapp.com",
    webBaseUrl: "https://v.flomoapp.com",
    timezone: "Asia/Shanghai",
    logLevel: "info",
    deviceId: randomUUID(),
    deviceModel: "Other",
    webPlatform: "Web",
    requestTimeoutMs: 30_000
  };
}

function parseLogLevel(value: string | undefined): LogLevel | undefined {
  const trimmed = emptyToUndefined(value);
  if (trimmed === "debug" || trimmed === "info" || trimmed === "warn" || trimmed === "error") {
    return trimmed;
  }

  return undefined;
}

function parsePositiveInteger(value: string | undefined, name: string): number | undefined {
  const trimmed = emptyToUndefined(value);
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} 必须是正整数毫秒数。`);
  }

  return parsed;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseOptionalUrl(value: string | undefined): string | undefined {
  const trimmed = emptyToUndefined(value);
  return trimmed ? UrlSchema.parse(trimmed).replace(/\/+$/, "") : undefined;
}
