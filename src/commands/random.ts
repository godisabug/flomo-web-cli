import { readNoteCache, writeNoteCache, type NoteCache } from "../cache/noteCache.js";
import { toPublicError } from "../core/errors.js";
import { selectRandomMemo, type RandomMemoFilters, type RandomSource } from "../core/randomMemo.js";
import { formatJson } from "../formatters/json.js";
import { formatMemoDetail } from "../formatters/human.js";
import type { CommandContext, CommandResult } from "./types.js";

export interface RandomCommandOptions extends RandomMemoFilters {
  json?: boolean;
  noSync?: boolean;
  rng?: RandomSource;
}

interface RefreshAttemptedSuccess {
  attempted: true;
  ok: true;
  fallback: null;
}

interface RefreshAttemptedFallback {
  attempted: true;
  ok: false;
  fallback: "cache";
  error: ReturnType<typeof toPublicError>;
}

interface RefreshSkipped {
  attempted: false;
}

type RefreshMetadata = RefreshAttemptedSuccess | RefreshAttemptedFallback | RefreshSkipped;

interface RandomMemoSource {
  cache: NoteCache;
  refresh: RefreshMetadata;
  stderr: string;
}

export async function runRandomCommand(context: CommandContext, options: RandomCommandOptions): Promise<CommandResult> {
  const source = await loadRandomMemoSource(context, options.noSync === true);
  const selection = selectRandomMemo(
    source.cache.items,
    {
      tags: options.tags,
      excludeTags: options.excludeTags
    },
    options.rng ?? Math.random
  );
  const scope = {
    source: "all_synced_notes",
    complete: source.cache.complete,
    syncedAt: source.cache.syncedAt,
    description: "Random memo selected from synced local memo cache."
  };

  if (options.json) {
    return {
      stdout: formatJson({
        ok: true,
        memo: selection.memo,
        filters: selection.filters,
        candidateCount: selection.candidateCount,
        refresh: source.refresh,
        scope
      }),
      stderr: "",
      exitCode: 0
    };
  }

  return {
    stdout: selection.memo ? formatMemoDetail(selection.memo, context.timezone) : "No matching memos found.",
    stderr: source.stderr,
    exitCode: 0
  };
}

async function loadRandomMemoSource(context: CommandContext, noSync: boolean): Promise<RandomMemoSource> {
  if (noSync) {
    return {
      cache: await readNoteCache(context.cachePath),
      refresh: {
        attempted: false
      },
      stderr: ""
    };
  }

  let syncResult: Awaited<ReturnType<CommandContext["readClient"]["syncAll"]>>;
  try {
    syncResult = await context.readClient.syncAll();
  } catch (error) {
    const refreshError = toSafePublicError(error);
    try {
      const cache = await readNoteCache(context.cachePath);
      return {
        cache,
        refresh: {
          attempted: true,
          ok: false,
          fallback: "cache",
          error: refreshError
        },
        stderr: formatFallbackWarning(refreshError, cache)
      };
    } catch {
      throw error;
    }
  }

  const cache = await writeNoteCache(context.cachePath, {
    syncedAt: syncResult.syncedAt,
    complete: syncResult.complete,
    ...(syncResult.nextCursor ? { nextCursor: syncResult.nextCursor } : {}),
    items: syncResult.items
  });

  return {
    cache,
    refresh: {
      attempted: true,
      ok: true,
      fallback: null
    },
    stderr: ""
  };
}

function toSafePublicError(error: unknown): ReturnType<typeof toPublicError> {
  const publicError = toPublicError(error);
  if (publicError.code === "UNKNOWN") {
    return {
      code: "UNKNOWN",
      message: "未知错误。"
    };
  }

  return publicError;
}

function formatFallbackWarning(error: ReturnType<typeof toPublicError>, cache: NoteCache): string {
  return `Warning: sync failed (${error.code}: ${error.message}); using cached memos from ${cache.syncedAt}.`;
}
