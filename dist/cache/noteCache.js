import { chmod, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { CliError } from "../core/errors.js";
import { ensureParentDirectory } from "../utils/filesystem.js";
export const NOTE_CACHE_VERSION = 1;
const MemoSchema = z
    .object({
    slug: z.string(),
    content: z.string(),
    html: z.string().optional(),
    tags: z.array(z.string()),
    url: z.string().url(),
    createdAt: z.string(),
    updatedAt: z.string()
})
    .strict();
const MemoPageCursorSchema = z
    .object({
    latestUpdatedAt: z.number(),
    latestSlug: z.string()
})
    .strict();
const NoteCacheSchema = z
    .object({
    version: z.literal(NOTE_CACHE_VERSION),
    syncedAt: z.string(),
    complete: z.boolean(),
    nextCursor: MemoPageCursorSchema.optional(),
    items: z.array(MemoSchema)
})
    .strict();
export async function readNoteCache(filePath) {
    let text;
    try {
        text = await readFile(filePath, "utf8");
    }
    catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
            throw new CliError("CACHE_MISSING", "未找到全量缓存。请先运行 flomo-web sync。", { cause: error });
        }
        throw error;
    }
    let json;
    try {
        json = JSON.parse(text);
    }
    catch (error) {
        throw new CliError("CACHE_INVALID", "缓存文件无效。请重新运行 flomo-web sync。", { cause: error });
    }
    if (isRecord(json) && typeof json.version === "number" && json.version !== NOTE_CACHE_VERSION) {
        throw new CliError("CACHE_INVALID", `不支持的缓存版本：${json.version}。请重新运行 flomo-web sync。`);
    }
    try {
        return NoteCacheSchema.parse(json);
    }
    catch (error) {
        throw new CliError("CACHE_INVALID", "缓存文件无效。请重新运行 flomo-web sync。", { cause: error });
    }
}
export async function writeNoteCache(filePath, input) {
    await ensureParentDirectory(filePath);
    const cache = NoteCacheSchema.parse({
        version: NOTE_CACHE_VERSION,
        ...input
    });
    const tempFilePath = getTempCachePath(filePath);
    try {
        await writeFile(tempFilePath, `${JSON.stringify(cache, null, 2)}\n`, { mode: 0o600 });
        await hardenFileMode(tempFilePath);
        await rename(tempFilePath, filePath);
        await hardenFileMode(filePath);
    }
    catch (error) {
        await removeTempFile(tempFilePath);
        throw error;
    }
    return cache;
}
function getTempCachePath(filePath) {
    return join(dirname(filePath), `.${basename(filePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNodeError(error) {
    return error instanceof Error && "code" in error;
}
async function hardenFileMode(filePath) {
    try {
        await chmod(filePath, 0o600);
    }
    catch (error) {
        if (isIgnorableChmodError(error)) {
            return;
        }
        throw error;
    }
}
function isIgnorableChmodError(error) {
    return isNodeError(error) && (process.platform === "win32" || error.code === "ENOSYS" || error.code === "ENOTSUP" || error.code === "EOPNOTSUPP");
}
async function removeTempFile(filePath) {
    try {
        await rm(filePath, { force: true });
    }
    catch {
        return;
    }
}
