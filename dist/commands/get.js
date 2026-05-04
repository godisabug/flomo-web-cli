import { readNoteCache } from "../cache/noteCache.js";
import { formatMemoDetail } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import { ok } from "./types.js";
export async function runGetCommand(context, options) {
    if (options.scope === "all") {
        const cache = await readNoteCache(context.cachePath);
        const memo = cache.items.find((item) => item.slug === options.slug) ?? null;
        const scope = {
            source: "all_synced_notes",
            complete: cache.complete,
            syncedAt: cache.syncedAt,
            description: "Memo lookup used the local synced memo cache."
        };
        return ok(options.json ? formatJson({ ok: true, memo, scope }) : formatMemoDetail(memo));
    }
    const memo = await context.readClient.getBySlug(options.slug);
    const scope = {
        source: "recent_notes",
        complete: false,
        description: "Memo lookup is limited to the recent memo batch returned by flomo Web."
    };
    return ok(options.json ? formatJson({ ok: true, memo, scope }) : formatMemoDetail(memo));
}
