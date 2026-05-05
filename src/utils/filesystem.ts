import { mkdir } from "node:fs/promises";
import { dirname, join, posix, win32 } from "node:path";

export function getUserConfigPath(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  const path = platformPath(platform);

  if (platform === "win32") {
    const base = envValue(env.APPDATA) ?? path.join(envValue(env.USERPROFILE) ?? process.cwd(), "AppData", "Roaming");
    return path.join(base, "flomo-web-cli", "config.json");
  }

  if (platform === "darwin") {
    const home = envValue(env.HOME) ?? process.cwd();
    return path.join(home, "Library", "Application Support", "flomo-web-cli", "config.json");
  }

  const base = envValue(env.XDG_CONFIG_HOME) ?? path.join(envValue(env.HOME) ?? process.cwd(), ".config");
  return path.join(base, "flomo-web-cli", "config.json");
}

export function getNoteCachePath(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  const path = platformPath(platform);

  if (platform === "win32") {
    const base = envValue(env.LOCALAPPDATA) ?? path.join(envValue(env.USERPROFILE) ?? process.cwd(), "AppData", "Local");
    return path.join(base, "flomo-web-cli", "cache", "notes.json");
  }

  if (platform === "darwin") {
    const home = envValue(env.HOME) ?? process.cwd();
    return path.join(home, "Library", "Caches", "flomo-web-cli", "notes.json");
  }

  const base = envValue(env.XDG_CACHE_HOME) ?? path.join(envValue(env.HOME) ?? process.cwd(), ".cache");
  return path.join(base, "flomo-web-cli", "notes.json");
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

function envValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function platformPath(platform: NodeJS.Platform): typeof posix {
  return platform === "win32" ? win32 : posix;
}
