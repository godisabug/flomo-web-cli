import type { Memo } from "../models/memo.js";

export type NotesScopeSource = "recent_notes" | "all_synced_notes";

export interface MemoPageCursor {
  latestUpdatedAt: number;
  latestSlug: string;
}

export interface SyncNotesOptions {
  pageSize?: number;
  maxPages?: number;
}

export interface SyncNotesResult {
  synced: number;
  totalCached: number;
  pages: number;
  complete: boolean;
  syncedAt: string;
  nextCursor?: MemoPageCursor;
  items: Memo[];
}

export interface SyncNotesStatus {
  synced: boolean;
  totalCached: number;
  complete: boolean;
  syncedAt?: string;
  nextCursor?: MemoPageCursor;
}

export interface FlomoReadClient {
  list(limit?: number): Promise<Memo[]>;
  search(query: string, limit?: number): Promise<Memo[]>;
  getBySlug(slug: string): Promise<Memo | null>;
  getRecentBatch(cursor?: string): Promise<Memo[]>;
  syncAll(options?: SyncNotesOptions): Promise<SyncNotesResult>;
}

export interface FlomoWriteClient {
  create(input: { content: string; tags?: string[] }): Promise<Memo>;
}

export type RawFlomoMemo = Record<string, unknown>;
