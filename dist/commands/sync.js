import { writeNoteCache } from "../cache/noteCache.js";
import { formatSyncResult } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import { ok } from "./types.js";
export async function runSyncCommand(context, options) {
    const result = await context.readClient.syncAll({
        pageSize: options.pageSize,
        maxPages: options.maxPages
    });
    await writeNoteCache(context.cachePath, {
        syncedAt: result.syncedAt,
        complete: result.complete,
        ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
        items: result.items
    });
    if (options.json) {
        return ok(formatJson({
            ok: true,
            stats: {
                synced: result.synced,
                totalCached: result.totalCached,
                pages: result.pages,
                complete: result.complete,
                syncedAt: result.syncedAt,
                nextCursor: result.nextCursor
            },
            scope: {
                source: "all_synced_notes",
                complete: result.complete,
                syncedAt: result.syncedAt,
                description: "Synced memos are available from the local cache."
            }
        }));
    }
    return ok(formatSyncResult(result));
}
