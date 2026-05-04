import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import { z } from "zod";
import { CliError } from "../core/errors.js";
import { ensureParentDirectory } from "../utils/filesystem.js";
import type { PartialRuntimeConfig } from "./env.js";

export const userConfigKeys = [
  "authorization",
  "cookie",
  "userAgent",
  "baseUrl",
  "webBaseUrl",
  "timezone",
  "logLevel",
  "readEndpoint",
  "syncEndpoint",
  "writeEndpoint",
  "deviceId",
  "deviceModel",
  "webPlatform",
  "requestTimeoutMs"
] as const;

export type UserConfigKey = (typeof userConfigKeys)[number];
export type UserConfig = Partial<Pick<PartialRuntimeConfig, UserConfigKey>>;

export const userConfigSchema = z.object({
  authorization: z.string().optional(),
  cookie: z.string().optional(),
  userAgent: z.string().optional(),
  baseUrl: z.string().url().optional(),
  webBaseUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  logLevel: z.enum(["debug", "info", "warn", "error"]).optional(),
  readEndpoint: z.string().optional(),
  syncEndpoint: z.string().optional(),
  writeEndpoint: z.string().optional(),
  deviceId: z.string().optional(),
  deviceModel: z.string().optional(),
  webPlatform: z.string().optional(),
  requestTimeoutMs: z.number().int().positive().optional()
}).strict();

export function isUserConfigKey(key: string): key is UserConfigKey {
  return (userConfigKeys as readonly string[]).includes(key);
}

export async function readUserConfig(filePath: string): Promise<UserConfig> {
  let text: string;
  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }

  try {
    return userConfigSchema.parse(JSON.parse(text));
  } catch (error) {
    throw new CliError("CONFIG_INVALID", `用户配置文件无效：${filePath}`, { cause: error });
  }
}

export async function writeUserConfig(filePath: string, config: UserConfig): Promise<void> {
  await ensureParentDirectory(filePath);
  const parsed = userConfigSchema.parse(config);
  await writeFile(filePath, `${JSON.stringify(parsed, null, 2)}\n`, { mode: 0o600 });
  await hardenFileMode(filePath);
}

export async function unsetUserConfigFile(filePath: string): Promise<void> {
  await rm(filePath, { force: true });
}

export function maskConfigValue(key: string, value: unknown): string {
  if (value === undefined) {
    return "";
  }

  const text = String(value);
  if (key !== "authorization" && key !== "cookie") {
    return text;
  }

  if (text.length <= 12) {
    return "********";
  }

  return `${text.slice(0, 11)}...${text.slice(-4)}`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function hardenFileMode(filePath: string): Promise<void> {
  try {
    await chmod(filePath, 0o600);
  } catch (error) {
    if (isIgnorableChmodError(error)) {
      return;
    }

    throw error;
  }
}

function isIgnorableChmodError(error: unknown): boolean {
  return isNodeError(error) && (process.platform === "win32" || error.code === "ENOSYS" || error.code === "ENOTSUP" || error.code === "EOPNOTSUPP");
}
