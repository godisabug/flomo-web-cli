import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

export function getUserConfigPath(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") {
    const base = env.APPDATA ?? join(env.USERPROFILE ?? process.cwd(), "AppData", "Roaming");
    return join(base, "flomo-web-cli", "config.json");
  }

  if (platform === "darwin") {
    const home = env.HOME ?? process.cwd();
    return join(home, "Library", "Application Support", "flomo-web-cli", "config.json");
  }

  const base = env.XDG_CONFIG_HOME ?? join(env.HOME ?? process.cwd(), ".config");
  return join(base, "flomo-web-cli", "config.json");
}

export function getNoteCachePath(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  if (platform === "win32") {
    const base = env.LOCALAPPDATA ?? join(env.USERPROFILE ?? process.cwd(), "AppData", "Local");
    return join(base, "flomo-web-cli", "cache", "notes.json");
  }

  if (platform === "darwin") {
    const home = env.HOME ?? process.cwd();
    return join(home, "Library", "Caches", "flomo-web-cli", "notes.json");
  }

  const base = env.XDG_CACHE_HOME ?? join(env.HOME ?? process.cwd(), ".cache");
  return join(base, "flomo-web-cli", "notes.json");
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}
