import { CliError } from "../core/errors.js";
import { isUserConfigKey, maskConfigValue, readUserConfig, writeUserConfig, type UserConfig } from "../config/userConfig.js";
import { formatMaskedConfigEntries } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export type ConfigCommandOptions =
  | { action: "set"; key: string; value: string; json?: boolean }
  | { action: "get"; key: string; json?: boolean }
  | { action: "unset"; key: string; json?: boolean }
  | { action: "list"; json?: boolean };

export async function runConfigCommand(context: CommandContext, options: ConfigCommandOptions): Promise<CommandResult> {
  const config = await readUserConfig(context.configPath);

  if (options.action === "list") {
    const items = toMaskedEntries(config);
    return ok(options.json ? formatJson({ ok: true, items }) : formatMaskedConfigEntries(items));
  }

  const key = requireConfigKey(options.key);

  if (options.action === "get") {
    const maskedValue = maskConfigValue(key, config[key]);
    return ok(options.json ? formatJson({ ok: true, key, value: maskedValue }) : `${key}=${maskedValue}`);
  }

  if (options.action === "unset") {
    const nextConfig = { ...config };
    delete nextConfig[key];
    await writeUserConfig(context.configPath, nextConfig);
    return ok(options.json ? formatJson({ ok: true, key }) : `Unset ${key}.`);
  }

  const value = parseConfigValue(key, options.value);
  await writeUserConfig(context.configPath, {
    ...config,
    [key]: value
  });
  return ok(options.json ? formatJson({ ok: true, key }) : `Set ${key}.`);
}

function toMaskedEntries(config: UserConfig): Array<{ key: string; maskedValue: string }> {
  return Object.entries(config).map(([key, value]) => ({ key, maskedValue: maskConfigValue(key, value) }));
}

function requireConfigKey(key: string): keyof UserConfig {
  if (!key || !isUserConfigKey(key)) {
    throw new CliError("CONFIG_INVALID", `Unsupported config key: ${key ?? ""}`);
  }

  return key;
}

function parseConfigValue(key: keyof UserConfig, value: string): UserConfig[keyof UserConfig] {
  if (key !== "requestTimeoutMs") {
    return value;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CliError("CONFIG_INVALID", "requestTimeoutMs must be a positive integer.");
  }

  return parsed;
}
