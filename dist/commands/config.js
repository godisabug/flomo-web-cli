import { CliError } from "../core/errors.js";
import { isUserConfigKey, maskConfigValue, readUserConfig, userConfigSchema, writeUserConfig } from "../config/userConfig.js";
import { formatMaskedConfigEntries } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import { ok } from "./types.js";
export async function runConfigCommand(context, options) {
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
        await writeValidatedUserConfig(context.configPath, nextConfig);
        return ok(options.json ? formatJson({ ok: true, key }) : `Unset ${key}.`);
    }
    const value = parseConfigValue(key, options.value);
    await writeValidatedUserConfig(context.configPath, {
        ...config,
        [key]: value
    });
    return ok(options.json ? formatJson({ ok: true, key }) : `Set ${key}.`);
}
function toMaskedEntries(config) {
    return Object.entries(config).map(([key, value]) => ({ key, maskedValue: maskConfigValue(key, value) }));
}
function requireConfigKey(key) {
    if (!key || !isUserConfigKey(key)) {
        throw new CliError("CONFIG_INVALID", `Unsupported config key: ${key ?? ""}`);
    }
    return key;
}
function parseConfigValue(key, value) {
    if (key !== "requestTimeoutMs") {
        return value;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new CliError("CONFIG_INVALID", "requestTimeoutMs must be a positive integer.");
    }
    return parsed;
}
async function writeValidatedUserConfig(filePath, config) {
    try {
        userConfigSchema.parse(config);
    }
    catch (error) {
        throw new CliError("CONFIG_INVALID", "用户配置值无效，请检查配置键和值。", { cause: error });
    }
    await writeUserConfig(filePath, config);
}
