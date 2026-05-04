import { CliError } from "../core/errors.js";
import { defaultRuntimeConfig, type PartialRuntimeConfig, type RuntimeConfig } from "./env.js";

export interface ConfigSources {
  cli?: PartialRuntimeConfig;
  env?: PartialRuntimeConfig;
  user?: PartialRuntimeConfig;
}

export function resolveConfig(sources: ConfigSources): RuntimeConfig {
  const resolved: RuntimeConfig = {
    ...defaultRuntimeConfig(),
    ...definedOnly(sources.user),
    ...definedOnly(sources.env),
    ...definedOnly(sources.cli)
  };

  validateTimezone(resolved.timezone);
  return resolved;
}

export function requireAuthorization(config: RuntimeConfig): string {
  const authorization = config.authorization?.trim();
  if (!authorization) {
    throw new CliError("CONFIG_INVALID", "缺少 flomo Authorization。请设置 FLOMO_AUTHORIZATION 或运行 flomo-web config set authorization <value>。");
  }

  return authorization;
}

function definedOnly<T extends Record<string, unknown>>(value: T | undefined): Partial<T> {
  if (!value) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== "")) as Partial<T>;
}

function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch (error) {
    throw new CliError("CONFIG_INVALID", `timezone 不是有效的 IANA timezone：${timezone}`, { cause: error });
  }
}
