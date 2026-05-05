import { readNoteCache } from "../cache/noteCache.js";
import { filterMemos } from "../core/clients/flomoReadClient.js";
import { formatMemoList } from "../formatters/human.js";
import { formatJson } from "../formatters/json.js";
import type { CommandContext, CommandResult } from "./types.js";
import { ok } from "./types.js";

export type SearchScope = "recent" | "all";

export interface SearchCommandOptions {
  json?: boolean;
  query: string;
  limit?: number;
  scope?: SearchScope;
}

export async function runSearchCommand(context: CommandContext, options: SearchCommandOptions): Promise<CommandResult> {
  if (options.scope === "all") {
    const cache = await readNoteCache(context.cachePath);
    const items = filterMemos(cache.items, options.query, options.limit);
    const scope = {
      source: "all_synced_notes",
      complete: cache.complete,
      syncedAt: cache.syncedAt,
      description: "Results are searched from the local synced memo cache."
    };

    return ok(options.json ? formatJson({ ok: true, items, scope }) : formatMemoList(items, context.timezone));
  }

  const items = await context.readClient.search(options.query, options.limit);
  const scope = {
    source: "recent_notes",
    complete: false,
    description: "Results are limited to the recent memo batch returned by flomo Web."
  };

  return ok(options.json ? formatJson({ ok: true, items, scope }) : formatMemoList(items, context.timezone));
}
